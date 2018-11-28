'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Note = require('../models/note');

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const searchTerm = req.query.searchTerm;
  const re = new RegExp(searchTerm, 'i');

  let filter = {};

  filter.$or = [{ 'title': re }, { 'content': re }];

  return Note.find(filter).sort({ updatedAt: 'desc' })
    .then(notes => {
      res.json(notes);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  return Note.findById(id)
    .then(notes => {
      res.json(notes);
    })
    .catch(err => {
      next(err);
    });

});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {

  const requiredFields = ['title', 'content'];
  for (let i=0; i<requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }

  return Note.create({
    title: req.body.title,
    content: req.body.content  
  })
    .then(note => {
      res.location(`http://${req.headers.host}/api/notes/${note.id}`).status(201).json(note);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const id = req.params.id;

  const updatedObj = {};
  const updateableFields = ['title', 'content'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      updatedObj[field] = req.body[field];
    }
  });

  return Note.findByIdAndUpdate(id, {$set: updatedObj}, {new: true})
    .then(note => {
      res.status(200).json(note);
    })
    .catch(err => {
      next(err);
    });

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const id = req.params.id;

  return Note.findByIdAndDelete(id)
    .then(note => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;