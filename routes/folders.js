'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Folder = require('../models/folder');
const Note = require('../models/note');

/* ========== GET/READ ALL Folders ========== */
router.get('/', (req, res, next) => {
  return Folder.find().sort({name: 'asc' })
    .then(folders => {
      res.json(folders);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE FOLDER ========== */
router.get('/:id', (req, res, next) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  return Folder.findById(id)
    .then(folder => {
      if(folder){
        res.status(200).json(folder);
      }
      else{
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE A FOLDER ========== */
router.post('/', (req, res, next) => {
  const name = req.body.name;
  const id = req.params.id;

  if (!name) {
    const message = 'Missing name for the folder!';
    console.error(message);
    return res.status(400).send(message);
  }

  return Folder.create({
    name: name
  })
    .then(folder => {
      res.location(`http://${req.headers.host}/api/folders/${folder.id}`).status(201).json(folder);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The folder name already exists');
        err.status = 400;
      }
      next(err);
    });

  // Catch duplicate key error code 11000 and respond with a helpful error message (see below for sample code)
});

/* ========== PUT/UPDATE A SINGLE FOLDER ========== */
router.put('/:id', (req, res, next) => {
  const name = req.body.name;
  const id = req.params.id;

  if (!name) {
    const message = 'Missing name for the folder!';
    console.error(message);
    return res.status(400).send(message);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  return Folder.findByIdAndUpdate(id, {$set: {name:name}}, {new: true})
    .then(folder => {
      res.status(200).json(folder);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The folder name already exists');
        err.status = 400;
      }
      next(err);
    });

  // Catch duplicate key error code 11000 and respond with a helpful error message (see below for sample code)

});

/* ========== DELETE/REMOVE A SINGLE FOLDER AND RELATED NOTES ========== */
router.delete('/:id', async (req, res, next) => {
  const id = req.params.id;

  //if the id isnt a valid mongoose id, then don't do findbyidanddelete 
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  const folder = await Folder.findByIdAndDelete(id);
  if (!folder){
    return next();
  }

  await  Note.deleteMany({folderId:id}); 
  // need to complete the above and then call a then or else it wont work
  res.sendStatus(204);

  //   .catch(err => {
  //   next(err);
  // });
  //cant have the above with async await but you could do a try/catch block 

});


module.exports = router;