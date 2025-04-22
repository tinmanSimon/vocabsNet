# from neo4j import AsyncGraphDatabase
# from neo4j.exceptions import TransientError
# from core.vocab_types import (
#     Word, Edge, MAX_NAME_LENGTH, 
#     UserInfo, NEO4J_MAX_RETRIES, NEO4J_RETRY_DELAY 
# )
# from app.vocab_logger import logger
# from motor.motor_asyncio import AsyncIOMotorClient
# from app.user_lock import UserLockManager
# import asyncio
# import random

# class VocabularyGraph:
#     def __init__(self, cache_manager, db_client: AsyncIOMotorClient):
#         self._cache = cache_manager
#         self._db = db_client
#         self._lock_manager = UserLockManager()

#     async def close(self):
#         await self._driver.close()

#     async def add_word(self, word_data: Word):
#         props = ", ".join(f"{k}: ${k}" for k in word_data.keys())  # Convert dict keys to Cypher props
#         query = f"MERGE (w:Word {{ {props} }})"
#         async with self._driver.session() as session:
#             await session.run(query, **word_data)

    # def _validate_semantic(self, semantic_unit, user: UserInfo):
    #     if not semantic_unit.name.strip() or not semantic_unit.username.strip():
    #         raise ValueError(f"Invalid Semantic: '{semantic_unit.name}'")
    #     if len(semantic_unit.name) > MAX_NAME_LENGTH:
    #         raise ValueError(f"Semantic name exceeds max length ({MAX_NAME_LENGTH}): '{semantic_unit.name}'")
    #     if user.username != semantic_unit.username:
    #         raise ValueError(f"Semantic username does't match request username: {user.username}") 
    
    # def _validate_semantics(self, semantic_units:list[SemanticUnit], user: UserInfo):
    #     unique_semantics = {(s.name, s.username): s for s in semantic_units}.values()
    #     if len(unique_semantics) != len(semantic_units):
    #         raise ValueError(f"Semantic units have duplicate values")
    #     for semantic in semantic_units:
    #         self._validate_semantic(semantic, user)

#     def _validate_edge(self, edge, user: UserInfo):
#         if not edge.edge_name.strip() or not edge.username.strip():
#             raise ValueError(f"Invalid edge: '{edge.edge_name}'")
#         if not edge.from_name.strip() or not edge.to_name.strip():
#             raise ValueError(f"Invalid edge from_name or to_name")
#         if edge.from_name.strip() == edge.to_name.strip():
#             raise ValueError(f"Invalid edge with the same from_name and to_name")
#         if len(edge.edge_name) > MAX_NAME_LENGTH:
#             raise ValueError(f"Edge name exceeds max length ({MAX_NAME_LENGTH}): '{edge.edge_name}'")
#         if user.username != edge.username:
#             raise ValueError(f"Edge's username does't match request username: {user.username}") 

#     def _validate_edges(self, edges: list[Edge], user: UserInfo):
#         unique_edges = {(e.edge_name, e.from_name, e.to_name): e for e in edges}.values()
#         if len(unique_edges) != len(edges):
#             raise ValueError(f"Edges have duplicate values")
#         for edge in edges:
#             self._validate_edge(edge, user)

#     async def _execute_with_retry(self, operation_name, query_func, *args):
#         """Generic retry mechanism for database operations with deadlock detection"""
#         for attempt in range(NEO4J_MAX_RETRIES):
#             try:
#                 return await query_func(*args)
#             except TransientError as e:
#                 if "DeadlockDetected" not in str(e) or attempt == NEO4J_MAX_RETRIES - 1:
#                     raise
#                 # Add a small random delay before retrying
#                 await asyncio.sleep(NEO4J_RETRY_DELAY * random.random())
#             except ValueError as e:
#                 raise e
#             except Exception as e:
#                 logger.error(f"Database error in {operation_name}: {str(e)}", exc_info=True)
#                 raise ValueError(f"Internal Server Error: Failed to {operation_name}.")

#     async def _execute_semantic_units_query(self, semantic_dicts):
#         """Execute the semantic unit creation query"""
#         query = """
#         UNWIND $semantic_units AS semantic
#         MATCH (u:User {username: semantic.username})
#         WITH u, semantic

#         // Create the semantic unit if it doesn't exist
#         MERGE (final_su:SemanticUnit {name: semantic.name, username: semantic.username})
#         ON CREATE SET final_su += semantic, final_su.created_at = datetime(), 
#             final_su.timestamp = timestamp()

#         // Check if the word exists
#         MERGE (w:Word {name: semantic.name})

#         // Create all relationships
#         MERGE (u)-[:_Has_Semantic]->(final_su)
#         MERGE (final_su)-[:_Owned_By]->(u)
#         MERGE (final_su)-[:_Belongs_To]->(w)
#         MERGE (w)-[:_Referred_By]->(final_su)

#         WITH COUNT(DISTINCT final_su) AS created_semantics, 
#             COUNT(DISTINCT w) AS referenced_words
#         RETURN created_semantics, referenced_words
#         """

#         async with self._driver.session() as session:
#             result = await session.run(query, semantic_units=semantic_dicts)
#             summary = await result.single()
#             if not summary:
#                 raise ValueError("Failed to create semantic units.")
#             return {
#                 "created_semantics": summary["created_semantics"],
#                 "referenced_words": summary["referenced_words"]
#             }

#     async def _execute_edge_query(self, edge_dicts):
#         """Execute the edge creation query"""
#         query = """
#         UNWIND $edges AS edge
#         MATCH (from:SemanticUnit {name: edge.from_name, username: edge.username})
#         MATCH (to:SemanticUnit {name: edge.to_name, username: edge.username})

#         MERGE (from)-[r:SEMANTIC_CONNECT {
#             edge_name: edge.edge_name,
#             username: edge.username,
#             created_at: datetime(),
#             timestamp: timestamp()
#         }]->(to)

#         WITH edge, from, to

#         FOREACH (_ IN CASE WHEN edge.double_edge THEN [1] ELSE [] END |
#             MERGE (to)-[:SEMANTIC_CONNECT {
#                 edge_name: edge.edge_name,
#                 username: edge.username
#             }]->(from)
#         )

#         RETURN count(*) AS total_edges_created
#         """

#         async with self._driver.session() as session:
#             result = await session.run(query, edges=edge_dicts)
#             summary = await result.single()
#             if not summary:
#                 raise ValueError("Some edges do not exist in the database.")
#             return {"total_edges_created": summary["total_edges_created"]}

#     async def _execute_semantic_removal(self, semantic_dicts):
#         """Execute the semantic unit removal query"""
#         query = """
#         WITH $semantic_units AS semantics_to_delete, SIZE($semantic_units) AS requested_count
#         UNWIND semantics_to_delete AS semantic
#         MATCH (su:SemanticUnit {name: semantic.name, username: semantic.username})
#         WITH COLLECT(su) AS found_semantics, requested_count
#         WHERE SIZE(found_semantics) = requested_count
#         WITH SIZE(found_semantics) AS deleted_semantics, found_semantics
#         FOREACH (su IN found_semantics | DETACH DELETE su)
#         RETURN deleted_semantics
#         """
        
#         async with self._driver.session() as session:
#             result = await session.run(query, semantic_units=semantic_dicts)
#             summary = await result.single()
#             if not summary:
#                 raise ValueError("Some semantic units do not exist in the database.")
                
#             return {"deleted_semantics": summary["deleted_semantics"]}

#     async def add_semantic_units(self, semantic_units: list[SemanticUnit], user: UserInfo):
#         if not semantic_units:
#             return {}
            
#         self._validate_semantics(semantic_units, user)
#         semantic_dicts = [semantic_unit.model_dump() for semantic_unit in semantic_units]
        
#         return await self._execute_with_retry(
#             "add semantic units", 
#             self._execute_semantic_units_query, 
#             semantic_dicts
#         )

#     async def add_edges(self, edges: list[Edge], user: UserInfo):
#         if not edges:
#             return {}
            
#         self._validate_edges(edges, user)
#         edge_dicts = [edge.model_dump() for edge in edges]
        
#         return await self._execute_with_retry(
#             "add edges", 
#             self._execute_edge_query, 
#             edge_dicts
#         )

#     async def remove_semantic_units(self, semantic_units: list[SemanticUnit], user: UserInfo):
#         if not semantic_units:
#             return {}
            
#         self._validate_semantics(semantic_units, user)
#         semantic_dicts = [semantic_unit.model_dump() for semantic_unit in semantic_units]
        
#         return await self._execute_with_retry(
#             "remove semantic units", 
#             self._execute_semantic_removal, 
#             semantic_dicts
#         )

#     async def get_data(self, user: UserInfo):
#         query = """
#         MATCH (u:User { username: $username })-[:_Has_Semantic]->(su:SemanticUnit)
#         RETURN su
#         """
#         async with self._driver.session() as session:
#             try:
#                 result = await session.run(query, username=user.username)
#                 semantic_units = []
#                 async for record in result:
#                     # Collect all the fields from the SemanticUnit node
#                     semantic_unit_data = dict(record["su"].items())
#                     semantic_units.append(semantic_unit_data)
#                 return semantic_units
#             except Exception as e:
#                 logger.error(f"Database error in get_data for user '{user.username}': {str(e)}", exc_info=True)
#                 raise ValueError("Failed to retrieve data for the specified username.")

#     def add_relationship(self, word1: str, word2: str, relation: str):
#         # Todo
#         return

#     def find_related_words(self, word: str):
#         # Todo
#         return