'use strict';

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  folderId:{type: mongoose.Schema.Types.ObjectId, ref: 'Folder'}, //references folder model. How if we didn't import it? It's on the mongo level -- accessing the folders collection. dont need to import
  tags: [{type: mongoose.Schema.Types.ObjectId, ref: 'Tag'}]
});

// Add `createdAt` and `updatedAt` fields
noteSchema.set('timestamps', true);

//// Customize output for `res.json(data)`, `console.log(data)` etc.
noteSchema.set('toJSON', {
  virtuals: true,     // include built-in virtual `id`
  transform: (doc, ret) => {
    delete ret._id; // delete `_id`
    delete ret.__v; //delete _v
  }
});

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
