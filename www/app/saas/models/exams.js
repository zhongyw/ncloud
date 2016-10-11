'use strict';

var constants = require('../constants');

var base = require('./_base');

module.exports = function (warp){
  return base.defineModel(warp, 'Exam', [
    base.column_varchar_100('title'),
    base.column_varchar_1000('desc'),
    base.column_varchar_1000('answer')
  ], {
    table: 'exams'
  });
}
