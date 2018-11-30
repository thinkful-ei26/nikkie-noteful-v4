'use strict';

const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

//adds createdAt and updatedAt fields
tagSchema.set('timestamps', true);

//// Customize output for `res.json(data)`, `console.log(data)` etc. (but not for database)
tagSchema.set('toJSON', {
  virtuals: true,     // include built-in virtual `id`
  transform: (doc, ret) => {
    delete ret._id; // delete `_id`
    delete ret.__v; //delete _v
  }
});

const Tag = mongoose.model('Tag', tagSchema);
//creates a tags collection with this schema

module.exports = Tag;