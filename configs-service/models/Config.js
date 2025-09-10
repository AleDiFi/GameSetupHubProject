const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  game: {type:String, required:true, index:true},
  description: String,
  content: String,
  tags: [String],
  author: {
    id: String,
    username: String
  },
  likes: {type:Number, default:0},
  likedBy: [String],
  comments: [
    {
      authorId: String,
      authorName: String,
      text: String,
      createdAt: {type:Date, default:Date.now}
    }
  ],
  versions: [
    {
      content: String,
      createdAt: {type:Date, default:Date.now}
    }
  ]
},{timestamps:true});

// text index for search
ConfigSchema.index({game:'text', description:'text', content:'text', tags:'text'});

// convenience method: add version
ConfigSchema.methods.addVersion = function(newContent){
  this.versions = this.versions || [];
  this.versions.push({content:newContent, createdAt: new Date()});
};

module.exports = mongoose.model('Config', ConfigSchema);
