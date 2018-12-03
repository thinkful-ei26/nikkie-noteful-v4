'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: String,
  username: {type: String, unique: true, required: true},
  password: {type: String, required: true},
});

// This is like using a serialize method
userSchema.set('toJSON', {
  virtuals: true,     // include built-in virtual `id`
  transform: (doc, result) => {
    delete result._id;
    delete result.__v;
    delete result.password; //dont want to give back the password in the response!
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;