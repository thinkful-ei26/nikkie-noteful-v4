'use strict';

const express = require('express');

const User = require('../models/user');

const router = express.Router();

// POST endpoint to create a user//
router.post('/', (req,res,next) => {

  //First do a ton of validation 
  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));

  if (missingField) {
    const err = {
      message: `Missing '${missingField}' in request body`,
      reason: 'ValidationError',
      location: `${missingField}`,
      status: 422
    };
    return next(err);
  }

  const stringFields = ['username', 'password', 'fullname'];
  const nonStringField = stringFields.find(
    field => field in req.body && typeof req.body[field] !== 'string'
  );

  if (nonStringField) {
    const err = {
      message: 'Incorrect field type: expected string',
      reason: 'ValidationError',
      location: nonStringField,
      status: 422
    };
    return next(err);
  }

  // If the username and password aren't trimmed we give an error.  Users might expect that these will work without trimming. We need to reject such values explicitly so the users know what's happening, rather than silently trimming them and expecting the user to understand.
  // We'll silently trim the other fields, because they aren't credentials used to log in, so it's less of a problem. QUESTION: where do we actually do
  const explicityTrimmedFields = ['username', 'password'];
  const nonTrimmedField = explicityTrimmedFields.find(
    field => req.body[field].trim() !== req.body[field]
  );

  if (nonTrimmedField) {
    const err = {
      message: 'Cannot start or end with whitespace',
      reason: 'ValidationError',
      location: nonTrimmedField,
      status: 422
    };
    return next(err);
  }

  const sizedFields = {
    username: {
      min: 1
    },
    password: {
      min: 8,
      // bcrypt truncates after 72 characters, so let's not give the illusion of security by storing extra (unused) info
      max: 72
    }
  };

  const tooSmallField = Object.keys(sizedFields).find(
    field =>
      'min' in sizedFields[field] &&
            req.body[field].trim().length < sizedFields[field].min
  );
  const tooLargeField = Object.keys(sizedFields).find(
    field =>
      'max' in sizedFields[field] &&
            req.body[field].trim().length > sizedFields[field].max
  );

  if (tooSmallField || tooLargeField) {
    const message = tooSmallField
      ? `Must be at least ${sizedFields[tooSmallField]
        .min} characters long`
      : `Must be at most ${sizedFields[tooLargeField]
        .max} characters long`;

    const err = {
      message: message,
      reason: 'ValidationError',
      location: tooSmallField || tooLargeField,
      status: 422
    };    
    return next(err);
  }
 
  // // Username and password were validated as pre-trimmed, but we should trim the fullname
  let {fullname = '', username, password} = req.body;
  fullname = fullname.trim();

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
      // The endpoint creates a new user in the database and responds with a 201 status, a location header and a JSON representation of the user without the password.
      return res.status(201).location(`http://${req.headers.host}/api/folders//${result.id}`).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = {
          message: 'The username already exists',
          reason: 'ValidationError',
          location: 'username',
          status: 422
        }; 
      }
      next(err);
    });
});

module.exports = router;