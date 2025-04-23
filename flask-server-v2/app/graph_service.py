from app.graph import Graph 
from app.graph_cache import GraphCacheManager
from app.vocab_logger import logger
from core.vocab_types import Word, Edge, UserInfo, MAX_NAME_LENGTH
from core.credentials import MONGO_URI, DB_NAME, DEBUG_DB_NAME, CLEAR_DATA_KEY, DEBUG_MODE
import motor.motor_asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from functools import wraps
from pymongo.errors import PyMongoError
from fastapi import HTTPException
from datetime import datetime, timezone, timedelta


class GraphService:
    async def _initialize_database(self):
        """Create necessary indexes for efficient queries."""
        await self._db.words.create_index("username")
        await self._db.edges.create_index("username")

    @classmethod
    async def create(cls):
        self = cls()
        await self._initialize_database()
        return self

    def __init__(self):
        self._cache_manager = GraphCacheManager()
        mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
        CHOSEN_DB = DEBUG_DB_NAME if DEBUG_MODE else DB_NAME
        database = mongo_client[CHOSEN_DB]
        self._db = database

    def handle_mongo_errors(func):
        @wraps(func)
        async def wrapper(self, *args, **kwargs): 
            try:
                return await func(self, *args, **kwargs)
            except PyMongoError as e:
                username = kwargs.get('username', "Unknown")
                error_message = f"MongoDB Error in {func.__name__} for user {username}: {e}"
                logger.error(error_message)
                raise Exception(error_message)
        return wrapper

    def handle_general_errors(func):
        @wraps(func)
        async def wrapper(self, *args, **kwargs): 
            try:
                return await func(self, *args, **kwargs)
            except ValueError as e:  
                logger.error(f"Value error in {func.__name__}, err_message: {str(e)}")
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                logger.error(f"Internal error in {func.__name__}, err_message: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        return wrapper

    @handle_mongo_errors
    async def _get_graph(self, username: str) -> Graph:
        graph = await self._cache_manager.get_graph(username)
        if graph is None:
            graph = await self._load_data_from_db(username)
            await self._cache_manager.set_graph(username, graph)
        return graph

    @handle_mongo_errors
    async def _save_words_to_db(self, username: str, words_data: list[Word]) -> bool:
        documents = []
        for word_data in words_data:
            document = {
                "username": username,
                "word_data": word_data.model_dump(),  
                "created_at": datetime.now(timezone.utc)
            }
            documents.append(document)
        
        if documents:
            await self._db.words.insert_many(documents)
        return True 

    @handle_mongo_errors
    async def _remove_words_to_db(self, username: str, words_data: list[Word]) -> bool:
        conditions = [
            {"username": word.username, "word_data.name": word.name}
            for word in words_data
        ]
        
        if conditions:
            await self._db.words.delete_many({"$or": conditions})
        return True 

    @handle_mongo_errors
    async def _save_edges_to_db(self, username: str, edges_data: list[Word]) -> bool:
        documents = []
        for edge_data in edges_data:
            document = {
                "username": username,
                "edge_data": edge_data.model_dump(),  
                "created_at": datetime.now(timezone.utc)
            }
            documents.append(document)
        
        if documents:
            await self._db.edges.insert_many(documents)
        return True 

    @handle_mongo_errors
    async def _load_data_from_db(self, username: str) -> list:
        words, graph = [], Graph()

        docs = await self._db.words.find({"username": username}).to_list()
        words = [Word(**doc["word_data"]) for doc in docs]
        graph.add_words(words)
        
        # TODO: add edges logic
        return graph

    @handle_general_errors
    async def get_graph(self, username: str) -> Graph:
        return await self._get_graph(username)

    @handle_general_errors
    async def get_data(self, user: UserInfo):
        username = user.username
        graph = await self._get_graph(username)
        return graph.get_all_data()

    async def _validate_word(self, word: Word, user: UserInfo, word_should_exist: bool):
        if not word.name.strip() or not word.username.strip():
            raise ValueError(f"Invalid Word: '{word.name}'")
        if len(word.name) > MAX_NAME_LENGTH:
            raise ValueError(f"Word name exceeds max length ({MAX_NAME_LENGTH}): '{word.name}'")
        if word.username != user.username:
            raise ValueError(f"Word username does't match request username: {user.username}") 
        graph = await self._get_graph(user.username)
        if graph.word_exist(word.name) != word_should_exist:
            raise ValueError(
                f"Word exist status: {graph.word_exist(word.name)}, "
                f"but should exist status: {word_should_exist}."
            ) 
    
    async def _validate_words(self, words:list[Word], user: UserInfo, word_should_exist: bool):
        unique_words = {(w.name, w.username): w for w in words}.values()
        if len(unique_words) != len(words):
            raise ValueError(f"Words have duplicate values")
        for word in words:
            await self._validate_word(word, user, word_should_exist)

    async def _validate_edge(self, edge, user: UserInfo, edge_should_exist: bool):
        if not edge.edge_name.strip() or not edge.username.strip():
            raise ValueError(f"Invalid edge: '{edge.edge_name}'")
        if not edge.from_name.strip() or not edge.to_name.strip():
            raise ValueError(f"Invalid edge from_name or to_name")
        if edge.from_name.strip() == edge.to_name.strip():
            raise ValueError(f"Invalid edge with the same from_name and to_name")
        if len(edge.edge_name) > MAX_NAME_LENGTH:
            raise ValueError(f"Edge name exceeds max length ({MAX_NAME_LENGTH}): '{edge.edge_name}'")
        if user.username != edge.username:
            raise ValueError(f"Edge's username does't match request username: {user.username}") 
        graph = await self._get_graph(user.username)
        if not (graph.word_exist(edge.from_name) and graph.word_exist(edge.to_name)):
            raise ValueError(
                f"Edge connecting with non existing words. "
                f"from_name: {edge.from_name}, to_name: {edge.to_name}"
            ) 
        if graph.edge_exist(edge) != edge_should_exist:
            raise ValueError(
                f"Edge exist status: {graph.edge_exist(edge)}, "
                f"but should exist status: {edge_should_exist}."
            ) 
        if graph.edge_conflicts(edge):
            raise ValueError(
                f"Edge '{edge.edge_name}' from '{edge.from_name}' "
                f"to '{edge.to_name}' conflicts with existing edges"
            ) 

    def _check_edge_conflicts(self, edges: list[Edge]):
        records = set()
        for edge in edges:
            outgoing = (edge.edge_name, edge.from_name, edge.to_name)
            if outgoing in records:
                return True 
            records.add(outgoing)

            if edge.double_edge == True:
                incoming = (edge.edge_name, edge.to_name, edge.from_name)
                if incoming in records: 
                    return True 
                records.add(incoming)
        return False

    async def _validate_edges(self, edges: list[Edge], user: UserInfo, edge_should_exist: bool):
        if self._check_edge_conflicts(edges):
            raise ValueError(f"Edges have conflict values")
        for edge in edges:
            await self._validate_edge(edge, user, edge_should_exist)
    
    @handle_general_errors
    async def add_words(self, words_data: list[Word], user: UserInfo):
        username = user.username
        await self._validate_words(words_data, user, False)
        await self._save_words_to_db(username, words_data)
        graph = await self._get_graph(username)
        graph.add_words(words_data)

    # Remove data will mark the cached graph as dirty and rebuild on next read
    @handle_general_errors
    async def remove_words(self, words_data: list[Word], user: UserInfo):
        username = user.username
        await self._validate_words(words_data, user, True)
        await self._remove_words_to_db(username, words_data)
        await self._cache_manager.mark_dirty(username)

    @handle_general_errors
    async def add_edges(self, edges_data: list[Edge], user: UserInfo):
        username = user.username
        await self._validate_edges(edges_data, user, False)
        await self._save_edges_to_db(username, edges_data)
        graph = await self._get_graph(username)
        graph.add_edges(edges_data)

    def get_database(self):
        return self._db

    @handle_general_errors
    async def clear_test_data(self):
        mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
        database = mongo_client[DEBUG_DB_NAME]
        collection_names = await database.list_collection_names()
        for collection_name in collection_names:
            logger.info(f"Dropping collection: {collection_name}")
            await database[collection_name].drop()
        logger.info(f"Successfully cleared all collections in test database: {DEBUG_DB_NAME}")
        await self._cache_manager.mark_all_dirty()

    