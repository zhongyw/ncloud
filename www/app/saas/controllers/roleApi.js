/**
 * Created by zhongyongwei on 16/5/27.
 **/

'use strict';

var
    _ = require('lodash'),
    api = require('../../../api'),
    db = require('../../../db'),
    helper = require('../../../helper'),
    constants = require('../../../constants'),
    json_schema = require('../../../json_schema');

module.exports = {
    'GET /api/roles': function* (){
        this.body = {
            roles:constants.role
        };
    }
}
