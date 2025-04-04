from pydantic import BaseModel, ConfigDict
from typing import Optional

ACCESS_TOKEN_EXPIRE_DAYS = 7
ALGORITHM = "HS256"
MAX_NAME_LENGTH = 100
NEO4J_MAX_RETRIES = 6
NEO4J_RETRY_DELAY = 1.0
TEST_USERNAME = "najksdfujweqhdjsbhf"
TEST_USERNAME2 = "bweiaofhsadfjd"
TEST_PWD = "pwqaASDFuwe278336"

TEST_SEMANTIC_UNIT_1 = {
    "name": "philosophy",
    "username": TEST_USERNAME,
    "notes": "A key concept in ancient Greece"
}


TEST_SEMANTIC_UNIT_2 = {
    "name": "stoicism" ,
    "username": TEST_USERNAME,
    "notes": "I practice this daily"
}

TEST_SEMANTIC_UNIT_3 = {
    "name": "nihilism" ,
    "username": TEST_USERNAME,
    "star" : True
}

TEST_SEMANTIC_UNIT_4 = {
    "name": "existentialism" ,
    "username": TEST_USERNAME
}

TEST_SEMANTIC_UNIT_5 = {
    "name": "absurdism" ,
    "username": TEST_USERNAME,
    "belief" : "meaningless and irrational"
}


TEST_EDGE_1_TO_2 = {
    "edge_name": "edge_1" ,
    "from_name": "philosophy" ,
    "to_name": "stoicism" ,
    "username": TEST_USERNAME
}

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
    
class Word(BaseModel):
    model_config = ConfigDict(extra='allow')
    name: str 

# SemanticUnit is the intermediate node between User and Word.
class SemanticUnit(BaseModel):
    name: str 
    username: str
    model_config = ConfigDict(extra='allow')

class Edge(BaseModel):
    edge_name: str
    from_name: str 
    to_name: str
    username: str
    double_edge: Optional[bool] = False 

class DataCreateRequest(BaseModel):
    semantic_units: list[SemanticUnit] = []
    edges: list[Edge] = [] 
    tags: list[str] = []

class DataRemoveRequest(BaseModel):
    semantic_units: list[SemanticUnit] = []
    edges: list[Edge] = [] 
    tags: list[str] = []