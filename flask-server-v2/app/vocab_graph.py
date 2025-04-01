from neo4j import AsyncGraphDatabase
from core.credentials import neo4j_uri, neo4j_username, neo4j_pwd
from core.vocab_types import Word

class VocabularyGraph:
    def __init__(self):
        self._driver = AsyncGraphDatabase.driver(neo4j_uri, auth=(neo4j_username, neo4j_pwd))

    async def close(self):
        await self._driver.close()

    async def add_word(self, word_data: Word):
        props = ", ".join(f"{k}: ${k}" for k in word_data.keys())  # Convert dict keys to Cypher props
        query = f"MERGE (w:Word {{ {props} }})"
        async with self._driver.session() as session:
            await session.run(query, **word_data)

    def add_relationship(self, word1: str, word2: str, relation: str):
        # Todo
        return

    def find_related_words(self, word: str):
        # Todo
        return
