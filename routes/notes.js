'use strict';

const express = require('express');
const mongoose = require('mongoose');

const Note = require('../models/note');

const router = express.Router();

/* ========== GET/READ ALL NOTES ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId } = req.query;

  const filter = {}; 

  if (folderId) {
    filter.folderId =  folderId;
  }
  // Check if request contains folderId in the querystring and add a filter which to find notes with the given folderId QUESTION when is this used?


  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }

  Note.find(filter).sort({ updatedAt: 'desc' })
    .then(notes => {
      res.json(notes);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE NOTE ========== */
router.get('/:id', (req, res, next) => {
  const {id} = req.params;

  // Dont trust client
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findById(id)
    .then(notes => {
      if(notes){
        res.json(notes);
      }
      else{
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  //Check if request contains a folderId and verify it is a valid Mongo ObjectId, if not valid respond with an error QUESTION: where wuold this be? in body or params? And it doesn't get saved to db with folderId bc we don't pass it in....should we? 
  const { title, content, folderId } = req.body;

  // if there's a folderid, make sure its a valid mongoose objectid
  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  // Make sure user included title and content 
  const requiredFields = [title, content];
  for (let i=0; i<requiredFields.length; i++) {
    const field = requiredFields[i];
    console.log(req.body);
    if (!field) {
      const err = new Error ('Must have title and content!');
      err.status = 400;
      return next(err);
      // QUESTION: shouldnt this validation be done on the client side? 
    }
  }

  const newNote = {title, content};
  if (folderId){
    newNote.folderId = folderId;
  }

  Note.create(newNote)
    .then(note => {
      res.location(`http://${req.headers.host}/api/notes/${note.id}`).status(201).json(note);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const{ id }= req.params;
  const { title, content, folderId } = req.body;
  console.log(req.body);
  
  // validate id
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  // validate folderid if there is one
  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  // Make sure user included title and content 
  const requiredFields = [title, content];
  for (let i=0; i<requiredFields.length; i++) {
    const field = requiredFields[i];
    console.log(req.body);
    if (!field) {
      const err = new Error ('Must have title and content!');
      err.status = 400;
      return next(err);
      // QUESTION: shouldnt this validation be done on the client side? 
    }
  }

  //only want to put in the folderId if there is one or else it gets a cast error! QUESTION: didn't have a problem with this in post, but it does in put? 
  // In the solution for the "PUT" Notes endpoint, it says "const updateNote = { title, content, folderId }". But if folderId doesn't exist since the user didn't choose a folder when updating, when we try to update a note with folderId = '', it throws a CastError. To avoid this, I changed the code to this: 
  // Also why doesnt solution use set? Might only change a part 
  const updateNote = {title, content};
  if (folderId){
    updateNote.folderId = folderId;
  }

  Note.findByIdAndUpdate(id, updateNote, {new: true})
    .then(note => {
      if(note){
        res.status(200).json(note);
      }
      else{
        next();
      }
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
        // if trying to delete something that no longer exists or never did
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