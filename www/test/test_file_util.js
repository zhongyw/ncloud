'use strict';

var should = require('should'),
    _ = require('lodash'),
    fileUtils = require('../utils/FileUtil');

describe('#FileUtil', function(){

  it('getDirectories', function(){
    var dirs = fileUtils.getDirectories(__dirname + "/../");
    //should(a).be.ok;
    dirs.should.containEql('app');
    dirs.should.containEql('test');
  });

  it('getAllJsFile', function(){
    var jss = fileUtils.getAllJsFile(__dirname + "/../");
    jss.should.containEql('test_file_util.js');
    jss.should.containEql('FileUtil.js');
  });

  it('getAllControllers', function(){
    var jss = fileUtils.getAllControllers();
    jss.should.be.ok;
    jss.should.containEql('userApi.js');
  });

  it('getAllControllers  with full path', function(){
    var jss = fileUtils.getAllControllers({fullPath: true});
    jss.should.be.ok;
    _.each(jss, function(f){
      f.should.containEql('/controllers/');
    });
  });

  it('getAllControllers  with trim .js', function(){
    var jss = fileUtils.getAllControllers({fullPath: true, trimExt: true});
    jss.should.be.ok;
    _.each(jss, function(f){
      f.should.containEql('/controllers/');
      f.should.not.containEql('.js');
    });
  });

  it('getAllControllers  with full path and trim .js', function(){
    var jss = fileUtils.getAllControllers({trimExt: true});
    jss.should.be.ok;
    _.each(jss, function(f){
      f.should.not.containEql('/controllers/');
      f.should.not.containEql('.js');
    });
  });

  it('getAllModels', function(){
    var jss = fileUtils.getAllModels();
    jss.should.be.ok;
    jss.should.containEql('user.js');
  })

  it('getAllModels with full path', function(){
    var jss = fileUtils.getAllModels({fullPath: true});
    jss.should.be.ok;
    _.each(jss, function(f){
      f.should.containEql('/models/');
    });
  })

  it('getAllModels with trim .js', function(){
    var jss = fileUtils.getAllModels({trimExt: true});
    jss.should.be.ok;
    _.each(jss, function(f){
      f.should.not.containEql('/models/');
      f.should.not.containEql('.js');
    });
  })

  it('getAllModels with full path and trim .js', function(){
    var jss = fileUtils.getAllModels({fullPath: true, trimExt: true});
    jss.should.be.ok;
    _.each(jss, function(f){
      f.should.containEql('/models/');
      f.should.not.containEql('.js');
    });
  })
})
