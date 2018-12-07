'use strict';

//Passport Local Strategy that finds the user and validates the password. 

//Require passport-local in the file and set the Strategy property to a local variable named LocalStrategy using object destructuring.
const { Strategy: LocalStrategy } = require('passport-local');
const User = require('../models/user');

//There's no express here, so there's no calling next. 

// ===== Define and create basicStrategy =====
const localStrategy = new LocalStrategy((username, password, done) => {
  let user;

  //Question: how can the client ever grab the below info? By the time it gets to our custom error handler, it no longer has access to err.location, and err.message has changed (I think bc of done) 
  User.findOne({ username })
    .then(results => {
      user = results;
      if (!user) {
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect username',
          location: 'username',
          status: 401,
        });
      }
      return user.validatePassword(password);
    })
    .then(isValid => {
      if (!isValid) {
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect password',
          location: 'password',
          status: 401,
        });
      }
      return done(null, user); //no error, valid user. login success - sets `req.user = user` which will be used later to assign the user a token 
    })
    .catch(err => {
      console.log('THE error in local.js is:', err, 'and the status is:', err.status);//status is not set yet 
      if (err.reason === 'LoginError') {
        return done(err);
        // return done(null, false); //no error, but invalid user - jump to our error handler (bc we said failWithError:true). After this, its status gets set to 401
      }
      return done(err); //if theres an internal error, jump to our error handler
    });
});

module.exports = localStrategy;

//JWT will actually protect our endpoints, LocalAuth is just for the login endpoint 