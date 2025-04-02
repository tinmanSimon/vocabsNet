from fastapi import FastAPI, HTTPException, Depends, status
from app.auth_service import AuthService
from app.vocab_graph import VocabularyGraph
from app.vocab_logger import logger
from core.credentials import neo4j_uri, neo4j_username, neo4j_pwd
from core.vocab_types import Token, UserInfo, RegisterResponse, Word, SemanticUnit, DataCreateRequest
from contextlib import asynccontextmanager
import motor.motor_asyncio
from fastapi.security import OAuth2PasswordBearer
from neo4j import AsyncGraphDatabase


DEBUG_MODE = True
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/vocabnet/user/login")


@asynccontextmanager
async def lifespan(app: FastAPI):
    neo4j_driver = AsyncGraphDatabase.driver(neo4j_uri, auth=(neo4j_username, neo4j_pwd))
    app.state.neo4j_driver = neo4j_driver
    app.state.auth_service = AuthService(neo4j_driver)
    app.state.vocab_graph = VocabularyGraph(neo4j_driver)
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

async def add_semantic_units(semantic_units: list[SemanticUnit]):
    try:
        await app.state.vocab_graph.add_semantic_units(semantic_units)
    except ValueError as e:  
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post("/api/vocabnet/createdata")
async def createdata(request: DataCreateRequest, user: UserInfo = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Token not found")
    await add_semantic_units(request.semantic_units)
    return {"user" : user, "message": "Data created successfully"}

@app.get("/api/vocabnet/getdata")
async def getdata(user: UserInfo = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Token not found")
    semantic_units = await app.state.vocab_graph.get_data(user.username)
    return {"user" : user, "semantic_units" : semantic_units}
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 
