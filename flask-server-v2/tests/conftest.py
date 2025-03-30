import pytest
from fastapi.testclient import TestClient
from app.server import app  
from app.vocab_logger import logger
from core.credentials import MONGO_URI, DB_NAME, DEBUG_DB_NAME
from pymongo import MongoClient

def clear_database(database_name: str, connection_string: str):
    logger.info(f"Starting to clear database: {database_name}")
    client = MongoClient(connection_string)
    db = client[database_name]

    try:
        collection_names = db.list_collection_names()
        for collection_name in collection_names:
            logger.info(f"Dropping collection: {collection_name}")
            db[collection_name].drop()
        logger.info(f"Successfully cleared all collections in database: {database_name}")

    except Exception as e:
        logger.error(f"An error occurred while clearing the database: {e}")

    finally:
        client.close()
        logger.info("MongoDB client closed.")

@pytest.fixture(scope="session", autouse=True)
def setup_and_teardown_session():
    logger.info("\n-- Session Start: Setting up resources --")
    clear_database(DEBUG_DB_NAME, MONGO_URI)
    yield  
    logger.info("\n-- Session End: Tearing down resources --")

@pytest.fixture(scope="module", autouse=True)
def client():
    with TestClient(app) as client:  # Runs `lifespan`
        yield client  

@pytest.fixture(scope="function", autouse=True)
def setup_and_teardown_function():
    yield 
    clear_database(DEBUG_DB_NAME, MONGO_URI) 
