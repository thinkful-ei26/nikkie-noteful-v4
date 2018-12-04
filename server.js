'use strict';

const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');

const passport = require('passport');
const localStrategy = require('./passport/local');
const jwtStrategy = require('./passport/jwt');

const { PORT, MONGODB_URI } = require('./config');

const notesRouter = require('./routes/notes');
const foldersRouter = require('./routes/folders'); 
const tagsRouter = require('./routes/tags'); 
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');

// Create an Express application
const app = express();

// Log all requests. Skip logging during
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'common', {
  skip: () => process.env.NODE_ENV === 'test'
}));

// Create a static webserver
app.use(express.static('public'));

// Parse request body
app.use(express.json());

//Configure Passport to utilize the strategies, use them to create middleware fns, and pass in those middleware fns to the endpoints to authenticate and authorize access!
passport.use(localStrategy);
passport.use(jwtStrategy);

//we include this here so we don't have to for every single router endpoint
const options = {session: false, failWithError: true}; //instead of sending a text response, it'll throw an error if theres an auth error as a JSON body obj (better to be consistant so fron-end devs can easily handle errors)
const jwtAuth = passport.authenticate('jwt', options);
const localAuth = passport.authenticate('local', options);

// Mount routers
app.use('/api/notes', jwtAuth, notesRouter);
app.use('/api/folders', jwtAuth, foldersRouter);
app.use('/api/tags', jwtAuth, tagsRouter);
app.use('/api/users', usersRouter);
app.use('/api/login', localAuth, authRouter); //for login

// Custom 404 Not Found route handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Custom Error Handler
app.use((err, req, res, next) => {
  if (err.status) {
    if(err.status ===401){
      err.message = 'Incorrect username or password';
    }
    const errBody = Object.assign({}, err, { message: err.message });
    res.status(err.status).json(errBody);
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

if (require.main === module) {
  //  // Connect to DB and Listen for incoming connections
  mongoose.connect(MONGODB_URI, { useNewUrlParser:true }) //Mongo will automatically create the db here if it doesnt exist, and then mongoose will automatically create any collections that dont already exist by going through your models
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      console.error('\n === Did you remember to start `mongod`? === \n');
      console.error(err);
    });

  app.listen(PORT, function () {
    console.info(`Server listening on ${this.address().port}`);
  }).on('error', err => {
    console.error(err);
  });
}

module.exports = app; // Export for testing