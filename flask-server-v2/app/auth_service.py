from fastapi import FastAPI, HTTPException, status
import bcrypt
import jwt
from core.vocab_types import Token, UserInfo, ACCESS_TOKEN_EXPIRE_DAYS, ALGORITHM
import aiorwlock
from app.vocab_logger import logger
from core.credentials import JWT_SECRET_KEY
from datetime import datetime, timezone, timedelta
from neo4j import AsyncTransaction

class AuthService:
    # database is mongoDB database
    def __init__(self, neo4j_driver):
        self._driver = neo4j_driver

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    def get_password_hash(self, password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def create_access_token(self, username: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
        return jwt.encode({"sub": username, "exp": expire}, JWT_SECRET_KEY, algorithm=ALGORITHM)

    async def _get_neo4j_user(self, tx: AsyncTransaction, username: str):
        result = await tx.run(
            "MATCH (u:User {username: $username}) "
            "RETURN u",
            {"username": username}
        )
        if record := await result.single():
            user_node = record["u"]
            user_props = dict(user_node)
            return UserInfo(**user_props)
        return None

    async def get_user(self, username: str):
        async with self._driver.session() as session:
            return await session.execute_read(self._get_neo4j_user, username) 

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

    async def _validate_register_userdata(self, user_data: UserInfo):
        if len(user_data.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        if not user_data.username.isalnum():
            raise HTTPException(status_code=400, detail="Username must be alphanumeric")
        if user := await self.get_user(user_data.username):
            raise HTTPException(status_code=400, detail="Username already exists")
        return

    async def _create_user_tx(self, tx: AsyncTransaction, query: str, params: dict):
        logger.debug(f"Running _create_user_tx method...")
        result = await tx.run(query, params)
        record = await result.single()
        if record and record["created_username"] == params["username"]:
            return record["created_username"]
        else:
            logger.error(f"User creation for '{params.get('username')}' failed. Record: {record}")
            return None

    async def register_user(self, user_data: UserInfo):
        await self._validate_register_userdata(user_data)

        try:
            user_dict = user_data.model_dump(exclude={"password"})
            user_dict["hashed_password"] = self.get_password_hash(user_data.password)
            props_string = ", ".join([f"{key}: ${key}" for key in user_dict.keys()])
            query = (
                f"CREATE (u:User {{{props_string}}}) "
                "RETURN u.username AS created_username"
            )
            async with self._driver.session() as session:
                created_username = await session.execute_write(self._create_user_tx, query, user_dict)
            
            if created_username:
                return {
                    "username": created_username,
                    "register_success": True
                }
            else:
                raise HTTPException(status_code=500, detail="User registration failed after query execution.")

        except Exception as e:
            logger.error(f"Registration error: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
