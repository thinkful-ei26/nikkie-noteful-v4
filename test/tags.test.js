
'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');
const { TEST_MONGODB_URI } = require('../config');

const Folder = require('../models/folder');
const { folders } = require('../db/seed/data');

const expect = chai.expect;
chai.use(chaiHttp);
