'use strict';

const express = require('express');
const mongoose = require('mongoose');

const Folder = require('../models/folder');
const Note = require('../models/note');

const router = express.Router();

/* ========== GET/READ ALL Folders ========== */
router.get('/', (req, res, next) => {
  Folder.find().sort({name: 'asc'})
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

  // make sure the id is a valid mongoose type
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not a valid Mongoose id!');
    err.status = 400;
    return next(err);
  }

  Folder.findById(id)
    .then(folder => {
      if(folder){
        res.status(200).json(folder);
      }
      else{
        // this 404 will happen if you try to access a valid mongoose id, but one that does not exist (either bc it was deleted or never existed) - if client messes up 
        next();
      }
    })
    .catch(err => {
      // this happens if our code messes up
      next(err);
    });
});

/* ========== POST/CREATE A FOLDER ========== */
router.post('/', (req, res, next) => {
  let {name} = req.body;

  if(name){
    // name = name.charAt(0).toUpperCase() + name.slice(1); //convert the first letter of the folder name to upper case so it gets sorted properly later
  }
  else{
    //this error should be displayed to user incase they forget to add a folder name. Dont trust user!
    const err = new Error('Missing name for the folder!');
    err.status = 400;
    return next(err);
  }

  const newFolder = {name};

  Folder.create(newFolder)
    .then(folder => {
      res.location(`http://${req.headers.host}/api/folders/${folder.id}`).status(201).json(folder);
    })
    .catch(err => {
      // if the folder name is duplicate, this is the error code
      if (err.code === 11000) {
        err = new Error('The folder name already exists. No duplicates!');
        err.status = 400;
      }
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE FOLDER ========== */
router.put('/:id', (req, res, next) => {
  const {name}= req.body;
  const {id} = req.params;

  // Dont trust user
  if (!name) {
    const err = new Error('Missing name for the folder!');
    err.status = 400;
    return next(err);
  }

  // Dont trust client - might be accessing invalid Mongoose id
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not a valid Mongoose id!');
    err.status = 400;
    return next(err);
  }

  const updateFolder = {name};
  Folder.findByIdAndUpdate(id, {$set: updateFolder}, {new: true})
  // need new is true to get back updated version
    .then(folder => {
      if(folder){
        res.status(200).json(folder);
      }
      else{
        next();
      }
    })
    .catch(err => {
      // If there's duplicates
      if (err.code === 11000) {
        err = new Error('The folder name already exists. No duplicates!');
        err.status = 400;
      }
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE FOLDER AND RELATED NOTES ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not a valid Mongoose id!');
    err.status = 400;
    return next(err);
  }

  // ON DELETE SET NULL equivalent
  const folderRemovePromise = Folder.findByIdAndRemove( id );
  // ON DELETE CASCADE equivalent - delete the notes associated with the folder that is being deleted: 
  // const noteRemovePromise = Note.deleteMany({ folderId: id });

  // Don't delete the notes associated with the folder to be deleted, but just remove their folderIds
  const noteRemovePromise = Note.updateMany(
    { folderId: id },
    { $unset: { folderId: '' } }
  );

  // delete the folder and update the notes in parallel using .all
  Promise.all([folderRemovePromise, noteRemovePromise])
    .then((folder, notes) => {
      // We want to make sure that it doesn't try to delete a folder that no longer exists or never existed. To prevent that, we need to check this: 
      if(folder[0]!==null){
        res.status(204).end();
      }
      else{
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

// Different way to accomplish the challenge of sending a 404 error when trying to delete a folder that no longer exists using async: 
// router.delete('/:id', async (req, res, next) => {
//   const {id}= req.params;

//   //if the id isnt a valid mongoose id, then don't even do findbyidanddelete 
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     const err = new Error('The `id` is not valid');
//     err.status = 400;
//     return next(err);
//   }

//   //USING ASYNC AWAIT
//   const folder = await Folder.findByIdAndDelete(id);
//   if (!folder){
//     return next();
//   }

//   await  Note.deleteMany({folderId:id}); 
//   // need to complete the above and then call a then or else it wont work
//   res.sendStatus(204);
// });

module.exports = router;