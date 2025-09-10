from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
from typing import Optional

app = FastAPI()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
MONGO_URI = os.getenv('MONGO_URI','mongodb://mongo:27017/gamesetuphub')
JWT_SECRET = os.getenv('JWT_SECRET','dev_secret')
client = AsyncIOMotorClient(MONGO_URI)
db = client.get_default_database()

class RegisterIn(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)

class LoginIn(BaseModel):
    username: str
    password: str

def hash_password(p):
    return pwd_context.hash(p)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

async def create_token(payload: dict):
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail='missing auth')
    token = authorization.replace('Bearer ','')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except JWTError:
        raise HTTPException(status_code=401, detail='invalid token')
    user = await db.users.find_one({'_id': payload.get('id')})
    if not user:
        raise HTTPException(status_code=404, detail='user not found')
    return user

@app.get('/health')
async def health():
    return 'ok'

@app.post('/api/auth/register')
async def register(data: RegisterIn):
    existing = await db.users.find_one({'username': data.username})
    if existing:
        raise HTTPException(status_code=409, detail='username taken')
    hashed = hash_password(data.password)
    res = await db.users.insert_one({'username': data.username, 'password': hashed, 'profile':{}})
    return {'id': str(res.inserted_id), 'username': data.username}

@app.post('/api/auth/login')
async def login(data: LoginIn):
    user = await db.users.find_one({'username': data.username})
    if not user or not verify_password(data.password, user['password']):
        raise HTTPException(status_code=401, detail='invalid credentials')
    token = await create_token({'id': str(user['_id']), 'username': user['username']})
    return {'token': token}

@app.get('/api/auth/me')
async def me(user=Depends(get_current_user)):
    user.pop('password', None)
    user['id'] = str(user['_id'])
    return user
