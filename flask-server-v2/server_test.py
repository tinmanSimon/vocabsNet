from fastapi.testclient import TestClient
from server import app
import pytest
from credentials import MONGO_URI, DB_NAME, DEBUG_DB_NAME
from vocab_logger import logger
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

def test_read_root(client):
    logger.info("\n-- Test test_read_root Start --")
    response = client.get("/api/vocabnet/test")
    assert response.status_code == 200
    assert response.json() == {"message": "request received"}

def test_register_short_password(client):
    logger.info("\n-- Test test_register_short_password Start --")
    response = client.post("/api/vocabnet/register", json={
        "username" : "najksdfujweqhdjsbhf",
        "password" : "asdc323"
    })
    assert response.status_code == 400

def test_register_invalid_username(client):
    logger.info("\n-- Test test_register_invalid_username Start --")
    response = client.post("/api/vocabnet/register", json={
        "username" : "najksdfujweq#hdjsbhf",
        "password" : "pwqaASDFuwe278336"
    })
    assert response.status_code == 400

def test_register_user(client):
    logger.info("\n-- Test test_register_user Start --")
    response = client.post("/api/vocabnet/register", json={
        "username" : "najksdfujweqhdjsbhf",
        "password" : "pwqaASDFuwe278336"
    })
    assert response.status_code == 201
    assert response.json()["register_success"] == True

def test_register_same_user(client):
    logger.info("\n-- Test test_register_same_user Start --")
    response = client.post("/api/vocabnet/register", json={})
    assert response.status_code == 422

    response = client.post("/api/vocabnet/register", json={
        "username" : "najksdfujweqhdjsbhf",
        "password" : "pwqaASDFuwe278336"
    })
    assert response.status_code == 201
    assert response.json()["register_success"] == True

    response = client.post("/api/vocabnet/register", json={
        "username" : "najksdfujweqhdjsbhf",
        "password" : "pwqaASDFuwe278336"
    })
    assert response.status_code == 400

def test_invalid_user_me(client):
    logger.info("\n-- Test test_invalid_user_me Start --")
    response = client.get("/api/vocabnet/user/me")
    assert response.status_code == 401

# test cases include invalid payload, non-existing user, wrong username,
# wrong password.
def test_invalid_login(client):
    logger.info("\n-- Test test_invalid_login Start --")
    response = client.post("/api/vocabnet/login", json={})
    assert response.status_code == 422

    response = client.post("/api/vocabnet/login", json={
        "username" : "najksdfujweqhdjsbhf",
        "password" : "pwqaASDFuwe278336"
    })
    assert response.status_code == 401

    response = client.post("/api/vocabnet/register", json={
        "username" : "najksdfujweqhdjsbhf",
        "password" : "pwqaASDFuwe278336"
    })
    assert response.status_code == 201
    assert response.json()["register_success"] == True

    response = client.post("/api/vocabnet/login", json={
        "username" : "najksdfujweqhdjsbhf",
        "password" : "pwqaASDFuwe27833"
    })
    assert response.status_code == 401

    response = client.post("/api/vocabnet/login", json={
        "username" : "najksdfujweqhdjsbf",
        "password" : "pwqaASDFuwe278336"
    })
    assert response.status_code == 401

def test_register_and_login(client):
    logger.info("\n-- Test test_register_and_login Start --")
    test_username = "najksdfujweqhdjsbhf"
    test_pwd = "pwqaASDFuwe278336"

    response = client.post("/api/vocabnet/register", json={
        "username" : test_username,
        "password" : test_pwd
    })
    assert response.status_code == 201
    assert response.json()["register_success"] == True

    response = client.post("/api/vocabnet/login", json={
        "username" : test_username,
        "password" : test_pwd
    })
    assert response.status_code == 200
    assert response.json()["access_token"] is not None

    access_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    response = client.get("/api/vocabnet/user/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["user"]["username"] == test_username

