var fs = require("fs"),
    path = require("path"),
    _ = require('lodash');

var srcpath = __dirname + "/../";
const appDir = __dirname + "/../app/",
      controllerDir = "controllers/";

function getDirectories(srcpath){
  return fs.readdirSync(srcpath).filter(function(file){
    return fs.statSync(path.join(srcpath, file)).isDirectory()
              && file !== "node_modules";
  });
}

function getAllJsFile(srcpath){

  var jsFiles = [],
      re = new RegExp("^[A-Za-z][A-Za-z0-9\\_]*\\.js$"),
      files  = [];

  files = fs.readdirSync(srcpath);
  var jss = _.filter(files, function (f) {
      return re.test(f);
  });

  jsFiles = jsFiles.concat(jss);

  var dirs = getDirectories(srcpath);

  _.each(dirs, function(dir){

    var pathNext = path.join(srcpath, dir);
    if(fs.statSync(pathNext).isDirectory()){
      jsFiles = jsFiles.concat(getAllJsFile(pathNext));
    }
  })
  return jsFiles;
}

function getAppDirFiles(dirName, opts){
  opts = opts || {};
  var apps = getDirectories(appDir);

  var files = [];
  _.each(apps, function(app){
      var path = appDir + app + "/" + dirName + "/";
      var jss = getAllJsFile(path);
      if(opts.fullPath){
        jss = _.map(jss, function(f){
          return f = path + f;
        })
      }
      if(opts.trimExt){
        jss = _.map(jss, function(f){
          return f.substring(0, f.lastIndexOf("."));
        });
      }
      files = files.concat(jss);
  });


  return files;
}

function getAllControllers(opts){
  return getAppDirFiles("controllers", opts);
}

function getAllModels(opts){
  return getAppDirFiles("models",opts);
}

module.exports = {
  getDirectories: getDirectories,
  getAllJsFile: getAllJsFile,
  getAllControllers: getAllControllers,
  getAllModels: getAllModels
}
