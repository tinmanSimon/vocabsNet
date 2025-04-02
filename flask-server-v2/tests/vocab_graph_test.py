import pytest
from app.vocab_logger import logger
from core.vocab_types import TEST_USERNAME, TEST_PWD

@pytest.mark.asyncio
async def test_add_word(client, auth_headers):
    headers = auth_headers
    client.post("/api/vocabnet/createdata", headers=headers, json={
        "semantic_units": [
            {
                "name": "philosophy",
                "username": TEST_USERNAME,
                "notes": "A key concept in ancient Greece"
            },
            {
                "name": "stoicism" ,
                "username": TEST_USERNAME,
                "notes": "I practice this daily"
            }
        ]
    })
    response = client.get("/api/vocabnet/getdata", headers=headers)
    assert response.status_code == 200
    assert response.json()["user"]["username"] == TEST_USERNAME
    assert response.json()["semantic_units"][0]["name"] == "philosophy"
    assert response.json()["semantic_units"][0]["username"] == TEST_USERNAME
    assert response.json()["semantic_units"][0]["notes"] == "A key concept in ancient Greece"
    assert response.json()["semantic_units"][1]["name"] == "stoicism"
    assert response.json()["semantic_units"][1]["username"] == TEST_USERNAME
    assert response.json()["semantic_units"][1]["notes"] == "I practice this daily"
