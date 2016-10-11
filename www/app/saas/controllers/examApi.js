'use strict';

var
    _ = require('lodash'),
    thunkify = require('thunkify'),
    oauth2 = require('oauth2-warp'),
    api = require('../../../api'),
    db = require('../../../db'),
    auth = require('../../../auth'),
    helper = require('../../../helper'),
    config = require('../../../config'),
    json_schema = require('../../../json_schema'),
    constants = require('../../../constants');

var
    User = db.user,
    AuthUser = db.authuser,
    LocalUser = db.localuser,
    Exam = db.exam,
    warp = db.warp,
    next_id = db.next_id;

function* $getExams(page){
  page.total = yield Exam.$findNumber('count(id)');
  if (page.isEmpty){
    return [];
  }
  var exams = yield Exam.$findAll({
    offset: page.offset,
    limit: page.limit,
    order: 'created_at desc'
  });
  return exams;
}

function* $createExam(examParam){
  var exam = yield Exam.$create({
    title: examParam.title,
    desc: examParam.desc,
    answer: examParam.answer
  });
}

module.exports = {
  'POST /api/createExam': function* (){
      var data = this.request.body,
          examParam = {
            title: data.title,
            desc: data.desc,
            answer: data.answer
          };
      var exam = yield $createExam(examParam);
      this.body = exam;
  }
}
