from db import db
import asyncio
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class AsyncRWLock:
    """Read-write lock allowing concurrent reads but exclusive writes"""
    def __init__(self):
        self._read_ready = asyncio.Condition()
        self._readers = 0
        self._writers = 0
        self._write_waiting = 0
        
    async def acquire_read(self):
        async with self._read_ready:
            while self._writers > 0 or self._write_waiting > 0:
                await self._read_ready.wait()
            self._readers += 1
            
    async def release_read(self):
        async with self._read_ready:
            self._readers -= 1
            if self._readers == 0:
                self._read_ready.notify_all()
                
    async def acquire_write(self):
        async with self._read_ready:
            self._write_waiting += 1
            while self._readers > 0 or self._writers > 0:
                await self._read_ready.wait()
            self._write_waiting -= 1
            self._writers += 1
            
    async def release_write(self):
        async with self._read_ready:
            self._writers -= 1
            self._read_ready.notify_all()

class ReadContext:
    """Context manager for read operations"""
    def __init__(self, lock):
        self.lock = lock
        
    async def __aenter__(self):
        await self.lock.acquire_read()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.lock.release_read()
        
class WriteContext:
    """Context manager for write operations"""
    def __init__(self, lock):
        self.lock = lock
        
    async def __aenter__(self):
        await self.lock.acquire_write()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.lock.release_write()

class VocabularyGraph:
    def __init__(self, custom_db=None):
        self.__words = {}  # Dictionary to store word data
        self.__lock = AsyncRWLock()  # Read-write lock for thread safety
        self.__db = custom_db if custom_db is not None else db  # Use custom_db if provided, otherwise use default db
    
    def write_lock(self):
        return WriteContext(self.__lock)
    
    def read_lock(self):
        return ReadContext(self.__lock)

    async def load_data(self):
        """Load words from MongoDB into memory"""
        async with self.write_lock():
            # Clear existing data first
            self.__words = {}
            
            # Fetch all words from MongoDB
            word_cursor = self.__db.words.find({})
            word_list = await word_cursor.to_list(length=None)
            
            # Store words in memory
            for word in word_list:
                word_id = str(word["_id"])
                self.__words[word_id] = word
                
            return len(self.__words)
    
    async def get_word(self, word_id):
        """Get a word by its ID"""
        async with self.read_lock():
            return self.__words.get(word_id)
    
    async def get_all_words(self):
        """Get all loaded words"""
        async with self.read_lock():
            return list(self.__words.values())

    async def add_word(self, word_id, word_data):
        """Add a new word to the graph and MongoDB"""
        async with self.write_lock():
            # Add to local cache
            self.__words[word_id] = word_data
            
            # Persist to database
            await self.__db.words.update_one(
                {"_id": word_id}, 
                {"$set": word_data}, 
                upsert=True
            )
            return True
            
# Singleton instance and initialization lock
_instance: Optional[VocabularyGraph] = None
_test_instance: Optional[VocabularyGraph] = None
_init_lock = asyncio.Lock()

async def get_vocabulary_graph(test_db=None):
    """Get the singleton instance of VocabularyGraph
    
    Args:
        test_db: Optional database to use for testing purposes.
                 If provided, returns a separate test singleton.
    """
    global _instance, _test_instance
    
    # If test_db is provided, use a separate singleton for testing
    if test_db is not None:
        if _test_instance is None:
            async with _init_lock:
                if _test_instance is None:
                    _test_instance = VocabularyGraph(custom_db=test_db)
                    # Load data from test database
                    words_loaded = await _test_instance.load_data()
                    logger.info(f"VocabularyGraph test instance initialized with {words_loaded} words loaded")
        return _test_instance
    
    # Otherwise, use the regular production singleton
    if _instance is None:
        async with _init_lock:
            if _instance is None:
                _instance = VocabularyGraph()
                # Load data from MongoDB
                words_loaded = await _instance.load_data()
                logger.info(f"VocabularyGraph initialized with {words_loaded} words loaded")
    return _instance
    
    