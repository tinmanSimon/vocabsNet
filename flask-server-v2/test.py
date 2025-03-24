from vocab_graph import get_vocabulary_graph
import asyncio
import uuid
from datetime import datetime
from db import db, validate_connection
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("vocab_test")

async def add_word_test():
    # Get the singleton instance
    vg = await get_vocabulary_graph()
    
    # Create a unique word ID
    word_id = str(uuid.uuid4())
    
    # Create word data
    word_data = {
        "text": "example",
        "definition": "a representative form or pattern",
        "created_at": datetime.now().isoformat(),
        "pos": "noun"  # part of speech
    }
    
    logger.info(f"Adding word with ID: {word_id}")
    
    # Add the word using VocabularyGraph
    success = await vg.add_word(word_id, word_data)
    
    if success:
        logger.info(f"Successfully added word: {word_data['text']}")
    else:
        logger.error("Failed to add word")
    
    # Verify the word was added to MongoDB
    result = await db.words.find_one({"_id": word_id})
    
    if result:
        logger.info(f"Verification: Word found in MongoDB with text: {result.get('text')}")
        return True
    else:
        logger.error("Verification: Word not found in MongoDB!")
        return False

async def concurrent_add_words_test(num_words=5):
    """Test adding multiple words concurrently"""
    logger.info(f"Starting concurrent add test with {num_words} words...")
    
    # Create tasks for adding words concurrently
    tasks = []
    for i in range(num_words):
        word_id = str(uuid.uuid4())
        word_data = {
            "text": f"concurrent_example_{i}",
            "definition": f"Test word {i} added concurrently",
            "created_at": datetime.now().isoformat(),
            "pos": "noun"
        }
        
        # Get a new graph instance for each task (will be the same singleton)
        vg = await get_vocabulary_graph()
        
        # Create task
        task = asyncio.create_task(vg.add_word(word_id, word_data))
        tasks.append((word_id, task))
    
    # Wait for all tasks to complete
    results = []
    for word_id, task in tasks:
        await task
        # Verify word was added
        result = await db.words.find_one({"_id": word_id})
        results.append(result is not None)
    
    # Report results
    success_count = sum(1 for r in results if r)
    logger.info(f"Successfully added {success_count} out of {num_words} words concurrently")
    return success_count == num_words

async def cleanup():
    """Clean up test data from database"""
    logger.info("Cleaning up test data...")
    # Delete words with "example" in their text field
    result = await db.words.delete_many({
        "text": {"$regex": "example"}
    })
    logger.info(f"Deleted {result.deleted_count} test words from database")

async def main():
    logger.info("=== VocabularyGraph MongoDB Test ===")
    
    # Validate MongoDB connection
    if not await validate_connection():
        logger.error("Failed to connect to MongoDB. Tests aborted.")
        return
    
    # Run basic test
    basic_result = await add_word_test()
    
    # Run concurrent test
    concurrent_result = await concurrent_add_words_test(10)
    
    # Clean up test data
    await cleanup()
    
    # Print summary
    logger.info("=== Test Summary ===")
    logger.info(f"Basic test: {'Passed' if basic_result else 'Failed'}")
    logger.info(f"Concurrent test: {'Passed' if concurrent_result else 'Failed'}")

if __name__ == "__main__":
    asyncio.run(main())

