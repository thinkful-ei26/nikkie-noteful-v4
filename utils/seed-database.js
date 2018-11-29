'use strict';
const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');
const Note = require('../models/note');
const Folder = require('../models/folder');

const { notes, folders } = require('../db/seed/data');

mongoose.connect(MONGODB_URI, { useNewUrlParser:true })
  .then(() => mongoose.connection.db.dropDatabase())
  .then(()=> {
    return Promise.all([
      Note.insertMany(notes),
      Folder.insertMany(folders),
      Folder.createIndexes()//tells Mongo to index the Folders data immediately. The index is used enforce the unique folder names rule you created in the schema. QUESTION: huh?
    ]);
  })
  .then(([notes,folders]) => {
    console.info(`Inserted ${notes.length} Notes and ${folders.length} folders`);
  })
  .then(() => mongoose.disconnect())
  .catch(err => {
    console.error(err);
  });

// this drops whatever is currently in the database and repopulates it when we run it with node ./utils/seed-database.js