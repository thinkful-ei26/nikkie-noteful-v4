'use strict';

const express = require('express');
const mongoose = require('mongoose');

const Note = require('../models/note');
const Tag = require('../models/tags');

const router = express.Router();

/* ========== GET/READ ALL Tags ========== */
router.get('/', (req,res,next)=>{
  const userId = req.user.id;

  Tag.find({userId}).sort('name')
    .then(tags=>{
      if(tags){
        res.json(tags);
      }
      else{
        next();
      }
    })
    .catch(err=>{
      next(err);
    });
});

/* ========== GET/READ A SINGLE TAG ========== */
router.get('/:id', (req,res,next)=>{
  const {id} = req.params;
  const userId = req.user.id;

  // make sure the id is a valid mongoose type
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not a valid Mongoose id!');
    err.status = 400;
    return next(err);
  }

  Tag.findOne({_id:id, userId})
    .then(tag=>{
      if(tag){
        res.json(tag);
      }
      else{
        next();
      }
    })
    .catch(err=>{
      next(err);
    });
});

/* ========== POST/CREATE A TAG ========== */
router.post('/', (req,res,next)=>{
  let {name} = req.body;
  const userId = req.user.id;

  if(!name){
    //this error should be displayed to user incase they forget to add a tag name. Dont trust user!
    const err = {
      message: 'Missing name for the tag!',
      reason: 'MissingContent',
      status: 400,
      location: 'tag'
    };
    return next(err);
  }

  const newTag = {name, userId};

  Tag.create(newTag)
    .then(tag=>{
      res.location(`http://${req.headers.host}/api/tags/${tag.id}`).status(201).json(tag);
    })
    .catch(err => {
    // if the tag name is duplicate, this is the error code
      if (err.code === 11000) {
        err = {
          message: 'The tag name already exists. No duplicates!',
          reason: 'DuplicateError',
          status: 400,
          location: 'tag'
        };
      }
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE TAG ========== */
router.put('/:id',(req,res,next)=>{

  let {name} = req.body;
  let {id} = req.params;
  const userId = req.user.id;

  // make sure the id is a valid mongoose type
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not a valid Mongoose id!');
    err.status = 400;
    return next(err);
  }

  if(!name){
    //this error should be displayed to user incase they forget to add a tag name. Dont trust user!
    const err = {
      message: 'Missing name for the tag!',
      reason: 'MissingContent',
      status: 400,
      location: 'tag'
    };
    return next(err);
  }

  const updateTag = {name, userId};

  Tag.findOneAndUpdate({_id:id, userId: userId}, updateTag, {new: true}) 
    .then(tag=>{
      if(tag){
        res.status(200).json(tag);
      }
      else{
        next();
      }
    })
    .catch(err=>{
      // If there's duplicates
      if (err.code === 11000) {
        err = {
          message: 'The tag name already exists. No duplicates!',
          reason: 'DuplicateError',
          status: 400,
          location: 'tag'
        };
      }
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE TAG AND REMOVE IT FROM NOTE TAG ARRAY ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not a valid Mongoose id!');
    err.status = 400;
    return next(err);
  }

  //remove the tag
  const tagRemovePromise = Tag.findOneAndDelete({_id:id, userId});

  // Don't delete the notes associated with the tag to be deleted, but just remove the tag from the tags array
  const noteTagPullPromise = Note.updateMany(
    { tags: id, userId },
    { $pull: { tags: id } }
  );

  // delete the folder and update the notes in parallel using .all
  Promise.all([tagRemovePromise, noteTagPullPromise])
    .then((tag) => {
      // We want to make sure that it doesn't try to delete a tag that no longer exists or never existed. To prevent that, we need to check this: 
      if(tag[0]!==null){
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

module.exports = router;