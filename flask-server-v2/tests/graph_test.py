import pytest
from app.vocab_logger import logger
from core.vocab_types import (
    TEST_USERNAME, TEST_USERNAME2, TEST_PWD, 
    TEST_WORD_UNIT_1, TEST_WORD_UNIT_2, TEST_WORD_UNIT_3, 
    TEST_WORD_UNIT_4, TEST_WORD_UNIT_5,
    TEST_EDGE_1_TO_2, TEST_EDGE_1_TO_3, TEST_EDGE_2_TO_3,
    MAX_NAME_LENGTH
)
import asyncio
from httpx import AsyncClient
import random
NUM_USERS = 60  # Number of concurrent user flows
HTTPX_TIMEOUT = 30.0
RANDOM_DELAY = 2.0

def equal_words(words_1, words_2):
    if len(words_1) != len(words_2): return False
    ignore_fields = ["timestamp", "created_at", "incoming", "outgoing"]
    filtered_1 = [{k: v for k, v in word.items() if k not in ignore_fields} 
                 for word in words_1]
    filtered_2 = [{k: v for k, v in word.items() if k not in ignore_fields} 
                 for word in words_2]
    sorted_1 = sorted(filtered_1, key=lambda word: (word["name"], word["username"]))
    sorted_2 = sorted(filtered_2, key=lambda word: (word["name"], word["username"]))
    for s1, s2 in zip(sorted_1, sorted_2):
        if s1 != s2:
            return False
    return True

def equal_edges(edges_1, edges_2):
    if len(edges_1) != len(edges_2): return False
    ignore_fields = ["timestamp", "created_at"]
    filtered_1 = [{k: v for k, v in edge.items() if k not in ignore_fields} 
                 for edge in edges_1]
    filtered_2 = [{k: v for k, v in edge.items() if k not in ignore_fields} 
                 for edge in edges_2]

    # Kinda hacky but the point is to default double_edge to be false.
    # Should revise the logic when I have more time.
    for edge in filtered_2:
        if "double_edge" not in edge:
            edge["double_edge"] = False

    sorted_1 = sorted(filtered_1, key=lambda edge: (
        edge["edge_name"], edge["from_name"], edge["to_name"]
    ))
    sorted_2 = sorted(filtered_2, key=lambda edge: (
        edge["edge_name"], edge["from_name"], edge["to_name"]
    ))

    for s1, s2 in zip(sorted_1, sorted_2):
        if s1 != s2:
            return False
    return True

@pytest.mark.asyncio
@pytest.mark.parametrize("words_data", [
    [{**TEST_WORD_UNIT_1, "name" : "a" * (MAX_NAME_LENGTH + 1)}],
    [{**TEST_WORD_UNIT_1, "name" : ""}],
    [{**TEST_WORD_UNIT_1, "name" : "      "}],
    [{**TEST_WORD_UNIT_1, "username" : TEST_USERNAME2}],
    [TEST_WORD_UNIT_1, TEST_WORD_UNIT_2, TEST_WORD_UNIT_1],
])
async def test_invalid_add_words(client, auth_headers, words_data):
    headers = auth_headers
    response = client.post(
        "/api/vocabnet/createdata", 
        headers=headers, 
        json={"words": words_data}
    )
    assert response.status_code == 400

@pytest.mark.asyncio
@pytest.mark.parametrize("test_data", [
    [TEST_WORD_UNIT_1],
    [TEST_WORD_UNIT_1, TEST_WORD_UNIT_2],
    [TEST_WORD_UNIT_1, TEST_WORD_UNIT_2, TEST_WORD_UNIT_3]
])
async def test_add_words(client, auth_headers, test_data):
    headers = auth_headers
    response = client.post(
        "/api/vocabnet/createdata", 
        headers=headers, 
        json={"words": test_data}
    )
    assert response.status_code == 200

    response = client.get("/api/vocabnet/getdata", headers=headers)
    assert response.status_code == 200
    assert response.json()["user"]["username"] == TEST_USERNAME
    assert equal_words(response.json()["words"], test_data)

@pytest.mark.asyncio
@pytest.mark.parametrize("test_case", [
    {
        "added_words": [TEST_WORD_UNIT_1],
        "remove_words": [TEST_WORD_UNIT_1],
        "remain_words": [],
    },
    {
        "added_words": [TEST_WORD_UNIT_1, TEST_WORD_UNIT_2],
        "remove_words": [TEST_WORD_UNIT_1],
        "remain_words": [TEST_WORD_UNIT_2],
    },
    {
        "added_words": [TEST_WORD_UNIT_1, TEST_WORD_UNIT_2],
        "remove_words": [TEST_WORD_UNIT_1, TEST_WORD_UNIT_2],
        "remain_words": [],
    },
    {
        "added_words": [TEST_WORD_UNIT_1, TEST_WORD_UNIT_2, TEST_WORD_UNIT_3],
        "remove_words": [TEST_WORD_UNIT_1],
        "remain_words": [TEST_WORD_UNIT_2, TEST_WORD_UNIT_3],
    },
    {
        "added_words": [
            TEST_WORD_UNIT_1, 
            TEST_WORD_UNIT_2, 
            TEST_WORD_UNIT_3,
            TEST_WORD_UNIT_4,
            TEST_WORD_UNIT_5
        ],
        "remove_words": [TEST_WORD_UNIT_1, TEST_WORD_UNIT_3, TEST_WORD_UNIT_5],
        "remain_words": [TEST_WORD_UNIT_2, TEST_WORD_UNIT_4],
    },
    {
        "added_words": [
            TEST_WORD_UNIT_1, 
            TEST_WORD_UNIT_2, 
            TEST_WORD_UNIT_3,
            TEST_WORD_UNIT_4,
            TEST_WORD_UNIT_5
        ],
        "remove_words": [TEST_WORD_UNIT_2, TEST_WORD_UNIT_4],
        "remain_words": [TEST_WORD_UNIT_1, TEST_WORD_UNIT_3, TEST_WORD_UNIT_5],
    }
])
async def test_remove_words(client, auth_headers, test_case):
    headers = auth_headers
    response = client.post(
        "/api/vocabnet/createdata", 
        headers=headers, 
        json={"words": test_case["added_words"]}
    )
    assert response.status_code == 200

    wrong_user_remove = {**test_case["remove_words"][0], "username" : TEST_USERNAME2}
    response = client.post(
        "/api/vocabnet/removedata", 
        headers=headers, 
        json={"words": [wrong_user_remove]}
    )
    assert response.status_code == 400

    response = client.post(
        "/api/vocabnet/removedata", 
        headers=headers, 
        json={"words" : test_case["remove_words"]}
    )
    assert response.status_code == 200

    response = client.get("/api/vocabnet/getdata", headers=headers)
    assert response.status_code == 200
    assert response.json()["user"]["username"] == TEST_USERNAME
    assert equal_words(response.json()["words"], test_case["remain_words"])

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
                {**TEST_WORD_UNIT_1, "username": username}, 
                {**TEST_WORD_UNIT_2, "username": username}, 
                {**TEST_WORD_UNIT_3, "username": username},
                {**TEST_WORD_UNIT_4, "username": username},
                {**TEST_WORD_UNIT_5, "username": username}
            ]

            response = await client.post(
                "/api/vocabnet/createdata",
                headers=headers,
                json={"words": added_words}
            )
            assert response.status_code == 200

            # Step 4: Remove a Word
            await asyncio.sleep(RANDOM_DELAY * random.random())
            removed_words = [
                {**TEST_WORD_UNIT_2, "username": username}, 
                {**TEST_WORD_UNIT_4, "username": username}
            ]
            response = await client.post(
                "/api/vocabnet/removedata",
                headers=headers,
                json={"words": removed_words}
            )
            assert response.status_code == 200

            # Step 5: Fetch Data and Verify
            await asyncio.sleep(RANDOM_DELAY * random.random())
            remain_words = [
                {**TEST_WORD_UNIT_1, "username": username}, 
                {**TEST_WORD_UNIT_3, "username": username}, 
                {**TEST_WORD_UNIT_5, "username": username}
            ]
            response = await client.get("/api/vocabnet/getdata", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["user"]["username"] == username
            assert equal_words(data["words"], remain_words)

        # Run multiple user flows concurrently
        tasks = [asyncio.create_task(user_flow(i)) for i in range(NUM_USERS)]
        await asyncio.gather(*tasks)


@pytest.mark.asyncio
@pytest.mark.parametrize("test_case", [
    {
        "added_words": [TEST_WORD_UNIT_1, TEST_WORD_UNIT_2],
        "added_edges": [TEST_EDGE_1_TO_2]
    }, {
        "added_words": [TEST_WORD_UNIT_1, TEST_WORD_UNIT_2, TEST_WORD_UNIT_3],
        "added_edges": [TEST_EDGE_1_TO_3, TEST_EDGE_1_TO_2]
    }, {
        "added_words": [TEST_WORD_UNIT_1, TEST_WORD_UNIT_2, TEST_WORD_UNIT_3],
        "added_edges": [TEST_EDGE_2_TO_3, TEST_EDGE_1_TO_3, TEST_EDGE_1_TO_2]
    }
])
async def test_add_edges(client, auth_headers, test_case):
    headers = auth_headers
    response = client.post(
        "/api/vocabnet/createdata", 
        headers=headers, 
        json={
            "words": test_case["added_words"],
            "edges": test_case["added_edges"]
        }
    )
    assert response.status_code == 200, (f"response.json(): {response.json()}")

    response = client.get("/api/vocabnet/getdata", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["username"] == TEST_USERNAME
    assert equal_words(data["words"], test_case["added_words"])
    assert equal_edges(data["edges"], test_case["added_edges"])
    