from db import db
import asyncio
from typing import Optional

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
    def __init__(self):
        self.__words = {}  # Dictionary to store word data
        self.__lock = AsyncRWLock()  # Read-write lock for thread safety
    
    def write_lock(self):
        return WriteContext(self.__lock)

    async def add_word(self, word_id, word_data):
        """Add a new word to the graph and MongoDB"""
        async with self.write_lock():
            # Add to local cache
            self.__words[word_id] = word_data
            
            # Persist to database
            await db.words.update_one(
                {"_id": word_id}, 
                {"$set": word_data}, 
                upsert=True
            )
            return True
            
# Singleton instance and initialization lock
_instance: Optional[VocabularyGraph] = None
_init_lock = asyncio.Lock()

async def get_vocabulary_graph():
    """Get the singleton instance of VocabularyGraph"""
    global _instance
    if _instance is None:
        async with _init_lock:
            if _instance is None:
                _instance = VocabularyGraph()
    return _instance
    
    