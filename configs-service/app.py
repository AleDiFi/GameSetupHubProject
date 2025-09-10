from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from jose import jwt, JWTError
import os
from bson import ObjectId

app = FastAPI()
MONGO_URI = os.getenv('MONGO_URI','mongodb://mongo:27017/gamesetuphub')
JWT_SECRET = os.getenv('JWT_SECRET','dev_secret')
client = AsyncIOMotorClient(MONGO_URI)
db = client.get_default_database()

def objid(x):
    try:
        return ObjectId(x)
    except:
        return None

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail='missing auth')
    token = authorization.replace('Bearer ','')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except JWTError:
        raise HTTPException(status_code=401, detail='invalid token')
    return {'id': payload.get('id'), 'username': payload.get('username')}

class ConfigIn(BaseModel):
    game: str
    description: Optional[str]
    content: str
    tags: Optional[List[str]] = []

class CommentIn(BaseModel):
    text: str

@app.get('/health')
async def health():
    return 'ok'

@app.post('/api/configs')
async def create_config(data: ConfigIn, user=Depends(get_current_user)):
    doc = dict(game=data.game, description=data.description, content=data.content, tags=data.tags or [], author={'id':user['id'],'username':user['username']}, likes=0, likedBy=[], comments=[], versions=[{'content':data.content}])
    res = await db.configs.insert_one(doc)
    doc['_id'] = str(res.inserted_id)
    return doc

@app.get('/api/configs')
async def list_configs(q: Optional[str]=None, game: Optional[str]=None, tag: Optional[str]=None, sort: Optional[str]=None, page:int=1, limit:int=20):
    filter = {}
    if game:
        filter['game'] = {'$regex': game, '$options':'i'}
    if tag:
        filter['tags'] = tag
    if q:
        filter['$text'] = {'$search': q}
    cursor = db.configs.find(filter)
    if sort == 'popular':
        cursor = cursor.sort('likes', -1)
    else:
        cursor = cursor.sort('createdAt', -1)
    total = await db.configs.count_documents(filter)
    results = []
    skip = (max(1,page)-1)*limit
    async for doc in cursor.skip(skip).limit(limit):
        doc['id'] = str(doc['_id'])
        results.append(doc)
    return {'total': total, 'page': page, 'pageSize': limit, 'results': results}

@app.get('/api/configs/{id}')
async def get_config(id: str):
    o = objid(id)
    if not o:
        raise HTTPException(status_code=400, detail='invalid id')
    doc = await db.configs.find_one({'_id': o})
    if not doc:
        raise HTTPException(status_code=404, detail='not found')
    doc['id'] = str(doc['_id'])
    return doc

@app.put('/api/configs/{id}')
async def update_config(id: str, data: ConfigIn, user=Depends(get_current_user)):
    o = objid(id)
    if not o: raise HTTPException(status_code=400, detail='invalid id')
    doc = await db.configs.find_one({'_id': o})
    if not doc: raise HTTPException(status_code=404, detail='not found')
    if doc.get('author',{}).get('id') != user['id']: raise HTTPException(status_code=403, detail='forbidden')
    # push old content to versions
    await db.configs.update_one({'_id': o}, {'$push': {'versions': {'content': doc.get('content')}}})
    updated = {'game': data.game, 'description': data.description, 'content': data.content, 'tags': data.tags or []}
    await db.configs.update_one({'_id': o}, {'$set': updated})
    doc = await db.configs.find_one({'_id': o})
    doc['id'] = str(doc['_id'])
    return doc

@app.delete('/api/configs/{id}')
async def delete_config(id: str, user=Depends(get_current_user)):
    o = objid(id)
    if not o: raise HTTPException(status_code=400, detail='invalid id')
    doc = await db.configs.find_one({'_id': o})
    if not doc: raise HTTPException(status_code=404, detail='not found')
    if doc.get('author',{}).get('id') != user['id']: raise HTTPException(status_code=403, detail='forbidden')
    await db.configs.delete_one({'_id': o})
    return {'deleted': True}

@app.post('/api/configs/{id}/versions')
async def add_version(id: str, payload: ConfigIn, user=Depends(get_current_user)):
    o = objid(id)
    if not o: raise HTTPException(status_code=400, detail='invalid id')
    doc = await db.configs.find_one({'_id': o})
    if not doc: raise HTTPException(status_code=404, detail='not found')
    if doc.get('author',{}).get('id') != user['id']: raise HTTPException(status_code=403, detail='forbidden')
    await db.configs.update_one({'_id': o}, {'$push': {'versions': {'content': payload.content}}})
    doc = await db.configs.find_one({'_id': o})
    return {'versions': doc.get('versions', [])}

@app.get('/api/configs/{id}/versions')
async def list_versions(id: str):
    o = objid(id)
    if not o: raise HTTPException(status_code=400, detail='invalid id')
    doc = await db.configs.find_one({'_id': o}, {'versions':1})
    if not doc: raise HTTPException(status_code=404, detail='not found')
    return doc.get('versions', [])

@app.post('/api/configs/{id}/comments')
async def add_comment(id: str, payload: CommentIn, user=Depends(get_current_user)):
    o = objid(id)
    if not o: raise HTTPException(status_code=400, detail='invalid id')
    await db.configs.update_one({'_id': o}, {'$push': {'comments': {'authorId': user['id'], 'authorName': user['username'], 'text': payload.text}}})
    doc = await db.configs.find_one({'_id': o}, {'comments':1})
    return {'comments': doc.get('comments', [])}

@app.get('/api/configs/{id}/comments')
async def list_comments(id: str):
    o = objid(id)
    if not o: raise HTTPException(status_code=400, detail='invalid id')
    doc = await db.configs.find_one({'_id': o}, {'comments':1})
    if not doc: raise HTTPException(status_code=404, detail='not found')
    return doc.get('comments', [])

@app.post('/api/configs/{id}/like')
async def like(id: str, user=Depends(get_current_user)):
    o = objid(id)
    if not o: raise HTTPException(status_code=400, detail='invalid id')
    doc = await db.configs.find_one({'_id': o})
    if not doc: raise HTTPException(status_code=404, detail='not found')
    likedBy = doc.get('likedBy', [])
    if user['id'] in likedBy:
        return {'likes': len(likedBy)}
    likedBy.append(user['id'])
    await db.configs.update_one({'_id': o}, {'$set': {'likedBy': likedBy, 'likes': len(likedBy)}})
    doc = await db.configs.find_one({'_id': o})
    return {'likes': doc.get('likes',0)}

@app.post('/api/configs/{id}/unlike')
async def unlike(id: str, user=Depends(get_current_user)):
    o = objid(id)
    if not o: raise HTTPException(status_code=400, detail='invalid id')
    doc = await db.configs.find_one({'_id': o})
    if not doc: raise HTTPException(status_code=404, detail='not found')
    likedBy = doc.get('likedBy', [])
    likedBy = [x for x in likedBy if x != user['id']]
    await db.configs.update_one({'_id': o}, {'$set': {'likedBy': likedBy, 'likes': len(likedBy)}})
    doc = await db.configs.find_one({'_id': o})
    return {'likes': doc.get('likes',0)}
