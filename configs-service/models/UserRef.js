const mongoose = require('mongoose');

const UserRefSchema = new mongoose.Schema({
  id: String,
  username: String
});

module.exports = mongoose.model('UserRef', UserRefSchema);
