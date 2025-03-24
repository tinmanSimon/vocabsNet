import asyncio
import aiohttp
import pytest
from server import app, AuthService, UserCreate, set_test_db
from db import db
import uvicorn
import multiprocessing
import motor.motor_asyncio
from credentials import MONGO_URI
from contextlib import asynccontextmanager

# Test configuration
TEST_PORT = 8004
TEST_DB_NAME = "vocabnet_test"
TEST_USER = {
    "username": "testuser",
    "full_name": "Test User",
    "password": "testpass123"
}

async def cleanup_test_db():
    """Clean up the test database"""
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    try:
        # Delete all documents in the users collection
        await client[TEST_DB_NAME].users.delete_many({})
        # Ensure the unique index exists
        await client[TEST_DB_NAME].users.create_index("username", unique=True)
    finally:
        client.close()

def run_test_server():
    """Run the test server in a separate process"""
    # Create a new client for the test database
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    test_db = client[TEST_DB_NAME]
    set_test_db(test_db)
    uvicorn.run(app, host="0.0.0.0", port=TEST_PORT, log_level="error")

async def wait_for_server():
    """Wait for the server to be ready"""
    for _ in range(10):
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
    # Clean up test database
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(cleanup_test_db())
    
    # Start server
    process = multiprocessing.Process(target=run_test_server)
    process.start()
    
    if not loop.run_until_complete(wait_for_server()):
        process.terminate()
        raise Exception("Server failed to start")
    
    yield process
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
    # Clean up before test
    await cleanup_test_db()
    
    response = await make_request(
        "POST",
        "/api/vocabnet/register",
        json=TEST_USER
    )
    
    print(f"\nRegistration response: {response}")  # Debug print
    
    assert response["status"] == 201
    data = response["json"]
    assert data["username"] == TEST_USER["username"]
    assert data["full_name"] == TEST_USER["full_name"]

@pytest.mark.asyncio
async def test_register_duplicate_user(server_process):
    """Test registering a duplicate username"""
    # Clean up before test
    await cleanup_test_db()
    
    # First registration
    await make_request(
        "POST",
        "/api/vocabnet/register",
        json=TEST_USER
    )
    
    # Try to register the same user again
    response = await make_request(
        "POST",
        "/api/vocabnet/register",
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
    # Clean up and register test user
    await cleanup_test_db()
    await make_request(
        "POST",
        "/api/vocabnet/register",
        json=TEST_USER
    )
    
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
    # Clean up and register test user
    await cleanup_test_db()
    await make_request(
        "POST",
        "/api/vocabnet/register",
        json=TEST_USER
    )
    
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
    # Clean up before test
    await cleanup_test_db()
    
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