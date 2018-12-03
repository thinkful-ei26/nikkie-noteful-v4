//Create a /routes/auth.js file. In the file create a POST /login route which is protected by the local strategy you just created. 

'use strict';

const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/user');

const router = express.Router();

const passport = require('passport');

//QUESTION: clarify what the two lines below do 
const options = {session: false, failWithError: true}; //instead of sending a response, it'll throw an error if theres a auth error - text body vs json body 
const localAuth = passport.authenticate('local', options); //this is going to use local auth (tomorrow will be jwt)

router.post('/', localAuth, function (req, res) {
  return res.json(req.user);
});
// we pass in localAuth as a middleware fn that will check if the user can log in or not - if they cant, then the middlware handles it and it never gets into line 19. Otherwise, passes it back to us, including a req.user so we can now acccess that and know who's logged in. 

module.exports = router;