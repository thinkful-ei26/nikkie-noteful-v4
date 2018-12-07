'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Noteful API - Users', function () {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';
  
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser: true, useCreateIndex : true })
      .then(() => User.deleteMany());
  });
  
  beforeEach(function () {
    return User.createIndexes();
  });
  
  afterEach(function () {
    return User.deleteMany();
  });
  
  after(function () {
    return mongoose.disconnect();
  });
  
  describe('POST /api/users', function () {
    
    it('Should create a new user', function () {
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password, fullname })
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'username', 'fullname');
          expect(res.body.id).to.exist;
          expect(res.body.username).to.equal(username);
          expect(res.body.fullname).to.equal(fullname);
          return User.findOne({ username });
        })
        .then(user => {
          expect(user).to.exist;
          expect(user.id).to.equal(res.body.id);
          expect(user.fullname).to.equal(fullname);
          return user.validatePassword(password);
        })
        .then(isValid => {
          expect(isValid).to.be.true;
        });
    });
    
    it('Should reject users with missing username', function(){
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({password, fullname})
        .then(_res => {
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Missing \'username\' in request body');
          expect(res.body.location).to.equal('username');
        });
    });

    it('Should reject users with missing password', function(){
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({username, fullname})
        .then(_res => {
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Missing \'password\' in request body');
          expect(res.body.location).to.equal('password');
        });
    });

    it('Should reject users with non-string username', function(){
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({username:123, password, fullname})
        .then(_res => {
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Incorrect field type: expected string');
          expect(res.body.location).to.equal('username');
        });
    });

    it('Should reject users with non-string password', function(){
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({username, password:123, fullname})
        .then(_res => {
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Incorrect field type: expected string');
          expect(res.body.location).to.equal('password');
        });
    });

    it('Should reject users with non-trimmed username', function(){
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({username: '  nottrimmed', password, fullname})
        .then(_res => {
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Cannot start or end with whitespace');
          expect(res.body.location).to.equal('username');
        });
    });

    it('Should reject users with non-trimmed password', function(){
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({username, password:'  nottrimmed', fullname})
        .then(_res => {
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Cannot start or end with whitespace');
          expect(res.body.location).to.equal('password');
        });
    });

    it('Should reject users with empty username', function(){
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({username: '', password, fullname})
        .then(_res => {
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Must be at least 1 characters long');
          expect(res.body.location).to.equal('username');
        });
    });

    it('Should reject users with password less than 8 characters', function(){
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({username, password: '1234', fullname})
        .then(_res => {
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Must be at least 8 characters long');
          expect(res.body.location).to.equal('password');
        });
    });

    it('Should reject users with password greater than 72 characters', function(){
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({username, password: new Array(73).fill('a').join(''), fullname})
        .then(_res => {
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Must be at most 72 characters long');
          expect(res.body.location).to.equal('password');
        });
    });

    it('Should reject users with duplicate username', function(){
      //make first user
      return User.create({
        username,
        password,
        fullname
      })
        .then(()=>{
        //try to make second user with same name
          return chai
            .request(app)
            .post('/api/users')
            .send({username, password, fullname});
        })
        .then(_res => {
          let res;
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('The username already exists');
          expect(res.body.location).to.equal('username');
        });  
    });
    
    it('Should trim fullname', function(){
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password, fullname: '  Nikkie Mashian  ' })
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'username', 'fullname');
          expect(res.body.id).to.exist;
          expect(res.body.username).to.equal(username);
          expect(res.body.fullname).to.equal('  Nikkie Mashian  '.trim());
          return User.findOne({ username });
        })
        .then(user => {
          expect(user).to.exist;
          expect(user.id).to.equal(res.body.id);
          expect(user.fullname).to.equal('  Nikkie Mashian  '.trim());
          return user.validatePassword(password);
        })
        .then(isValid => {
          expect(isValid).to.be.true;
        });
    });
    
  });
  
});