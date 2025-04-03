import pytest
from app.vocab_logger import logger
from core.vocab_types import TEST_USERNAME, TEST_PWD, TEST_SEMANTIC_UNITS_1, TEST_SEMANTIC_UNITS_2, TEST_SEMANTIC_UNITS_3

def equal_semantics(semantics_1, semantics_2):
    if len(semantics_1) != len(semantics_2): return False
    sorted_1 = sorted(semantics_1, key=lambda semantic: (semantic["name"], semantic["username"]))
    sorted_2 = sorted(semantics_2, key=lambda semantic: (semantic["name"], semantic["username"]))
    for s1, s2 in zip(sorted_1, sorted_2):
        if s1 != s2:
            return False
    return True

@pytest.mark.asyncio
@pytest.mark.parametrize("test_data", [
    TEST_SEMANTIC_UNITS_1,
    TEST_SEMANTIC_UNITS_2,
    TEST_SEMANTIC_UNITS_3
], ids=["one_word", "two_words", "three_words"])
async def test_add_words(client, auth_headers, test_data):
    headers = auth_headers
    response = client.post(
        "/api/vocabnet/createdata", 
        headers=headers, 
        json={"semantic_units": test_data}
    )
    assert response.status_code == 200

    response = client.get("/api/vocabnet/getdata", headers=headers)
    assert response.status_code == 200
    assert response.json()["user"]["username"] == TEST_USERNAME
    assert equal_semantics(response.json()["semantic_units"], test_data)

@pytest.mark.asyncio
@pytest.mark.parametrize("test_case", [
    {
        "added_words": TEST_SEMANTIC_UNITS_1,
        "remove_words": [{
            "name": "philosophy",
            "username": TEST_USERNAME
        }],
        "remain_words": [],
    },
    {
        "added_words": TEST_SEMANTIC_UNITS_2,
        "remove_words": [{
            "name": "philosophy",
            "username": TEST_USERNAME
        }],
        "remain_words": [{
            "name": "stoicism",
            "username": TEST_USERNAME,
            "notes": "I practice this daily"
        }],
    },
    {
        "added_words": TEST_SEMANTIC_UNITS_2,
        "remove_words": [{
            "name": "philosophy",
            "username": TEST_USERNAME
        }, {
            "name": "stoicism",
            "username": TEST_USERNAME
        }],
        "remain_words": [],
    },
    {
        "added_words": TEST_SEMANTIC_UNITS_3,
        "remove_words": [{
            "name": "stoicism",
            "username": TEST_USERNAME
        }],
        "remain_words": [{
            "name": "philosophy",
            "username": TEST_USERNAME,
            "notes": "A key concept in ancient Greece"
        },
        {
            "name": "nihilism",
            "username": TEST_USERNAME,
            "star": True
        }],
    }
])
async def test_remove_words(client, auth_headers, test_case):
    headers = auth_headers
    response = client.post(
        "/api/vocabnet/createdata", 
        headers=headers, 
        json={"semantic_units": test_case["added_words"]}
    )
    assert response.status_code == 200

    response = client.post(
        "/api/vocabnet/removedata", 
        headers=headers, 
        json={"semantic_units" : test_case["remove_words"]}
    )
    assert response.status_code == 200

    response = client.get("/api/vocabnet/getdata", headers=headers)
    assert response.status_code == 200
    assert response.json()["user"]["username"] == TEST_USERNAME
    assert equal_semantics(response.json()["semantic_units"], test_case["remain_words"])
