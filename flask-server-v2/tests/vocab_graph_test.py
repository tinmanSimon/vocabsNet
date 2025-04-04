import pytest
from app.vocab_logger import logger
from core.vocab_types import (
    TEST_USERNAME, TEST_USERNAME2, TEST_PWD, 
    TEST_SEMANTIC_UNIT_1, TEST_SEMANTIC_UNIT_2, TEST_SEMANTIC_UNIT_3, 
    TEST_SEMANTIC_UNIT_4, TEST_SEMANTIC_UNIT_5,
    TEST_EDGE_1_TO_2
)
import asyncio
from httpx import AsyncClient
import random
NUM_USERS = 60  # Number of concurrent user flows
HTTPX_TIMEOUT = 30.0
RANDOM_DELAY = 2.0

def equal_semantics(semantics_1, semantics_2):
    if len(semantics_1) != len(semantics_2): return False
    sorted_1 = sorted(semantics_1, key=lambda semantic: (semantic["name"], semantic["username"]))
    sorted_2 = sorted(semantics_2, key=lambda semantic: (semantic["name"], semantic["username"]))
    for s1, s2 in zip(sorted_1, sorted_2):
        if s1 != s2:
            return False
    return True

@pytest.mark.asyncio
async def test_wrong_user_add_words(client, auth_headers):
    headers = auth_headers
    response = client.post(
        "/api/vocabnet/createdata", 
        headers=headers, 
        json={
            "semantic_units": [
                {**TEST_SEMANTIC_UNIT_1, "username" : TEST_USERNAME2}
            ]
        }
    )
    assert response.status_code == 400

@pytest.mark.asyncio
@pytest.mark.parametrize("test_data", [
    [TEST_SEMANTIC_UNIT_1],
    [TEST_SEMANTIC_UNIT_1, TEST_SEMANTIC_UNIT_2],
    [TEST_SEMANTIC_UNIT_1, TEST_SEMANTIC_UNIT_2, TEST_SEMANTIC_UNIT_3]
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
        "added_words": [TEST_SEMANTIC_UNIT_1],
        "remove_words": [TEST_SEMANTIC_UNIT_1],
        "remain_words": [],
    },
    {
        "added_words": [TEST_SEMANTIC_UNIT_1, TEST_SEMANTIC_UNIT_2],
        "remove_words": [TEST_SEMANTIC_UNIT_1],
        "remain_words": [TEST_SEMANTIC_UNIT_2],
    },
    {
        "added_words": [TEST_SEMANTIC_UNIT_1, TEST_SEMANTIC_UNIT_2],
        "remove_words": [TEST_SEMANTIC_UNIT_1, TEST_SEMANTIC_UNIT_2],
        "remain_words": [],
    },
    {
        "added_words": [TEST_SEMANTIC_UNIT_1, TEST_SEMANTIC_UNIT_2, TEST_SEMANTIC_UNIT_3],
        "remove_words": [TEST_SEMANTIC_UNIT_1],
        "remain_words": [TEST_SEMANTIC_UNIT_2, TEST_SEMANTIC_UNIT_3],
    },
    {
        "added_words": [
            TEST_SEMANTIC_UNIT_1, 
            TEST_SEMANTIC_UNIT_2, 
            TEST_SEMANTIC_UNIT_3,
            TEST_SEMANTIC_UNIT_4,
            TEST_SEMANTIC_UNIT_5
        ],
        "remove_words": [TEST_SEMANTIC_UNIT_1, TEST_SEMANTIC_UNIT_3, TEST_SEMANTIC_UNIT_5],
        "remain_words": [TEST_SEMANTIC_UNIT_2, TEST_SEMANTIC_UNIT_4],
    },
    {
        "added_words": [
            TEST_SEMANTIC_UNIT_1, 
            TEST_SEMANTIC_UNIT_2, 
            TEST_SEMANTIC_UNIT_3,
            TEST_SEMANTIC_UNIT_4,
            TEST_SEMANTIC_UNIT_5
        ],
        "remove_words": [TEST_SEMANTIC_UNIT_2, TEST_SEMANTIC_UNIT_4],
        "remain_words": [TEST_SEMANTIC_UNIT_1, TEST_SEMANTIC_UNIT_3, TEST_SEMANTIC_UNIT_5],
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

    wrong_user_remove = {**test_case["remove_words"][0], "username" : TEST_USERNAME2}
    response = client.post(
        "/api/vocabnet/removedata", 
        headers=headers, 
        json={"semantic_units": [wrong_user_remove]}
    )
    assert response.status_code == 400

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

@pytest.mark.asyncio
@pytest.mark.parametrize("test_case", [
    {
        "added_words": [TEST_SEMANTIC_UNIT_1, TEST_SEMANTIC_UNIT_2],
        "added_edges": [TEST_EDGE_1_TO_2]
    }
])
async def test_add_edges(client, auth_headers, test_case):
    headers = auth_headers
    response = client.post(
        "/api/vocabnet/createdata", 
        headers=headers, 
        json={
            "semantic_units": test_case["added_words"],
            "edges": test_case["added_edges"]
        }
    )
    assert response.status_code == 200, (f"response.json(): {response.json()}")

@pytest.mark.asyncio
async def test_concurrent_user_flows():
    async with AsyncClient(base_url="http://localhost:8000", timeout=HTTPX_TIMEOUT) as client:
        async def user_flow(user_id):
            username = f"testUser{user_id}"
            password = f"test_password_{user_id}"

            # Step 1: Register
            await asyncio.sleep(10 * RANDOM_DELAY * random.random())
            response = await client.post("/api/vocabnet/register", json={
                "username": username,
                "password": password
            })
            assert response.status_code == 201
            assert response.json()["register_success"] is True

            # Step 2: Login and get access token
            await asyncio.sleep(6 * RANDOM_DELAY * random.random())
            response = await client.post("/api/vocabnet/login", json={
                "username": username,
                "password": password
            })
            assert response.status_code == 200
            access_token = response.json().get("access_token")
            assert access_token is not None

            headers = {"Authorization": f"Bearer {access_token}"}

            # Step 3: Add Words
            await asyncio.sleep(2 * RANDOM_DELAY * random.random())
            added_words = [
                {**TEST_SEMANTIC_UNIT_1, "username": username}, 
                {**TEST_SEMANTIC_UNIT_2, "username": username}, 
                {**TEST_SEMANTIC_UNIT_3, "username": username},
                {**TEST_SEMANTIC_UNIT_4, "username": username},
                {**TEST_SEMANTIC_UNIT_5, "username": username}
            ]

            response = await client.post(
                "/api/vocabnet/createdata",
                headers=headers,
                json={"semantic_units": added_words}
            )
            assert response.status_code == 200

            # Step 4: Remove a Word
            await asyncio.sleep(RANDOM_DELAY * random.random())
            removed_words = [
                {**TEST_SEMANTIC_UNIT_2, "username": username}, 
                {**TEST_SEMANTIC_UNIT_4, "username": username}
            ]
            response = await client.post(
                "/api/vocabnet/removedata",
                headers=headers,
                json={"semantic_units": removed_words}
            )
            assert response.status_code == 200

            # Step 5: Fetch Data and Verify
            await asyncio.sleep(RANDOM_DELAY * random.random())
            remain_words = [
                {**TEST_SEMANTIC_UNIT_1, "username": username}, 
                {**TEST_SEMANTIC_UNIT_3, "username": username}, 
                {**TEST_SEMANTIC_UNIT_5, "username": username}
            ]
            response = await client.get("/api/vocabnet/getdata", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["user"]["username"] == username
            assert equal_semantics(data["semantic_units"], remain_words)

        # Run multiple user flows concurrently
        tasks = [asyncio.create_task(user_flow(i)) for i in range(NUM_USERS)]
        await asyncio.gather(*tasks)
