from fastapi import FastAPI, HTTPException, Depends, status
from auth_service import AuthService
from credentials import MONGO_URI, DB_NAME, DEBUG_DB_NAME
from vocab_types import Token, UserInfo, RegisterResponse
from contextlib import asynccontextmanager
import motor.motor_asyncio

DEBUG_MODE = True

@asynccontextmanager
async def lifespan(app: FastAPI):
    mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    app.state.mongo_client = mongo_client
    CHOSEN_DB = DEBUG_DB_NAME if DEBUG_MODE else DB_NAME
    app.state.auth_service = AuthService(mongo_client[CHOSEN_DB])  
    yield
    app.state.mongo_client.close()

app = FastAPI(lifespan=lifespan)

@app.get("/api/vocabnet/test")
async def test():
    return {
        "message" : "request received"
    }

@app.post("/api/vocabnet/register", status_code=status.HTTP_201_CREATED, response_model=RegisterResponse)
async def register_user(user_data: UserInfo):
    return await app.state.auth_service.register_user(user_data)

async def get_current_user():
    return await app.state.auth_service.get_current_user()

@app.get("/api/vocabnet/user/me")
async def get_user_me(user: UserInfo = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Token not found")
    return {"user" : user}

@app.post("/api/vocabnet/login", response_model=Token)
async def login(user_data: UserInfo):
    if user := await app.state.auth_service.authenticate_user(user_data.username, user_data.password):
        return {
            "access_token": app.state.auth_service.create_access_token(user.username),
            "token_type": "bearer"
        }

    raise HTTPException(
        status_code=401,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 
