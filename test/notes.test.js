'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');

const {TEST_MONGODB_URI } = require('../config'); 

const Note = require('../models/note');

const { notes } = require('../db/seed/notes');

const expect = chai.expect;
chai.use(chaiHttp);

//all of our tests will be wrapped in this: 
describe('Notes API tests', function(){
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Note.insertMany(notes);
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('GET endpoint', function() {

    it('should return all notes', function() {
      //    1. get back all notes returned by by GET request to `/notes`
      //    2. prove res has right status, data type
      //    3. prove the number of notes we got back is equal to number
      //       in db.
      //
      // need to have access to mutate and access `res` across `.then()` calls below, so declare it here so can modify in place
      let res;
      return chai.request(app)
        .get('/api/notes')
        //need to have the path in there
        .then(function(_res) {
          // so subsequent .then blocks can access response object
          res = _res;
          expect(res).to.have.status(200);
          // otherwise our db seeding didn't work
          expect(res.body).to.have.lengthOf.at.least(1);
          return Note.count();
        })
        .then(function(count) {
          expect(res.body).to.have.lengthOf(count);
        });
    });


    it('should return notes with right fields', function() {
      //Get back all notes, and ensure they have expected keys and values
      let resNote;
      return chai.request(app)
        .get('/api/notes')
        .then(function(res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);

          res.body.forEach(function(note) {
            expect(note).to.be.a('object');
            expect(note).to.include.keys(
              'title', 'content', 'id', 'createdAt', 'updatedAt');
          });
          resNote = res.body[0];
          return Note.findById(resNote.id);
        })
        .then(function(note) {
          expect(resNote.id).to.equal(note.id);
          expect(resNote.title).to.equal(note.title);
          expect(resNote.content).to.equal(note.content);
        });
    });
  });

  describe('POST endpoint', function() {
    // make a POST request with data,
    // then prove that the note we get back has
    // right keys, and that `id` is there (which means
    // the data was inserted into db)
    it('should add a new note', function() {

      const newNote = {title: 'testing', content: '123'};

      return chai.request(app)
        .post('/api/notes')
        .send(newNote)
        .then(function(res) {
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
          expect(note.title).to.equal(newNote.title);
          expect(note.content).to.equal(newNote.content);
        });
    });
  });

  describe('PUT endpoint', function() {
    //  1. Get an existing note from db
    //  2. Make a PUT request to update that note
    //  3. Prove note returned by request contains data we sent
    //  4. Prove note in db is correctly updated
    it('should update fields you send over', function() {
      const updateNote = {
        content: 'changed'
      };
      const updateableFields = ['title', 'content'];

      return Note
        .findOne()
        .then(function(note) {
          updateNote.id = note.id;

          // make request then inspect it to make sure it reflects
          // data we sent
          return chai.request(app)
            .put(`/api/notes/${note.id}`)
            .send(updateNote);
        })
        .then(function(res) {
          expect(res).to.have.status(200);

          return Note.findById(updateNote.id);
        })
        .then(function(note) {
          updateableFields.forEach(field => {
            if (field in updateNote) {
              expect(note[field]).to.equal(updateNote[field]);
            }
          });
        });
    });
  });

  describe('DELETE endpoint', function() {
    //  1. get a note
    //  2. make a DELETE request for that note's id
    //  3. assert that response has right status code
    //  4. prove that note with the id doesn't exist in db anymore
    it('delete a note by id', function() {

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
  });
});

//QUESTION: how do we test for negative tests??