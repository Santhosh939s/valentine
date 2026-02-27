const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  interests: [{ type: String }],
  lookingFor: { type: String },
  bio: { type: String },
  profilePhoto: { type: String, default: 'default-profile.png' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
