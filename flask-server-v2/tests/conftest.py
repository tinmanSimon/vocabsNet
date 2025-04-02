import pytest
import copy
from fastapi.testclient import TestClient
from app.server import app  
from app.vocab_logger import logger
from core.vocab_types import TEST_USERNAME, TEST_PWD
from core.credentials import neo4j_uri, neo4j_username, neo4j_pwd
from neo4j import GraphDatabase

def _clear_graph(tx):
    query = "MATCH (n) DETACH DELETE n"
    tx.run(query)

def clear_database():
    logger.info(f"Starting to clear neo4j")
    try:
        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_username, neo4j_pwd))
        with driver.session() as session:
            session.execute_write(_clear_graph)
        driver.close()
    except Exception as e:
        logger.error(f"An error occurred while clearing the database: {e}")

@pytest.fixture(scope="session", autouse=True)
def setup_and_teardown_session():
    logger.info("\n-- Session Start: Setting up resources --")
    clear_database()
    yield  
    logger.info("\n-- Session End: Tearing down resources --")

@pytest.fixture(scope="module", autouse=True)
def client():
    with TestClient(app) as client:  # Runs `lifespan`
        yield client  

@pytest.fixture(scope="function", autouse=True)
def setup_and_teardown_function():
    yield 
    clear_database() 

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