from pydantic import BaseModel, ConfigDict
from typing import Optional

ACCESS_TOKEN_EXPIRE_DAYS = 7
ALGORITHM = "HS256"

class Token(BaseModel):
    access_token: str
    token_type: str

class UserInfo(BaseModel):
    username: str
    password: Optional[str] = None 
    hashed_password: Optional[str] = None 
    environment: Optional[str] = None 

class RegisterResponse(BaseModel):
    username: str 
    register_success: bool
    
class Word(BaseModel):
    model_config = ConfigDict(extra='allow')
    name: str 
