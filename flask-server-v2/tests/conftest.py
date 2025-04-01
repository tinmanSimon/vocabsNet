import pytest
from fastapi.testclient import TestClient
from app.server import app  
from app.vocab_logger import logger
from core.credentials import neo4j_uri, neo4j_username, neo4j_pwd
from neo4j import GraphDatabase

def _clear_graph(tx):
    query = "MATCH (n) WHERE n.environment = 'test' DETACH DELETE n"
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
        # Define a wrapper that adds environment="test" to all JSON payloads
        original_post = client.post
        def post_with_test_env(url, **kwargs):
            if 'json' in kwargs and isinstance(kwargs['json'], dict):
                kwargs['json']['environment'] = "test"
            return original_post(url, **kwargs)
        client.post = post_with_test_env

        yield client  

@pytest.fixture(scope="function", autouse=True)
def setup_and_teardown_function():
    yield 
    clear_database() 
