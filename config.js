'use strict';

require('dotenv').config(); //this is what we used to set up the env variable for JWT_SECRET

module.exports = {
  PORT: process.env.PORT || 8080,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/noteful',
  TEST_MONGODB_URI: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/noteful-test',
  JWT_SECRET: process.env.JWT_SECRET, //this doesnt have a fallback so it has to get the value assigned in the env variable
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d'
};

//MONGODB_URI is used by Heroku's mLab Add-On which minimizes the number of changes when deploying