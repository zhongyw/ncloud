'use strict';

// wiki.js

var base = require('./_base.js');

module.exports = function (warp) {
    return base.defineModel(warp, 'Wiki', [
        base.column_id('cover_id'),
        base.column_id('content_id'),
        base.column_bigint('views'),
        base.column_varchar_100('name'),
        base.column_varchar_100('tag'),
        base.column_varchar_1000('description')
    ], {
        table: 'wikis'
    });
};
