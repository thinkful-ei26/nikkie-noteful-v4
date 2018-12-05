'use strict';

const {JWT_SECRET} = require('../config');

const {Strategy: JwtStrategy, ExtractJwt} = require('passport-jwt');

const options = {
  secretOrKey: JWT_SECRET,
  //Look for the JWT as a Bearer auth header
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
  //// Only allow HS256 tokens - the same as the ones we issue
  algorithms: ['HS256']
};

const jwtStrategy = new JwtStrategy(options, (payload, done) => {
  //QUESTION: where does payload come from? Need clarification on this process
  //// The following line accepts the JWT and sets `req.user = user`
  done(null, payload.user); //// JWT is valid - sets `req.user = payload.user`
  //this validates whether or not the user has a valid token by calling .verify behind the scenes - if that fails it won't return payload.user?...
});

module.exports = jwtStrategy; 