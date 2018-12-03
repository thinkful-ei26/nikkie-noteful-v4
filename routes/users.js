'use strict';

const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/user');

const router = express.Router();

// POST endpoint to create a user//
// The endpoint creates a new user in the database and responds with a 201 status, a location header and a JSON representation of the user without the password.
router.post('/', (req,res,next) => {
  const {fullname = '', username, password} = req.body;
  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullname
      };
      return User.create(newUser);
    })
    .then(result => {
      return res.status(201).location(`http://${req.headers.host}/api/folders//${result.id}`).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;