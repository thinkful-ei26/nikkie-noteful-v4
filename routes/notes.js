'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Note = require('../models/note');

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  // Check if request contains folderId in the querystring and add a filter which to find notes with the given folderId 

  const searchTerm = req.query.searchTerm;
  const folderId = req.query.folderId;
  const filter = {}; 

  if (folderId) {
    filter.folderId =  folderId;
  }

  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }

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
  //Check if request contains a folderId and verify it is a valid Mongo ObjectId, if not valid respond with an error QUESTION: where wuold this be? in body or params? And it doesn't get saved to db with folderId bc we don't pass it in....should we? 
  const folderId = req.body.folderId;

  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

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
  const folderId = req.body.folderId;

  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

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
  const { id } = req.params;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findByIdAndRemove(id)
    .then((note) => {
      if(!note){
        return next();
      }
      else{
        res.status(204).end();
      }
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;