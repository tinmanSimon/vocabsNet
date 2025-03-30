import pytest
from app.vocab_logger import logger

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

