from app.graph import Graph 
from app.graph_cache import GraphCacheManager
from app.vocab_logger import logger
from core.vocab_types import Word, Edge, UserInfo, MAX_NAME_LENGTH
from app.user_lock import UserLockManager
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
    async def create(cls, database, cache_manager: GraphCacheManager):
        self = cls(database, cache_manager)
        await self._initialize_database()
        return self

    def __init__(self, database, cache_manager: GraphCacheManager):
        self._cache_manager = cache_manager
        self._db = database
        self._lock_manager = UserLockManager()

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
            result = await self._db.words.insert_many(documents)
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
        lock = await self._lock_manager.get_lock(username)
        async with lock.reader_lock:
            return await self._get_graph(username)

    @handle_general_errors
    async def get_data(self, user: UserInfo):
        username = user.username
        lock = await self._lock_manager.get_lock(username)
        graph = await self._get_graph(username)
        return graph.get_all_data()

    def _validate_word(self, word: Word, user: UserInfo):
        if not word.name.strip() or not word.username.strip():
            raise ValueError(f"Invalid Word: '{word.name}'")
        if len(word.name) > MAX_NAME_LENGTH:
            raise ValueError(f"Word name exceeds max length ({MAX_NAME_LENGTH}): '{word.name}'")
        if word.username != user.username:
            raise ValueError(f"Word username does't match request username: {user.username}") 
    
    def _validate_words(self, words:list[Word], user: UserInfo):
        unique_words = {(w.name, w.username): w for w in words}.values()
        if len(unique_words) != len(words):
            raise ValueError(f"Words have duplicate values")
        for word in words:
            self._validate_word(word, user)
    
    @handle_general_errors
    async def add_words(self, words_data: list[Word], user: UserInfo):
        username = user.username
        self._validate_words(words_data, user)

        lock = await self._lock_manager.get_lock(username)
        async with lock.writer_lock:
            # Update DB
            await self._save_words_to_db(username, words_data)

            # Update graph
            graph = await self._get_graph(username)
            graph.add_words(words_data)

    
    