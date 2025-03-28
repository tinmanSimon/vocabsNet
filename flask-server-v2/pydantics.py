from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class UserInfo(BaseModel):
    username: str
    full_name: Optional[str] = None
    password: str

class RegisterResponse(BaseModel):
    username: str 
    success: bool
    