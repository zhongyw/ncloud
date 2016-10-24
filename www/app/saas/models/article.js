'use strict';

// article.js

var base = require('./_base.js');

var constants = require('../constants');

module.exports = function (warp) {
    return base.defineModel(warp, 'Article', [
        base.column_id('user_id', { index: true }),
        base.column_id('category_id', { index: true }),
        base.column_bigint('type', { defaultValue: constants.type.NORMAL }),
        base.column_id('cover_id', { defaultValue: '' }),
        base.column_id('content_id'),
        base.column_bigint('views'),
        base.column_varchar_100('user_name'),
        base.column_varchar_100('name'),
        base.column_varchar_1000('tags'),
        base.column_varchar_1000('description'),
        base.column_bigint('publish_at', { index: true, defaultValue: Date.now })
    ], {
        table: 'articles'
    });
};
