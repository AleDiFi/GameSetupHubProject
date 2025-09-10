const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Config = require('./models/Config');
const User = require('./models/UserRef');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gamesetuphub';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

mongoose.connect(MONGO_URI).then(()=>{
  console.log('Configs-service connected to Mongo');
}).catch(err=>console.error(err));

function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'missing auth'});
  const token = auth.replace('Bearer ','');
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  }catch(e){
    return res.status(401).json({error:'invalid token'});
  }
}

// Create configuration
app.post('/api/configs', authMiddleware, async (req,res)=>{
  const {game,description,content,tags} = req.body;
  if(!game || !content) return res.status(400).json({error:'game and content required'});
  const cfg = new Config({game,description,content,tags,author:{id:req.user.id,username:req.user.username}});
  cfg.addVersion(content);
  await cfg.save();
  res.json(cfg);
});

// List/search with pagination
app.get('/api/configs', async (req,res)=>{
  const {q,game,tag,sort,page,limit} = req.query;
  const filter = {};
  if(game) filter.game = new RegExp(game,'i');
  if(tag) filter.tags = tag;
  if(q) filter.$text = {$search: q};
  let cursor = Config.find(filter);
  const pageNum = Math.max(1, parseInt(page)||1);
  const pageSize = Math.min(100, parseInt(limit)||20);
  if(sort==='popular') cursor = cursor.sort({likes:-1});
  else cursor = cursor.sort({createdAt:-1});
  const total = await Config.countDocuments(filter);
  const results = await cursor.skip((pageNum-1)*pageSize).limit(pageSize).exec();
  res.json({total, page:pageNum, pageSize, results});
});

// Read single config
app.get('/api/configs/:id', async (req,res)=>{
  const cfg = await Config.findById(req.params.id);
  if(!cfg) return res.status(404).json({error:'not found'});
  res.json(cfg);
});

// Update config (only author)
app.put('/api/configs/:id', authMiddleware, async (req,res)=>{
  const cfg = await Config.findById(req.params.id);
  if(!cfg) return res.status(404).json({error:'not found'});
  if(cfg.author.id !== req.user.id) return res.status(403).json({error:'forbidden'});
  const {description,content,tags} = req.body;
  if(description !== undefined) cfg.description = description;
  if(tags !== undefined) cfg.tags = tags;
  if(content !== undefined){
    cfg.addVersion(cfg.content);
    cfg.content = content;
  }
  await cfg.save();
  res.json(cfg);
});

// Delete config (only author)
app.delete('/api/configs/:id', authMiddleware, async (req,res)=>{
  const cfg = await Config.findById(req.params.id);
  if(!cfg) return res.status(404).json({error:'not found'});
  if(cfg.author.id !== req.user.id) return res.status(403).json({error:'forbidden'});
  await cfg.deleteOne();
  res.json({deleted:true});
});

// Add a version explicitly
app.post('/api/configs/:id/versions', authMiddleware, async (req,res)=>{
  const cfg = await Config.findById(req.params.id);
  if(!cfg) return res.status(404).json({error:'not found'});
  if(cfg.author.id !== req.user.id) return res.status(403).json({error:'forbidden'});
  const {content} = req.body;
  if(!content) return res.status(400).json({error:'content required'});
  cfg.addVersion(content);
  await cfg.save();
  res.json({versions:cfg.versions});
});

// List versions
app.get('/api/configs/:id/versions', async (req,res)=>{
  const cfg = await Config.findById(req.params.id).select('versions');
  if(!cfg) return res.status(404).json({error:'not found'});
  res.json(cfg.versions || []);
});

// Comments
app.post('/api/configs/:id/comments', authMiddleware, async (req,res)=>{
  const cfg = await Config.findById(req.params.id);
  if(!cfg) return res.status(404).json({error:'not found'});
  const {text} = req.body;
  if(!text) return res.status(400).json({error:'text required'});
  cfg.comments = cfg.comments || [];
  cfg.comments.push({authorId:req.user.id, authorName:req.user.username, text, createdAt: new Date()});
  await cfg.save();
  res.json({comments:cfg.comments});
});

app.get('/api/configs/:id/comments', async (req,res)=>{
  const cfg = await Config.findById(req.params.id).select('comments');
  if(!cfg) return res.status(404).json({error:'not found'});
  res.json(cfg.comments || []);
});

// Like (idempotent: a user can like only once; to unlike, remove from likedBy)
app.post('/api/configs/:id/like', authMiddleware, async (req,res)=>{
  const cfg = await Config.findById(req.params.id);
  if(!cfg) return res.status(404).json({error:'not found'});
  cfg.likedBy = cfg.likedBy || [];
  if(cfg.likedBy.includes(req.user.id)) return res.json({likes:cfg.likes});
  cfg.likedBy.push(req.user.id);
  cfg.likes = cfg.likedBy.length;
  await cfg.save();
  res.json({likes:cfg.likes});
});

// Unlike
app.post('/api/configs/:id/unlike', authMiddleware, async (req,res)=>{
  const cfg = await Config.findById(req.params.id);
  if(!cfg) return res.status(404).json({error:'not found'});
  cfg.likedBy = cfg.likedBy || [];
  cfg.likedBy = cfg.likedBy.filter(x=>x!==req.user.id);
  cfg.likes = cfg.likedBy.length;
  await cfg.save();
  res.json({likes:cfg.likes});
});

app.get('/health', (req,res)=>res.send('ok'));

const port = process.env.PORT || 4002;
app.listen(port, ()=>console.log('Configs-service listening on',port));
