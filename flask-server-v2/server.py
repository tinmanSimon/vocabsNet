import logging
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import Optional
import bcrypt
from db import db
import credentials
import motor.motor_asyncio
import pymongo

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vocabnet")

# MongoDB configuration
DB_NAME = "vocabnet"

# Authentication configuration
JWT_SECRET_KEY = credentials.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme for token handling
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/vocabnet/login")

# Pydantic models
class Token(BaseModel):
    access_token: str
    token_type: str

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    hashed_password: str

class AuthService:
    def __init__(self, database):
        self.db = database

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    def get_password_hash(self, password: str) -> str:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def create_access_token(self, data: dict):
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)

    async def get_user(self, username: str):
        users = self.db[DB_NAME].users
        if user_dict := await users.find_one({"username": username}):
            return UserInDB(**user_dict)

    async def authenticate_user(self, username: str, password: str):
        user = await self.get_user(username)
        if not user or not self.verify_password(password, user.hashed_password):
            return False
        return user

    async def get_current_user(self, token: str = Depends(oauth2_scheme)):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if not username:
                raise credentials_exception
        except jwt.InvalidTokenError:
            raise credentials_exception
        
        if user := await self.get_user(username):
            return user
        raise credentials_exception

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Database connection lifecycle"""
    # Connect to MongoDB
    app.state.db = motor.motor_asyncio.AsyncIOMotorClient(credentials.MONGO_URI)
    db_instance = app.state.db[DB_NAME]
    
    # Create username index if it doesn't exist
    try:
        await db_instance.users.create_index("username", unique=True)
    except pymongo.errors.DuplicateKeyError:
        # If index already exists with duplicates, drop and recreate
        await db_instance.users.drop_index("username_1")
        await db_instance.users.create_index("username", unique=True)
    
    yield
    
    # Close database connection
    app.state.db.close()

# Create FastAPI app
app = FastAPI(lifespan=lifespan)

# Initialize auth service with production database by default
auth_service = AuthService(db)

# Routes
@app.post("/api/vocabnet/users", status_code=status.HTTP_201_CREATED, response_model=UserBase)
async def register_user(user_data: UserCreate):
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    if not user_data.username.isalnum():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be alphanumeric"
        )
    
    try:
        users = auth_service.db[DB_NAME].users
        # Check if username already exists
        if await users.find_one({"username": user_data.username}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        user_dict = user_data.dict(exclude={"password"})
        user_dict["hashed_password"] = auth_service.get_password_hash(user_data.password)
        await users.insert_one(user_dict)
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.post("/api/vocabnet/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth_service.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# For testing purposes
def set_test_db(test_db):
    global auth_service
    auth_service = AuthService(test_db)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 

