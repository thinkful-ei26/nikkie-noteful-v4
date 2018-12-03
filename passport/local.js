'use strict';

//create Passport Local Strategy that finds the user and validates the password. For now you will compare the plain-text passwords, later you will had bcryptjs to hash and compare the password.

//Require passport-local in the file and set the Strategy property to a local variable named LocalStrategy using object destructuring.
const { Strategy: LocalStrategy } = require('passport-local');
const User = require('../models/user');

// ===== Define and create basicStrategy =====
const localStrategy = new LocalStrategy((username, password, done) => {
  let user;
  User.findOne({ username })
    .then(results => {
      user = results;
      if (!user) {
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect username',
          location: 'username'
        });
      }
      const isValid = user.validatePassword(password);
      if (!isValid) {
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect password',
          location: 'password'
        });
      }
      return done(null, user);
    })
    .catch(err => {
      if (err.reason === 'LoginError') {
        return done(null, false); //QUESTION dont really get this here
      }
      return done(err);
    });
});