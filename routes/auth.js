//Create a /routes/auth.js file. In the file create a POST /login route which is protected by the local strategy you just created. 

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); 

const {JWT_SECRET, JWT_EXPIRY} = require('../config');

const User = require('../models/user');

const router = express.Router();

router.post('/', function (req, res) {
  const authToken = createAuthToken(req.user); //contains password but toJSON() will get rid of it 
  return res.json({authToken});
});
// we pass in localAuth as a middleware fn that will check if the user can log in or not - if they cant, then the middlware handles it and it never gets into line 19. Otherwise, passes it back to us, including a req.user so we can now acccess that and know who's logged in. 

//this creates a new token 
router.post('/refresh', (req, res) => {
  const authToken = createAuthToken(req.user);
  res.json({ authToken });
});

function createAuthToken(user){
  return jwt.sign({user}, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY
  });
}

module.exports = router;