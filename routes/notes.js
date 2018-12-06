'use strict';

const express = require('express');
const mongoose = require('mongoose');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tags');

const router = express.Router();

//Below are two functions that return promises when verifing that the incoming note's folder id and tags belong to the current user before updating the database. Remember, return statements will break out of the current function it's in.

function validateFolder(folderId, userId){
  //make sure the user has access to this folder by looking in the folders collection and seeing if this folder is associated with this id:

  if(!folderId){
    return Promise.resolve(); //if there isnt even a folder, move on 
  }

  // if there's a folderid, make sure its a valid mongoose objectid AND that it passes the validateFolder test - if either of these fail, need to return a 400

  if (!mongoose.Types.ObjectId.isValid(folderId)) {
    //user error, so send more info, not an error stack trace
    return Promise.reject({
      reason: 'ValidationError',
      status: 400,
      message: 'The `folderId` is not valid',
      location: 'validating tags'
    });
  }

  const filter = {_id: folderId, userId};

  return Folder.find(filter) //dont forget to return the promise
    .then(results=>{
      if(results.length>0){
        return Promise.resolve();
      }
      else{
        return Promise.reject({
          reason: 'ValidationError',
          status: 400,
          message: 'The `folderId` is not valid',
          location: 'validating tags'
        });
      }
    });
}

function validateTags(tags, userId){
  //need to make sure each tag in the tags array is associated with this userId. IF at any point it isn't, return false

  if(tags.length===0){
    return Promise.resolve(); //if arent even tags, move on 
  }

  const badIds = tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
  console.log('badIDS are', badIds);
  if (badIds.length) {
    const err = {
      message: 'The `tags` array contains an invalid `id`',
      status: 400,
    };
    return Promise.reject(err);
  }

  const filter = {};
  filter.$and = [{'_id':{$in: tags}}, {'userId':userId}]; //check every tag in the  collection and match if its one of the ones listed in the array. Userid must match and these ids have to be in the collection
  //do a single tag.find that looks for all the tags
  //count the number of valid tags and make sure it's the same 
  return Tag.find(filter)
    .then(results=>{
      if(results.length!==tags.length){
        const err ={
          message: 'The `folderId` is not valid',
          status:400,
        };
        return Promise.reject(err);
      }
      else{
        return Promise.resolve();
      }
    });

}

//Next, update the /notes endpoints to ensure that a user can only interact with their own notes.
//In each endpoint, capture the current user id from req.user and update the query. Note, you may need to change the Mongoose method. 

/* ========== GET/READ ALL NOTES ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const userId = req.user.id;

  const filter = {userId}; //filter obj def needs at least this in it

  // Check if request contains folderId in the querystring and add a filter which to find notes with the given folderId QUESTION when is this used? When user clicks folder and wants to see notes in that folder?...YES look at network for the requests you'll see. Same with tags.

  if (folderId) {
    filter.folderId =  folderId;
  }

  if(tagId){
    filter.tags =  tagId;
  } //Question: Why doesn't filter.tagId = tagId? Because tags is how it's written in the db. tagId is how the client sends it 


  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }

  Note.find(filter)
    .populate('tags') //QUESTION why is tags first in the response?
    .sort({ updatedAt: 'desc' })
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
  const userId = req.user.id;

  // Dont trust client
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOne({_id: id, userId: userId})
    .populate('tags')
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
  //Check if request contains a folderId and verify it is a valid Mongo ObjectId, if not valid respond with an error
  const { title, content, folderId, tags =[] } = req.body;
  const userId = req.user.id;

  // Dont trust users or client - Make sure user included title and content 
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  const newNote = {title, content, userId};
  if (folderId){
    newNote.folderId = folderId;
  }
  if(tags){
    newNote.tags = tags;
  }

  Promise.all([
    //but what if there are no folders or tags? shouldn't it not do this? that'll resolve in the validate
    validateFolder(folderId, userId),
    validateTags(tags, userId)
  ])
    .then(()=> Note.create(newNote))
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
  const { title, content, folderId, tags =[] } = req.body;
  const userId = req.user.id;
  
  // validate id
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  // Dont trust users or client - Make sure user included title and content 
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  //only want to put in the folderId if there is one or else it gets a cast error!
  //if folderId doesn't exist since the user didn't choose a folder when updating, when we try to update a note with folderId = '', it throws a CastError. To avoid this, we can do: 
  const updateNote = {title, content};

  if (folderId){
    updateNote.folderId = folderId;
  }
  else{
    // if the user is trying to go from a folder to no folder, we need to account for that:
    updateNote.$unset = {folderId: ''};
  }

  if (tags){
    updateNote.tags = tags;
  }
  else{
    // if the user is trying to go from tags to no tags, we need to account for that:
    updateNote.$unset = {tags: []};
  }

  Promise.all([
    validateFolder(folderId, userId),
    validateTags(tags, userId)
  ])
    .then(()=> Note.findOneAndUpdate({_id: id, userId: userId}, updateNote, {new: true}))
    .then(note => {
      console.log('THE NOTE IS ', note);
      console.log('THIS USERS ID IS ', userId);
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
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOneAndDelete({_id:id, userId: userId})
    .then((note) => {
      if(!note){
        // if trying to delete something that no longer exists or never did
        return next();
      }
      else{
        res.sendStatus(204);
      }
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;