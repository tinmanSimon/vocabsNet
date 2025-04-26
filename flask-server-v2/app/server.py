from fastapi import FastAPI, HTTPException, Depends, status
from app.auth_service import AuthService
from app.vocab_logger import logger
from app.graph_cache import GraphCacheManager
from app.graph_service import GraphService
from core.credentials import CLEAR_DATA_KEY
from core.vocab_types import (
    Token, UserInfo, RegisterResponse, Word, Edge, 
    DataCreateRequest, DataRemoveRequest, ClearTestRequest
)
from contextlib import asynccontextmanager
from fastapi.security import OAuth2PasswordBearer


DEBUG_MODE = True
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/vocabnet/user/login")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.graph_service = await GraphService.create()
    app.state.auth_service = AuthService(app.state.graph_service.get_database())  
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/api/vocabnet/test")
async def test():
    return {
        "message" : "request received"
    }

@app.post("/api/vocabnet/register", status_code=status.HTTP_201_CREATED, response_model=RegisterResponse)
async def register_user(user_data: UserInfo):
    return await app.state.auth_service.register_user(user_data)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    return await app.state.auth_service.get_current_user(token)

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

# creating data is sequential, because we might have new edges that are built on the
# new words, so we need to update the Graph before validating edges.
@app.post("/api/vocabnet/createdata")
async def createdata(request: DataCreateRequest, user: UserInfo = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Token not found")
    await app.state.graph_service.add_words(request.words, user)
    await app.state.graph_service.add_edges(request.edges, user)
    return {"user" : user, "message": "Data created successfully"}

# To remove data, all the info should be readily available in the graph.
# So we validate all data at once, and remove the necessary data all at once.
@app.post("/api/vocabnet/removedata")
async def removedata(request: DataRemoveRequest, user: UserInfo = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Token not found")
    await app.state.graph_service.remove_data(request, user)
    return {"user" : user, "message": "Data removed successfully"}
    
@app.get("/api/vocabnet/getdata")
async def getdata(user: UserInfo = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Token not found")
    user_data = await app.state.graph_service.get_data(user)
    if not isinstance(user_data, dict):
        raise HTTPException(status_code=500, detail="Invalid user data")
    return {
        "user" : user, 
        "words" : user_data.get("words", []),
        "edges" : user_data.get("edges", [])
    }

@app.post("/api/vocabnet/cleartestdata")
async def clear_test_data(request: ClearTestRequest):
    if request.key == CLEAR_DATA_KEY:
        await app.state.graph_service.clear_test_data()
        return {"message": "Test data cleared successfully"}
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
