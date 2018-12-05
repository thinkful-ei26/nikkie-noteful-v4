'use strict';

//Passport Local Strategy that finds the user and validates the password. 

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
      return user.validatePassword(password);
    })
    .then(isValid => {
      if (!isValid) {
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect password',
          location: 'password'
        });
      }
      return done(null, user); //no error, valid user. login success - sets `req.user = user` which will be used later to assign the user a token 
    })
    .catch(err => {
      if (err.reason === 'LoginError') {
        return done(null, false); //no error, but invalid user - jump to our error handler (bc we said failWithError:true)
      }
      return done(err); //if theres an internal error, jump to our error handler
    });
});

module.exports = localStrategy;

//JWT will actually protect our endpoints, LocalAuth is just for the login endpoint 