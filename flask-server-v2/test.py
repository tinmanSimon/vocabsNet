from vocab_graph import get_vocabulary_graph, VocabularyGraph
import asyncio
import uuid
from datetime import datetime
from db import db, validate_connection, client
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("vocab_test")

# Create a separate test database
TEST_DB_NAME = "vocabnet_test"
test_db = client[TEST_DB_NAME]

async def setup_test_db():
    """Set up the test database"""
    logger.info(f"Setting up test database: {TEST_DB_NAME}")
    # Drop existing test collections to start fresh
    await test_db.words.drop()
    logger.info("Test database ready")

async def cleanup_test_db():
    """Clean up the test database after tests"""
    logger.info(f"Cleaning up test database: {TEST_DB_NAME}")
    await test_db.words.drop()
    logger.info("Test database cleaned up")

async def add_word_test():
    # Get the vocabulary graph instance with test database
    vg = await get_vocabulary_graph(test_db=test_db)
    
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
    
    # Verify the word was added to test database
    result = await test_db.words.find_one({"_id": word_id})
    
    if result:
        logger.info(f"Verification: Word found in test database with text: {result.get('text')}")
        return True
    else:
        logger.error("Verification: Word not found in test database!")
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
        
        # Get vocabulary graph instance with test database
        vg = await get_vocabulary_graph(test_db=test_db)
        
        # Create task
        task = asyncio.create_task(vg.add_word(word_id, word_data))
        tasks.append((word_id, task))
    
    # Wait for all tasks to complete
    results = []
    for word_id, task in tasks:
        await task
        # Verify word was added
        result = await test_db.words.find_one({"_id": word_id})
        results.append(result is not None)
    
    # Report results
    success_count = sum(1 for r in results if r)
    logger.info(f"Successfully added {success_count} out of {num_words} words concurrently")
    return success_count == num_words

async def test_load_data():
    """Test loading data from MongoDB into VocabularyGraph"""
    logger.info("Testing data loading functionality...")
    
    # First, add a few test words to ensure we have data to load
    test_words = []
    vg = await get_vocabulary_graph(test_db=test_db)
    
    # Add some test words if needed
    for i in range(3):
        word_id = str(uuid.uuid4())
        word_data = {
            "text": f"load_test_word_{i}",
            "definition": f"Test word {i} for load testing",
            "created_at": datetime.now().isoformat(),
            "pos": "noun"
        }
        await vg.add_word(word_id, word_data)
        test_words.append(word_id)
    
    logger.info(f"Added {len(test_words)} test words for load testing")
    
    # Create a new VocabularyGraph instance (not using singleton)
    # to test the load functionality specifically
    test_graph = VocabularyGraph(custom_db=test_db)
    
    # Load data
    word_count = await test_graph.load_data()
    logger.info(f"Loaded {word_count} words into test graph")
    
    # Verify all our test words were loaded
    all_loaded = True
    for word_id in test_words:
        word = await test_graph.get_word(word_id)
        if not word:
            logger.error(f"Test word {word_id} was not loaded")
            all_loaded = False
    
    if all_loaded:
        logger.info("All test words were successfully loaded")
    
    # Get total number of words
    all_words = await test_graph.get_all_words()
    logger.info(f"Total words in test graph: {len(all_words)}")
    
    return all_loaded and word_count > 0

async def main():
    logger.info("=== VocabularyGraph MongoDB Test ===")
    
    # Validate MongoDB connection
    if not await validate_connection():
        logger.error("Failed to connect to MongoDB. Tests aborted.")
        return
    
    try:
        # Set up test database
        await setup_test_db()
        
        # Run basic test
        basic_result = await add_word_test()
        
        # Run concurrent test
        concurrent_result = await concurrent_add_words_test(10)
        
        # Test data loading
        load_result = await test_load_data()
        
        # Print summary
        logger.info("=== Test Summary ===")
        logger.info(f"Basic test: {'Passed' if basic_result else 'Failed'}")
        logger.info(f"Concurrent test: {'Passed' if concurrent_result else 'Failed'}")
        logger.info(f"Load data test: {'Passed' if load_result else 'Failed'}")
    
    finally:
        # Clean up test database regardless of test outcomes
        await cleanup_test_db()

if __name__ == "__main__":
    asyncio.run(main())

