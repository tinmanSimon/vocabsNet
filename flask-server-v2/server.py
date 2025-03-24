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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vocabnet")

# Configuration
DB_NAME = "vocabnet"
JWT_SECRET_KEY = credentials.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/vocabnet/login")

# Models
class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    username: str
    full_name: Optional[str] = None
    password: str

class UserInDB(BaseModel):
    username: str
    full_name: Optional[str] = None
    hashed_password: str

# Auth service
class AuthService:
    def __init__(self, database):
        self.db = database

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    def get_password_hash(self, password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def create_access_token(self, username: str) -> str:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        return jwt.encode({"sub": username, "exp": expire}, JWT_SECRET_KEY, algorithm=ALGORITHM)

    async def get_user(self, username: str):
        if user_dict := await self.db[DB_NAME].users.find_one({"username": username}):
            # Convert MongoDB document to UserInDB model
            return UserInDB(
                username=user_dict["username"],
                full_name=user_dict.get("full_name"),
                hashed_password=user_dict["hashed_password"]
            )

    async def authenticate_user(self, username: str, password: str):
        if user := await self.get_user(username):
            if self.verify_password(password, user.hashed_password):
                return user
        return None

    async def get_current_user(self, token: str = Depends(oauth2_scheme)):
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
            if user := await self.get_user(payload.get("sub")):
                return user
        except jwt.InvalidTokenError:
            pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    @asynccontextmanager
    async def get_db_session(self):
        """Get a database session for atomic operations"""
        session = await self.db.start_session()
        try:
            yield session
        finally:
            await session.end_session()

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

