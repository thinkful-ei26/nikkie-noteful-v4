'use strict';

const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/user');

const router = express.Router();

// POST endpoint to create a user//
// The endpoint creates a new user in the database and responds with a 201 status, a location header and a JSON representation of the user without the password.
//Note, you will add input validation later in the challenge, after adding Bcryptjs. For now, focus on creating the ability to insert a new user.
router.post('/', (req,res,next) => {
  const {fullname = '', username, password} = req.body;
  const newUser = {fullname, username, password};
  User.create(newUser)
    .then(user => {
      console.log('HERE');
      return res.status(201).location(`http://${req.headers.host}/api/users/${user.id}`).json(user);
    })
    .catch(err=>{
      next(err);
    });
});

module.exports = router;