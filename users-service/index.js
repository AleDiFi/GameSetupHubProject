const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gamesetuphub';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

mongoose.connect(MONGO_URI).then(()=>{
  console.log('Users-service connected to Mongo');
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

// Register
app.post('/api/auth/register', async (req,res)=>{
  const {username,password} = req.body;
  if(!username || !password) return res.status(400).json({error:'username and password required'});
  const existing = await User.findOne({username});
  if(existing) return res.status(409).json({error:'username taken'});
  const hash = await bcrypt.hash(password,10);
  const user = new User({username,password:hash});
  await user.save();
  res.json({id:user._id,username:user.username, profile:user.profile});
});

// Login
app.post('/api/auth/login', async (req,res)=>{
  const {username,password} = req.body;
  const user = await User.findOne({username});
  if(!user) return res.status(401).json({error:'invalid credentials'});
  const ok = await bcrypt.compare(password,user.password);
  if(!ok) return res.status(401).json({error:'invalid credentials'});
  const token = jwt.sign({id:user._id,username:user.username}, JWT_SECRET, {expiresIn:'7d'});
  res.json({token});
});

// Get current user from token
app.get('/api/auth/me', authMiddleware, async (req,res)=>{
  const user = await User.findById(req.user.id).select('-password');
  if(!user) return res.status(404).json({error:'user not found'});
  res.json(user);
});

// Get public profile
app.get('/api/users/:id', async (req,res)=>{
  const user = await User.findById(req.params.id).select('username profile createdAt');
  if(!user) return res.status(404).json({error:'not found'});
  res.json(user);
});

// Update profile (only owner)
app.put('/api/users/:id', authMiddleware, async (req,res)=>{
  if(req.user.id !== req.params.id) return res.status(403).json({error:'forbidden'});
  const {displayName,bio,password} = req.body;
  const user = await User.findById(req.params.id);
  if(!user) return res.status(404).json({error:'not found'});
  if(displayName !== undefined) user.profile.displayName = displayName;
  if(bio !== undefined) user.profile.bio = bio;
  if(password){
    user.password = await bcrypt.hash(password,10);
  }
  await user.save();
  res.json({id:user._id,username:user.username,profile:user.profile});
});

app.get('/health', (req,res)=>res.send('ok'));

const port = process.env.PORT || 4001;
app.listen(port, ()=>console.log('Users-service listening on',port));
