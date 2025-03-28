from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import bcrypt
import jwt
from pydantics import Token, UserInfo

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/vocabnet/login")

class AuthService:
    # database is mongoDB database
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
        if user_dict := await self.db.users.find_one({"username": username}):
            return UserInfo(
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

    async def register_user(self, user_data: UserInfo):
        return {
            "username" : "alkjsd",
            "success" : True
        }
