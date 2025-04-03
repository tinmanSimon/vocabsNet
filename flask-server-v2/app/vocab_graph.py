from neo4j import AsyncGraphDatabase
from core.credentials import neo4j_uri, neo4j_username, neo4j_pwd
from core.vocab_types import Word, SemanticUnit, MAX_NAME_LENGTH
from app.vocab_logger import logger

class VocabularyGraph:
    def __init__(self, neo4j_driver: AsyncGraphDatabase):
        self._driver = neo4j_driver

    async def close(self):
        await self._driver.close()

    async def add_word(self, word_data: Word):
        props = ", ".join(f"{k}: ${k}" for k in word_data.keys())  # Convert dict keys to Cypher props
        query = f"MERGE (w:Word {{ {props} }})"
        async with self._driver.session() as session:
            await session.run(query, **word_data)

    def _validate_semantic(self, semantic_unit):
        if not semantic_unit.name.strip() or not semantic_unit.username.strip():
            raise ValueError(f"Invalid Semantic: '{semantic_unit.name}'")
        if len(semantic_unit.name) > MAX_NAME_LENGTH:
            raise ValueError(f"Semantic name exceeds max length ({MAX_NAME_LENGTH}): '{semantic_unit.name}'")
    def _validate_semantics(self, semantic_units):
        unique_semantics = {(s.name, s.username): s for s in semantic_units}.values()
        if len(unique_semantics) != len(semantic_units):
            raise ValueError(f"Semantic units have duplicate values")
        for semantic in semantic_units:
            self._validate_semantic(semantic)

    async def add_semantic_units(self, semantic_units: list[SemanticUnit]):
        if not semantic_units: 
            return
        
        self._validate_semantics(semantic_units)
        semantic_dicts = [semantic_unit.model_dump() for semantic_unit in semantic_units]

        query = """
        UNWIND $semantic_units AS semantic
        // First ensure the user exists
        MATCH (u:User {username: semantic.username})
        WITH u, semantic

        // Create the semantic unit if it doesn't exist
        MERGE (final_su:SemanticUnit {name: semantic.name, username: semantic.username})
        ON CREATE SET final_su += semantic

        // Check if the word exists
        MERGE (w:Word {name: semantic.name})

        // Create all relationships
        MERGE (u)-[:_Has_Semantic]->(final_su)
        MERGE (final_su)-[:_Owned_By]->(u)
        MERGE (final_su)-[:_Belongs_To]->(w)
        MERGE (w)-[:_Referred_By]->(final_su)

        WITH COUNT(DISTINCT final_su) AS created_semantics, 
            COUNT(DISTINCT w) AS referenced_words
        RETURN created_semantics, referenced_words
        """

        async with self._driver.session() as session:
            try:
                result = await session.run(query, semantic_units=semantic_dicts)
                summary = await result.single()
                return {
                    "created_semantics": summary["created_semantics"],
                    "referenced_words": summary["referenced_words"]
                }
            except Exception as e:
                logger.error(f"Database error in add_semantic_units: {str(e)}", exc_info=True)
                raise ValueError("Internal Server Error: Failed to insert semantic units.")
    
    async def remove_semantic_units(self, semantic_units: list[SemanticUnit]):
        logger.info(f"semantic_units: {semantic_units}")
        if not semantic_units: 
            return
        
        self._validate_semantics(semantic_units)
        semantic_dicts = [semantic_unit.model_dump() for semantic_unit in semantic_units]
    
        async with self._driver.session() as session:
            try:
                query = """
                WITH $semantic_units AS semantics_to_delete, SIZE($semantic_units) AS requested_count

                UNWIND semantics_to_delete AS semantic
                MATCH (su:SemanticUnit {name: semantic.name, username: semantic.username})

                WITH COLLECT(su) AS found_semantics, requested_count
                WHERE SIZE(found_semantics) = requested_count

                WITH SIZE(found_semantics) AS deleted_semantics, found_semantics

                FOREACH (su IN found_semantics | DETACH DELETE su)

                RETURN deleted_semantics 
                """
                
                result = await session.run(query, semantic_units=semantic_dicts)
                summary = await result.single()
                
                # If we get a result, the deletion was successful
                if summary:
                    return {
                        "deleted_semantics": summary["deleted_semantics"]
                    }
                else:
                    # If no result, it means the WHERE clause wasn't satisfied
                    raise ValueError("Some semantic units do not exist in the database.")
                    
            except Exception as e:
                if isinstance(e, ValueError):
                    raise e
                logger.error(f"Database error in remove_semantic_units: {str(e)}", exc_info=True)
                raise ValueError("Internal Server Error: Failed to remove semantic units.")


    async def get_data(self, username: str):
        query = """
        MATCH (u:User { username: $username })-[:_Has_Semantic]->(su:SemanticUnit)
        RETURN su
        """
        async with self._driver.session() as session:
            try:
                result = await session.run(query, username=username)
                semantic_units = []
                async for record in result:
                    # Collect all the fields from the SemanticUnit node
                    semantic_unit_data = dict(record["su"].items())
                    semantic_units.append(semantic_unit_data)
                return semantic_units
            except Exception as e:
                logger.error(f"Database error in get_data for user '{username}': {str(e)}", exc_info=True)
                raise ValueError("Failed to retrieve data for the specified username.")


    def add_relationship(self, word1: str, word2: str, relation: str):
        # Todo
        return

    def find_related_words(self, word: str):
        # Todo
        return
