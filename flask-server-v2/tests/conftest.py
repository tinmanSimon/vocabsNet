import pytest
from fastapi.testclient import TestClient
from app.server import app  
from app.vocab_logger import logger
from core.vocab_types import TEST_USERNAME, TEST_PWD
from core.credentials import CLEAR_DATA_KEY

@pytest.fixture(scope="session", autouse=True)
def client():
    with TestClient(app) as client:  # Runs `lifespan`
        yield client  

def clear_database(client):
    logger.info(f"Starting to clear test database")
    response = client.post(
        "/api/vocabnet/cleartestdata", 
        json={"key": CLEAR_DATA_KEY}
    )
    assert response.status_code == 200, (f"response.json(): {response.json()}")

@pytest.fixture(scope="session", autouse=True)
def setup_and_teardown_session(client):
    logger.info("\n-- Session Start: Setting up resources --")
    clear_database(client) 
    yield  
    logger.info("\n-- Session End: Tearing down resources --")

@pytest.fixture(scope="function", autouse=True)
def setup_and_teardown_function(client):
    yield 
    clear_database(client) 

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