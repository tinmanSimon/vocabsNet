from pydantic import BaseModel, ConfigDict
from typing import Optional

ACCESS_TOKEN_EXPIRE_DAYS = 7
ALGORITHM = "HS256"
MAX_NAME_LENGTH = 100
TEST_USERNAME = "najksdfujweqhdjsbhf"
TEST_PWD = "pwqaASDFuwe278336"

TEST_SEMANTIC_UNITS_1 = [
    {
        "name": "philosophy",
        "username": TEST_USERNAME,
        "notes": "A key concept in ancient Greece"
    }
]

TEST_SEMANTIC_UNITS_2 = [
    {
        "name": "philosophy",
        "username": TEST_USERNAME,
        "notes": "A key concept in ancient Greece"
    },
    {
        "name": "stoicism" ,
        "username": TEST_USERNAME,
        "notes": "I practice this daily"
    }
]

TEST_SEMANTIC_UNITS_3 = [
    {
        "name": "philosophy",
        "username": TEST_USERNAME,
        "notes": "A key concept in ancient Greece"
    },
    {
        "name": "stoicism" ,
        "username": TEST_USERNAME,
        "notes": "I practice this daily"
    },
    {
        "name": "nihilism" ,
        "username": TEST_USERNAME,
        "star" : True
    }
]

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

class DataCreateRequest(BaseModel):
    semantic_units: list[SemanticUnit] = []
    edges: list[str] = [] 
    tags: list[str] = []

class DataRemoveRequest(BaseModel):
    semantic_units: list[SemanticUnit] = []
    edges: list[str] = [] 
    tags: list[str] = []