import logging
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import bcrypt
from db import db
import credentials
import motor.motor_asyncio
import pymongo
from contextlib import asynccontextmanager

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/vocabnet/login")


# Database setup
async def setup_database():
    client = motor.motor_asyncio.AsyncIOMotorClient(
        credentials.MONGO_URI,
        maxPoolSize=50,  # Adjust based on your needs
        minPoolSize=10,
        maxIdleTimeMS=30000,  # Close idle connections after 30 seconds
        serverSelectionTimeoutMS=5000  # Timeout for server selection
    )
    db_instance = client[DB_NAME]
    try:
        await db_instance.users.create_index("username", unique=True)
    except pymongo.errors.DuplicateKeyError:
        await db_instance.users.drop_index("username_1")
        await db_instance.users.create_index("username", unique=True)
    return client

# Application lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events"""
    # Startup: Set up database connection
    app.state.db = await setup_database()
    app.state.auth_service = AuthService(app.state.db)
    yield
    # Shutdown: Close database connection
    app.state.db.close()

# Create FastAPI app with lifespan
app = FastAPI(lifespan=lifespan)

# Routes
@app.post("/api/vocabnet/register", status_code=status.HTTP_201_CREATED, response_model=UserCreate)
async def register_user(user_data: UserCreate):
    if len(user_data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not user_data.username.isalnum():
        raise HTTPException(status_code=400, detail="Username must be alphanumeric")
    
    try:
        async with app.state.auth_service.get_db_session() as session:
            async with session.start_transaction():
                users = app.state.db[DB_NAME].users
                # Check if username exists within the transaction
                if await users.find_one({"username": user_data.username}, session=session):
                    raise HTTPException(status_code=400, detail="Username already exists")
                
                user_dict = user_data.dict(exclude={"password"})
                user_dict["hashed_password"] = app.state.auth_service.get_password_hash(user_data.password)
                await users.insert_one(user_dict, session=session)
                return user_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/vocabnet/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if user := await app.state.auth_service.authenticate_user(form_data.username, form_data.password):
        return {
            "access_token": app.state.auth_service.create_access_token(user.username),
            "token_type": "bearer"
        }
    raise HTTPException(
        status_code=401,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

# For testing
def set_test_db(test_db):
    """Set up the test database and auth service"""
    global DB_NAME
    DB_NAME = test_db.name  # Use the test database name
    app.state.db = test_db.client
    app.state.auth_service = AuthService(app.state.db)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 

