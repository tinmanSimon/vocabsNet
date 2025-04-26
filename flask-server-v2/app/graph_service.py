from app.graph import Graph 
from app.graph_cache import GraphCacheManager
from app.vocab_logger import logger
from app.validator import Validator
from core.vocab_types import Word, Edge, UserInfo, DataRemoveRequest
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
        self._validator = Validator()

    def get_database(self):
        return self._db

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
                "word_data": {
                    **word_data.model_dump(),
                    "created_at": datetime.now(timezone.utc)
                }
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
                "edge_data": {
                    **edge_data.model_dump(),  
                    "created_at": datetime.now(timezone.utc)
                }
            }
            documents.append(document)
        
        if documents:
            await self._db.edges.insert_many(documents)
        return True 

    @handle_mongo_errors
    async def _remove_edges_to_db(
        self, 
        username: str, 
        words_data: list[Word], 
        edges_data: list[Edge]
    ) -> bool:
        conditions = []
        for word in words_data:
            conditions.append({"username": username, "edge_data.from_name": word.name})
            conditions.append({"username": username, "edge_data.to_name": word.name})

        for edge in edges_data:
            conditions.append({
                "username": username, 
                "edge_data.edge_name": edge.edge_name,
                "edge_data.from_name": edge.from_name,
                "edge_data.to_name": edge.to_name,
                "edge_data.double_edge": edge.double_edge
            })
        
        if conditions:
            await self._db.edges.delete_many({"$or": conditions})
        return True 

    @handle_mongo_errors
    async def _load_data_from_db(self, username: str) -> list:
        words, graph = [], Graph()

        docs = await self._db.words.find({"username": username}).to_list()
        words = [Word(**doc["word_data"]) for doc in docs]
        graph.add_words(words)
        
        docs = await self._db.edges.find({"username": username}).to_list()
        edges = [Edge(**doc["edge_data"]) for doc in docs]
        graph.add_edges(edges)
        return graph

    @handle_general_errors
    async def get_graph(self, username: str) -> Graph:
        return await self._get_graph(username)

    @handle_general_errors
    async def get_data(self, user: UserInfo):
        username = user.username
        graph = await self._get_graph(username)
        return graph.get_all_data()
    
    @handle_general_errors
    async def add_words(self, words_data: list[Word], user: UserInfo):
        if words_data is None: return
        username = user.username
        graph = await self._get_graph(username)
        await self._validator.validate_words(
            words_data, 
            user, 
            word_should_exist=False,
            graph=graph
        )
        await self._save_words_to_db(username, words_data)
        graph.add_words(words_data)

    # Remove data will mark the cached graph as dirty and rebuild on next read
    @handle_general_errors
    async def remove_data(self, request: DataRemoveRequest, user: UserInfo):
        username = user.username
        graph = await self._get_graph(username)

        words_data = request.words 
        edges_data = request.edges
        if words_data:
            await self._validator.validate_words(
                words_data, 
                user, 
                word_should_exist=True,
                graph=graph
            )
        if edges_data:
            await self._validator.validate_edges(
                edges_data, 
                user, 
                edge_should_exist=True,
                graph=graph
            )

        await self._remove_words_to_db(username, words_data)
        await self._remove_edges_to_db(username, words_data, edges_data)
        await self._cache_manager.invalidate(username)

    @handle_general_errors
    async def add_edges(self, edges_data: list[Edge], user: UserInfo):
        if edges_data is None: return
        username = user.username
        graph = await self._get_graph(username)
        await self._validator.validate_edges(
            edges_data, 
            user, 
            edge_should_exist=False,
            graph=graph
        )
        await self._save_edges_to_db(username, edges_data)
        graph.add_edges(edges_data)

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
