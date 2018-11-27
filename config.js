'use strict';

module.exports = {
  PORT: process.env.PORT || 8080,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/noteful'
};

//MONGODB_URI is used by Heroku's mLab Add-On which minimizes the number of changes when deploying