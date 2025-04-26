from pydantic import BaseModel, ConfigDict
from typing import Optional

ACCESS_TOKEN_EXPIRE_DAYS = 7
ALGORITHM = "HS256"
MAX_NAME_LENGTH = 100
NEO4J_MAX_RETRIES = 6
NEO4J_RETRY_DELAY = 1.0

class Token(BaseModel):
    access_token: str
    token_type: str

class UserInfo(BaseModel):
    username: str
    password: Optional[str] = None 
    hashed_password: Optional[str] = None 

class RegisterResponse(BaseModel):
    username: str 
    register_success: bool

class Edge(BaseModel):
    model_config = ConfigDict(extra='allow')
    edge_name: str
    from_name: str 
    to_name: str
    username: str
    double_edge: Optional[bool] = False 

class Word(BaseModel):
    model_config = ConfigDict(extra='allow')
    name: str 
    username: str
    outgoing: Optional[list[Edge]] = []
    incoming: Optional[list[Edge]] = []

class DataCreateRequest(BaseModel):
    words: list[Word] = []
    edges: list[Edge] = [] 
    tags: list[str] = []

class DataRemoveRequest(BaseModel):
    words: list[Word] = []
    edges: list[Edge] = [] 
    tags: list[str] = []

class ClearTestRequest(BaseModel):
    key: str
