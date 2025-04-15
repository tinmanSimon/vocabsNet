import pytest
import copy
from fastapi.testclient import TestClient
from app.server import app  
from app.vocab_logger import logger
from core.vocab_types import TEST_USERNAME, TEST_PWD
from core.credentials import MONGO_URI, DB_NAME, DEBUG_DB_NAME
from pymongo import MongoClient

def _clear_graph(tx):
    query = "MATCH (n) DETACH DELETE n"
    tx.run(query)

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

@pytest.fixture(scope="function", autouse=False)
def auth_headers(client):
    test_username = TEST_USERNAME
    test_pwd = TEST_PWD
    
    # Register the user
    response = client.post("/api/vocabnet/register", json={
        "username": test_username,
        "password": test_pwd
    })
    assert response.status_code == 201
    assert response.json()["register_success"] == True

    # Login to get access token
    response = client.post("/api/vocabnet/login", json={
        "username": test_username,
        "password": test_pwd
    })
    assert response.status_code == 200
    assert response.json()["access_token"] is not None
    access_token = response.json()["access_token"]

    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Return the headers for use in other tests
    return headers