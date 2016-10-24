'use strict';

var constants = require('../constants');

var base = require('./_base');

module.exports = function (warp){
  return base.defineModel(warp, 'Exam', [
    base.column_id('user_id', { index: true }),
    base.column_id('category_id', { index: true }),
    base.column_varchar_100('title'),
    base.column_varchar_1000('description'),
    base.column_varchar_1000('answer'),
    base.column_bigint('right_count'),
    base.column_bigint('obscure_count'),
    base.column_bigint('error_count'),
    base.column_varchar_100('user_name'),
    base.column_varchar_1000('tags')
  ], {
    table: 'exams'
  });
}
