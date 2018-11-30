'use strict';

const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

//adds createdAt and updatedAt fields
folderSchema.set('timestamps', true);

//// Customize output for `res.json(data)`, `console.log(data)` etc. (but not for database)
folderSchema.set('toJSON', {
  virtuals: true,     // include built-in virtual `id`
  transform: (doc, ret) => {
    delete ret._id; // delete `_id`
    delete ret.__v; //delete _v
  }
});

const Folder = mongoose.model('Folder', folderSchema);
//creates a folders collection with this schema

module.exports = Folder;