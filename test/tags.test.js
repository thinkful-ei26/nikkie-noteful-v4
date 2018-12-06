
'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); 

const app = require('../server');
const { TEST_MONGODB_URI } = require('../config');
const {JWT_SECRET} = require('../config');

const Tag = require('../models/tags');
const Note = require('../models/note');
const User = require('../models/user');

const { notes, tags, users } = require('../db/seed/data');

const expect = chai.expect;
chai.use(chaiHttp);

describe.only('Noteful API - Tags', function () {

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser: true })
      .then(() => mongoose.connection.db.dropDatabase());
  });

  let token;
  let user;
  beforeEach(function () {
    return Promise.all([
      User.insertMany(users),
      Note.insertMany(notes),
      Tag.insertMany(tags),
      Tag.createIndexes()
    ])
      .then(([users]) => {
        user = users[0];
        token = jwt.sign({ user }, JWT_SECRET, { subject: user.username });
      });
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('GET /api/tags', function () {

    it('should return a list sorted by name with the correct number of tags', function () {
      return Promise.all([
        Tag.find({userId:user.id}).sort('name'),
        chai.request(app).get('/api/tags').set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return a list with the correct fields and values', function () {
      return Promise.all([
        Tag.find({userId:user.id}).sort('name'),
        chai.request(app).get('/api/tags').set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
          res.body.forEach(function (item, i) {
            expect(item).to.be.a('object');
            expect(item).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
            expect(item.id).to.equal(data[i].id);
            expect(item.name).to.equal(data[i].name);
            expect(item.userId).to.equal(data[i].userId.toString()); //ref is handled differently so we need to use toString
            expect(new Date(item.createdAt)).to.deep.equal(data[i].createdAt);
            expect(new Date(item.updatedAt)).to.deep.equal(data[i].updatedAt);
          });
        });
    });

  });

  describe('GET /api/tags/:id', function () {

    it('should return correct tag given valid id', function () {
      let data;
      return Tag.findOne({userId:user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).get(`/api/tags/${data.id}`).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(res.body.userId).to.equal(data.userId.toString());
          expect(new Date(res.body.createdAt)).to.deep.equal(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.deep.equal(data.updatedAt);
        });
    });

    it('should respond with a 400 for an invalid id', function () {
      return chai.request(app)
        .get('/api/tags/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('The `id` is not a valid Mongoose id!');
        });
    });

    it('should respond with a 404 for an ID that does not exist', function () {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai.request(app)
        .get('/api/tags/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

  });

  describe('POST /api/tags', function () {

    it('should create and return a new tag when provided valid data', function () {
      const newTag = { 'name': 'newTag' };
      let body;
      return chai.request(app)
        .post('/api/tags')
        .send(newTag)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          body = res.body;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(body).to.be.a('object');
          expect(body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          return Tag.findOne({_id: body.id, userId: user.id});
        })
        .then(data => {
          expect(body.id).to.equal(data.id);
          expect(body.name).to.equal(data.name);
          expect(body.userId).to.equal(data.userId.toString());
          expect(new Date(body.createdAt)).to.deep.equal(data.createdAt);
          expect(new Date(body.updatedAt)).to.deep.equal(data.updatedAt);
        });
    });

    it('should return an error when missing "name" field', function () {
      const newTag = { 'cat': 'meow' };
      return chai.request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .send(newTag)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing name for the tag!');
          expect(res.body.reason).to.equal('MissingContent');
          expect(res.body.location).to.equal('tag');
        });
    });

    it('should return an error when "name" is empty string', function () {
      const newTag = {name:''};
      return chai.request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .send(newTag)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing name for the tag!');
          expect(res.body.reason).to.equal('MissingContent');
          expect(res.body.location).to.equal('tag');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Tag.findOne({userId: user.id})
        .then(data => {
          const newTag = { 'name': data.name };
          return chai.request(app).post('/api/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(newTag);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The tag name already exists. No duplicates!');
          expect(res.body.reason).to.equal('DuplicateError');
          expect(res.body.location).to.equal('tag');
        });
    });

  });

  describe('PUT /api/tags/:id', function () {

    it('should update the tags', function () {
      const updateTag = { 'name': 'Updated Name' };
      let data;
      return Tag.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).put(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateTag);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(updateTag.name);
          expect(res.body.userId).to.equal(data.userId.toString());
          expect(new Date(res.body.createdAt)).to.deep.equal(data.createdAt);
          // expect item to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should respond with a 400 for an invalid id', function () {
      const updateTag = { 'name': 'test' };
      return chai.request(app)
        .put('/api/tags/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .send(updateTag)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('The `id` is not a valid Mongoose id!');
        });
    });

    it('should respond with a 404 for an id that does not exist', function () {
      const updateItem = { 'name': 'test' };
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai.request(app)
        .put('/api/tags/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "name" field', function () {
      const updateTag = {};
      let data;
      return Tag.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).put(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateTag);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing name for the tag!');
          expect(res.body.reason).to.equal('MissingContent');
          expect(res.body.location).to.equal('tag');
        });
    });

    it('should return an error when "name" is empty string', function () {
      const updateTag = {name:''};
      let data;
      return Tag.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).put(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateTag);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing name for the tag!');
          expect(res.body.reason).to.equal('MissingContent');
          expect(res.body.location).to.equal('tag');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Tag.find({userId: user.id}).limit(2)
        .then(results => {
          const [tag1, tag2] = results;
          tag1.name = tag2.name;
          return chai.request(app)
            .put(`/api/tags/${tag1.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(tag1);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The tag name already exists. No duplicates!');
          expect(res.body.reason).to.equal('DuplicateError');
          expect(res.body.location).to.equal('tag');
        });

    });
  });

  describe('DELETE /api/tags/:id', function () {

    it('should delete an existing tag and remove it from notes tags array and respond with 204', function () {
      let data;
      return Tag.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app).delete(`/api/tags/${data.id}`).set('Authorization', `Bearer ${token}`);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Tag.countDocuments({ _id: data.id });
        })
        .then(function(count){
          expect(count).to.equal(0);
        });
    });

    it('should delete an existing tag and remove its reference from the corresponding note', function () {
      let tagId;
      return Note.findOne({tags: {$exists: true, $ne: [] }}) //find a note that has a tagId
        .then(data => {
          tagId = data.tags[0];
          console.log('tagid is', tagId);
          return chai.request(app).delete(`/api/tags/${tagId}`).set('Authorization', `Bearer ${token}`);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Note.find({tagId }); //make sure that note no longer has that tagId
        })
        .then(res => {
          expect(res).to.be.empty; //should return an empty array
        });
    });

    it('should respond with a 400 for an invalid id', function () {
      return chai.request(app).delete('/api/tags/nonsense').set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('The `id` is not a valid Mongoose id!');
        });
    });
   
    it('should respond with a 404 for an ID that does not exist', function () {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai.request(app).delete('/api/tags/DOESNOTEXIST').set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

  });

});
