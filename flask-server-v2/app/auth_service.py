from fastapi import FastAPI, HTTPException, status
import bcrypt
import jwt
from core.vocab_types import Token, UserInfo, ACCESS_TOKEN_EXPIRE_DAYS, ALGORITHM
import aiorwlock
from app.vocab_logger import logger
from core.credentials import JWT_SECRET_KEY
from datetime import datetime, timezone, timedelta

class AuthService:
    # database is mongoDB database
    def __init__(self, database):
        self.db = database

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    def get_password_hash(self, password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def create_access_token(self, username: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
        return jwt.encode({"sub": username, "exp": expire}, JWT_SECRET_KEY, algorithm=ALGORITHM)

    async def get_user(self, username: str):
        if user_dict := await self.db.users.find_one({"username": username}):
            return UserInfo(
                username=user_dict["username"],
                hashed_password=user_dict["hashed_password"]
            )

    async def authenticate_user(self, username: str, password: str):
        if user := await self.get_user(username):
            if self.verify_password(password, user.hashed_password):
                return user
        return None

    async def get_current_user(self, token: str):
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

    async def register_user(self, user_data: UserInfo):
        if len(user_data.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        if not user_data.username.isalnum():
            raise HTTPException(status_code=400, detail="Username must be alphanumeric")
        if user := await self.get_user(user_data.username):
            raise HTTPException(status_code=400, detail="Username already exists")

        try:
            user_dict = user_data.model_dump(exclude={"password"})
            user_dict["hashed_password"] = self.get_password_hash(user_data.password)
            await self.db.users.insert_one(user_dict)
            return {
                "username" : user_data.username,
                "register_success" : True
            }
        except Exception as e:
            logger.error(f"Registration error: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
