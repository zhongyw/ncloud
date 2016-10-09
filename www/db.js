'use strict';

// init mysql-warp and expose all models under dir 'models':

console.log('init mysql with mysql-warp...');

var
    _ = require('lodash'),
    Warp = require('mysql-warp'),
    next_id = require('./_id'),
    config = require('./config'),
    thunkify = require('thunkify'),
    fileUtil = require('./utils/FileUtil');

// init database:
var warp = Warp.create(config.db);

warp.$transaction = thunkify(warp.transaction);
warp.$query = thunkify(warp.query);
warp.$queryNumber = thunkify(warp.queryNumber);
warp.$update = thunkify(warp.update);

var baseModel = warp.__model;

baseModel.$find = thunkify(baseModel.find);
baseModel.$findAll = thunkify(baseModel.findAll);
baseModel.$findNumber = thunkify(baseModel.findNumber);
baseModel.$create = thunkify(baseModel.create);
baseModel.$update = thunkify(baseModel.update);
baseModel.$destroy = thunkify(baseModel.destroy);

// export warp and all model objects:
var dict = {
    warp: warp,
    next_id: next_id
};

// load all models:

var models = fileUtil.getAllModels({fullPath: true, trimExt: true});

_.each(models, function (modelName) {
    console.log('found model: ' + modelName);
    var model = require(modelName)(warp);
    // thunkify all database operations:
    _.each(['find', 'findAll', 'findNumber', 'create', 'update', 'destroy'], function (key) {
        model['$' + key] = thunkify(model[key]);
    });
    dict[modelName] = model;
});

module.exports = dict;
