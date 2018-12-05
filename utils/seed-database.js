'use strict';
const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');
const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tags');
const User = require('../models/user');

const { notes, folders, tags, users } = require('../db/seed/data');

console.log(`Connecting to mongodb at ${MONGODB_URI}`);
mongoose.connect(MONGODB_URI, { useNewUrlParser:true, useCreateIndex : true  })
  .then(() => {
    console.info('Dropping the Database...');
    mongoose.connection.db.dropDatabase();
  })
  .then(()=> {
    console.info('Seeding Database...');
    return Promise.all([
      Note.insertMany(notes),
      Folder.insertMany(folders),
      Tag.insertMany(tags),
      User.insertMany(users),
      // Folder.createIndexes(),//tells Mongo to index the Folders data immediately. The index is used to enforce the unique folder names rule you created in the schema. Normally, the index is automatically created in the background. But that leaves open a small window of time when you could, in theory, seed the database and then create a folder with a duplicate name. Calling createIndexes() forces Mongo to create the index and prevents error from happening.
      // Tag.createIndexes()
    ]);
  })
  .then(([notes,folders, tags, users]) => {
    console.info(`Inserted ${notes.length} Notes and ${folders.length} folders and ${tags.length} tags and ${users.length} users`);
  })
  .then(() => {
    console.info('Disconnecting...');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
  });

// this drops whatever is currently in the database and repopulates it when we run it with node ./utils/seed-database.js