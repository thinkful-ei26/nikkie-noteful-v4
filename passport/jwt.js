'use strict';

const {JWT_SECRET} = require('../config');

const {Strategy: JwtStrategy, ExtractJwt} = require('passport-jwt');

const options = {
  secretOrKey: JWT_SECRET,
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
  algorithms: ['HS256']
};

const jwtStrategy = new JwtStrategy(options, (payload, done) => {
  done(null, payload.user); //this validates whether or not the user has a valid token by calling .verify behind the scenes
});

module.exports = jwtStrategy; 