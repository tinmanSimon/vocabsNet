import asyncio
import json
import aiohttp
import pytest
from server import app, AuthService, UserCreate, set_test_db
from db import db
import uvicorn
import multiprocessing
import time
import logging
import motor.motor_asyncio
from credentials import MONGO_URI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_auth")

# Test configuration
TEST_PORT = 8004
TEST_DB_NAME = "vocabnet_test"
TEST_USER = {
    "username": "testuser",
    "full_name": "Test User",
    "password": "testpass123"
}

def run_test_server():
    """Run the test server in a separate process"""
    # Set up test database
    test_db = db[TEST_DB_NAME]
    set_test_db(test_db)
    uvicorn.run(app, host="0.0.0.0", port=TEST_PORT, log_level="info")

async def wait_for_server():
    """Wait for the server to be ready"""
    for _ in range(10):  # Try for 10 seconds
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"http://localhost:{TEST_PORT}/docs") as response:
                    if response.status == 200:
                        return True
        except:
            await asyncio.sleep(1)
    return False

@pytest.fixture(scope="session")
def server_process():
    """Start test server and cleanup after tests"""
    # Clean up test database before starting server
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(client.vocabnet_test.users.delete_many({}))
    client.close()
    
    # Start server in a separate process
    process = multiprocessing.Process(target=run_test_server)
    process.start()
    
    # Give the server time to start
    if not loop.run_until_complete(wait_for_server()):
        process.terminate()
        raise Exception("Server failed to start")
    
    yield process
    
    # Cleanup
    process.terminate()
    process.join()
    loop.close()

async def make_request(method, url, **kwargs):
    """Helper function to make HTTP requests"""
    async with aiohttp.ClientSession() as session:
        async with session.request(method, f"http://localhost:{TEST_PORT}{url}", **kwargs) as response:
            return {
                "status": response.status,
                "json": await response.json() if response.content_type == "application/json" else None
            }

@pytest.mark.asyncio
async def test_register_user(server_process):
    """Test user registration"""
    # Clear any existing test data
    test_db = db[TEST_DB_NAME]
    await test_db.users.delete_many({})
    
    # Test registration
    response = await make_request(
        "POST",
        "/api/vocabnet/users",
        json={
            "username": TEST_USER["username"],
            "full_name": TEST_USER["full_name"],
            "password": TEST_USER["password"]
        }
    )
    
    assert response["status"] == 201
    data = response["json"]
    assert data["username"] == TEST_USER["username"]
    assert data["full_name"] == TEST_USER["full_name"]

@pytest.mark.asyncio
async def test_register_duplicate_user(server_process):
    """Test registering a duplicate username"""
    response = await make_request(
        "POST",
        "/api/vocabnet/users",
        json={
            "username": TEST_USER["username"],
            "full_name": "Another User",
            "password": "anotherpass123"
        }
    )
    
    assert response["status"] == 400
    assert response["json"]["detail"] == "Username already exists"

@pytest.mark.asyncio
async def test_login_success(server_process):
    """Test successful login"""
    response = await make_request(
        "POST",
        "/api/vocabnet/login",
        data={
            "username": TEST_USER["username"],
            "password": TEST_USER["password"]
        }
    )
    
    assert response["status"] == 200
    data = response["json"]
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_wrong_password(server_process):
    """Test login with wrong password"""
    response = await make_request(
        "POST",
        "/api/vocabnet/login",
        data={
            "username": TEST_USER["username"],
            "password": "wrongpassword"
        }
    )
    
    assert response["status"] == 401
    assert response["json"]["detail"] == "Incorrect username or password"

@pytest.mark.asyncio
async def test_login_nonexistent_user(server_process):
    """Test login with nonexistent user"""
    response = await make_request(
        "POST",
        "/api/vocabnet/login",
        data={
            "username": "nonexistent",
            "password": "somepassword"
        }
    )
    
    assert response["status"] == 401
    assert response["json"]["detail"] == "Incorrect username or password"

if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 