'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');
const {TEST_MONGODB_URI } = require('../config'); 

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tags');
const { notes, folders, tags } = require('../db/seed/data');

const expect = chai.expect;
chai.use(chaiHttp);

//all of our tests will be wrapped in this: 
describe('Notes API tests', function(){
  before(function () {
    // first connect and drop anything that might have been in the db
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    //populate the db before each test 
    return Promise.all([
      Note.insertMany(notes),
      Folder.insertMany(folders),
      Tag.insertMany(tags),
      Folder.createIndexes(),
      Tag.createIndexes()
    ]);
  });

  afterEach(function () {
    // drop the database after each test 
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    // disconnect from db when done testing
    return mongoose.disconnect();
  });

  describe('GET /api/notes', function() {
    
    it('should return the correct amount of notes', function () {
      return Promise.all([
        Note.find(),
        chai.request(app).get('/api/notes') //need to include the path endpoint here, different than router
        // we'll use .all so we can compare the db to the api response
      ])
        .then(([db, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(db.length);
        });
    });

    it('should return notes with right fields', function() {
      //Get back all notes, and ensure they have expected keys and values
      return Promise.all([
        Note.find().sort({ updatedAt: 'desc' }),
        chai.request(app).get('/api/notes')
      ])
        .then(([db, res]) =>{
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(db.length);

          res.body.forEach(function(note, i ) {
            expect(note).to.be.a('object');
            //folderId and tags are optional
            expect(note).to.include.keys(
              'title', 'content', 'id', 'createdAt', 'updatedAt');
            // make sure each note's properties matches the db's properties
            expect(note.id).to.equal(db[i].id);
            expect(note.title).to.equal(db[i].title);
            expect(note.content).to.equal(db[i].content);
            expect(new Date(note.createdAt)).to.eql(db[i].createdAt);
            expect(new Date(note.updatedAt)).to.eql(db[i].updatedAt);
          }); 
        });
    });

    it('should return correct search results for a searchTerm query', function () {
      const searchTerm = 'gaga';
      // const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note.find({
        title: { $regex: searchTerm, $options: 'i' }
        // $or: [{ 'title': re }, { 'content': re }]
      });
      const apiPromise = chai.request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`);

      return Promise.all([dbPromise, apiPromise])
        .then(([db, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(1);
          res.body.forEach(function (note, i) {
            expect(note).to.be.a('object');
            expect(note).to.include.keys('id', 'title', 'createdAt', 'updatedAt');
            expect(note.id).to.equal(db[i].id);
            expect(note.title).to.equal(db[i].title);
            expect(note.content).to.equal(db[i].content);
            expect(new Date(note.createdAt)).to.eql(db[i].createdAt);
            expect(new Date(note.updatedAt)).to.eql(db[i].updatedAt);
          });
        });
    });

    it('should return correct search results for a folderId query', function () {
      let data;
      return Folder.findOne()
        .then((_data) => {
          data = _data;
          return Promise.all([
            Note.find({ folderId: data.id }),
            chai.request(app).get(`/api/notes?folderId=${data.id}`)
          ]);
        })
        .then(([db, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(db.length);
        });
    });

    it('should return correct search results for a tagId query', function () {
      let data;
      return Tag.findOne()
        .then((_data) => {
          data = _data;
          console.log('dataId is', data.id);
          return Promise.all([
            Note.find({ tags: data.id }),
            chai.request(app).get(`/api/notes?tagId=${data.id}`)
          ]);
        })
        .then(([db, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(db.length);
        });
    });

    it('should return an empty array for an incorrect search query', function () {
      const searchTerm = 'NotValid';
      // const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note.find({
        title: { $regex: searchTerm, $options: 'i' }
        // $or: [{ 'title': re }, { 'content': re }]
      });
      const apiPromise = chai.request(app).get(`/api/notes?searchTerm=${searchTerm}`);
      return Promise.all([dbPromise, apiPromise])
        .then(([db, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(0); //should be nothing in it
          expect(res.body).to.have.length(db.length);
        });
    });
  });

  describe('GET /api/notes/:id', function () {

    it('should return correct notes', function () {
      let data;
      return Note.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app).get(`/api/notes/${data.id}`);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.include.keys('id', 'title', 'content', 'createdAt', 'updatedAt');

          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should respond with status 400 and an error message when `id` is not a valid mongoose type', function () {
      return chai.request(app)
        .get('/api/notes/NOT-A-VALID-ID')
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function () {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai.request(app)
        .get('/api/notes/DOESNOTEXIST')
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

  });

  describe('POST endpoint', function() {
    // make a POST request with data, then prove that the note we get back has right keys, and that `id` is there (which means the data was inserted into db)
    it('should create and return a new item when provided valid data', function() {

      const newNote = {title: 'testing', content: '123'};
      let res; 

      return chai.request(app)
        .post('/api/notes')
        .send(newNote)
        .then(function(_res) {
          res = _res;
          //compare the returned object to the data we sent over.
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'title', 'content', 'id', 'createdAt', 'updatedAt');
          expect(res.body.id).to.not.be.null;
          expect(res.body.title).to.equal(newNote.title);
          expect(res.body.content).to.equal(newNote.content);
          return Note.findById(res.body.id);
        })
        .then(function(note) {
          // retrieve the new note from the DB and compare its data to the data we sent over
          expect(res.body.id).to.equal(note.id);
          expect(res.body.title).to.equal(note.title);
          expect(res.body.content).to.equal(note.content);
          expect(new Date(res.body.createdAt)).to.eql(note.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(note.updatedAt);

        });
    });

    it('should return an error when missing "title" field', function () {
      const newNote = {
        'content': 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...'
      };
      return chai.request(app)
        .post('/api/notes')
        .send(newNote)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Must have title and content!');
        });
    });
  });

  describe('PUT endpoint', function() {
    //  1. Get an existing note from db
    //  2. Make a PUT request to update that note
    //  3. Prove note returned by request contains data we sent
    //  4. Prove note in db is correctly updated
    it('should update the note when provided valid data', function () {
      const updateItem = {
        'title': 'What about dogs?!',
        'content': 'woof woof'
      };
      let data;
      return Note.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/notes/${data.id}`)
            .send(updateItem);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          console.log(res.body);
          expect(res.body).to.include.keys('id', 'title', 'content', 'createdAt', 'updatedAt');

          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(updateItem.title);
          expect(res.body.content).to.equal(updateItem.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect note to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should respond with status 400 and an error message when `id` is not valid', function () {
      const updateItem = {
        'title': 'What about dogs?!',
        'content': 'woof woof'
      };
      return chai.request(app)
        .put('/api/notes/NOT-A-VALID-ID')
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('The `id` is not valid');
        })
        .catch(err => {
          console.log(err);
        });
    });

    it('should respond with a 404 for an id that does not exist', function () {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      const updateItem = {
        'title': 'What about dogs?!',
        'content': 'woof woof'
      };
      return chai.request(app)
        .put('/api/notes/DOESNOTEXIST')
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "title" field', function () {
      const updateItem = {
        'content': 'woof woof'
      };
      let data;
      return Note.findOne()
        .then(_data => {
          data = _data;

          return chai.request(app)
            .put(`/api/notes/${data.id}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Must have title and content!');
        });
    });
  });

  describe('DELETE endpoint', function() {
    //  1. get a note
    //  2. make a DELETE request for that note's id
    //  3. assert that response has right status code
    //  4. prove that note with the id doesn't exist in db anymore
    it('delete a note by id and respond with 204', function() {

      let note;

      return Note
        .findOne()
        .then(function(_note) {
          note = _note;
          return chai.request(app).delete(`/api/notes/${note.id}`);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return Note.findById(note.id);
        })
        .then(function(_note) {
          expect(_note).to.be.null;
        });
    });

    it('should return a 404 if you try to delete a note that does not exist', function (){
      let note;
      return chai.request(app).delete('/api/notes/DOESNOTEXIST')
        .then(function(res) {
          expect(res).to.have.status(404);
        });
    });
  });
});

// ADD IN TESTS FOR folderId vs no folderId 