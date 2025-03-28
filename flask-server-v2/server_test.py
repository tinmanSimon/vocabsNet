from fastapi.testclient import TestClient
from server import app
import pytest

@pytest.fixture(scope="module", autouse=True)
def client():
    with TestClient(app) as client:  # Runs `lifespan`
        yield client  

def test_read_root(client):
    response = client.get("/api/vocabnet/test")
    assert response.status_code == 200
    assert response.json() == {"message": "request received"}

def test_register_user(client):
    response = client.post("/api/vocabnet/register", json={
        "username" : "najksdfujweqhdjsbhf",
        "password" : "pwqaASDFuwe278336#@"
    })
    assert response.status_code == 201
    assert response.json()["success"] == True
