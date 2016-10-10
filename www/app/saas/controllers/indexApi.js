'use strict';
var
    _ = require('lodash'),
    db = require('../../../db');

var User = db.user;

function* $getUsers(){
  console.log(User);
  yield User.$findNumber('count(id)');
}

module.exports = {
  'GET /feed': function* (){
    var count = yield $getUsers();
    console.log(count);
    this.body = yield User.$findAll();
  }
}
