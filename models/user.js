'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

userSchema.methods.validatePassword = function(incomingPassword){
  return bcrypt.compare(incomingPassword, this.password); //order makes a difference
  //this refers to a specific instance aka a specific user
};

userSchema.statics.hashPassword = function(incomingPassword){
  const digest = bcrypt.hash(incomingPassword, 10); //10 says how many rounds of salting we should implement
  return digest;
};

const User = mongoose.model('User', userSchema);

module.exports = User;