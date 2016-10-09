'use strict';

// app.js
process.productionMode = (process.env.NODE_ENV === 'production');

var
    _ = require('lodash'),
    fs = require('fs'),
    swig = require('swig'),
    koa = require('koa'),
    route = require('koa-route'),
    bodyParser = require('koa-bodyparser'),
    api = require('./api'),
    i18n = require('./i18n'),
    auth = require('./auth'),
    config = require('./config'),
    constants = require('./constants'),
    fileUtil = require('./utils/FileUtil'),
    api_console = require('./api_console'),
    cors = require('koa-cors'),

    // global app:
    app = koa();

var db = require('./db'),
    User = db.user,
    hostname = require('os').hostname(),
    activeTheme = config.theme;

app.name = 'ncloud';
app.proxy = true;
// set view template:
var swigTemplatePath = __dirname + '/views/';
swig.setDefaults({
    cache: process.productionMode ? 'memory' : false
});

// set i18n filter:
swig.setFilter('i18n', function (input) {
    return input;
});

// set min filter:
swig.setFilter('min', function (input) {
    if (input <= 60) {
        return input + ' minutes';
    }
    var
        h = parseInt(input / 60),
        m = input % 60;
    return h + ' hours ' + m + ' minutes';
});

// serve static files:
function serveStatic() {
    var root = __dirname;
    app.use(function* (next) {
        var
            method = this.request.method,
            path = this.request.path,
            pos;
        if ((method === 'GET' && (path.indexOf('/static/') === 0 || path === '/favicon.ico')) || path.indexOf('/app/') === 0 ) {
            console.log('>>> static path: ' + path);
            pos = path.lastIndexOf('.');
            if (pos !== (-1)) {
                this.type = path.substring(pos);
            }
            this.body = fs.createReadStream(root + path);
            return;
        }
        else {
            yield next;
        }
    });
}

if (process.productionMode) {
    app.on('error', function (err) {
        console.error(new Date().toISOString() + ' [Unhandled ERR] ', err);
    });
}
else {
    serveStatic();
}

function logJSON(data) {
    if (data) {
        console.log(JSON.stringify(data, function (key, value) {
            if (key === 'image' && value) {
                return value.substring(0, 20) + ' (' + value.length + ' bytes image data) ...';
            }
            return value;
        }, '  '));
    }
    else {
        console.log('(EMPTY)');
    }
}

// load i18n:
var i18nT = i18n.getI18NTranslators('./i18n');

// middlewares:
var static_prefix = config.cdn.static_prefix;

app.use(auth.$userIdentityParser);

// 'content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
// 无法获取到this.request.body的值,
// 应该是koa-bodyparser插件的问题， 无法解析值有方括号的参数
// 其默认值 var enableTypes = opts.enableTypes || ['json', 'form'];

app.use(bodyParser());

var isDevelopment = !process.productionMode;

app.use(cors());

app.use(function* theMiddleware(next) {
    var
        request = this.request,
        response = this.response,
        method = request.method,
        path = request.path,
        prefix8 = path.substring(0, 8),
        prefix4 = path.substring(0, 4),
        start = Date.now(),
        execTime,
        isApi = path.indexOf('/api/') === 0,
        isApp = path.indexOf('/app/') === 0;
    console.log('[%s] %s %s', new Date().toISOString(), method, path);

    if (prefix8 === '/manage/' && request.path !== '/manage/signin') {
        if (! request.user || request.user.role > constants.role.CONTRIBUTOR) {
            response.redirect('/manage/signin');
            return;
        }
    }

    if (isApi) {
        if (isDevelopment) {
            console.log('[API Request]');
            logJSON(request.body);
        }
    }else if(isApp){

    }
    else {
        this.render = function (templ, model) {
            model._ = i18n.createI18N(request.get('Accept-Language') || 'en', i18nT);
            model.__static_prefix__ = static_prefix;
            model.__user__ = request.user;
            model.__time__ = Date.now();
            model.__theme__ = activeTheme;
            model.__request__ = request;
            var renderedHtml = swig.renderFile(swigTemplatePath + templ, model);
            response.body = renderedHtml;
            response.type = '.html';
        };
    }
    try {
        yield next;
        execTime = String(Date.now() - start);
        response.set('X-Cluster-Node', hostname);
        response.set('X-Execution-Time', execTime);
        console.log('X-Execution-Time: ' + execTime);
        if (response.status === 404) {
            this.throw(404);
        }
    }
    catch (err) {
        execTime = String(Date.now() - start);
        response.set('X-Execution-Time', execTime);
        console.log('X-Execution-Time: ' + execTime);
        console.log('[Error] error when handle url: ' + request.path);
        console.log(err.stack);
        response.set('X-Execution-Time', String(Date.now() - start));
        if (err.code && err.code === 'POOL_ENQUEUELIMIT') {
            // force kill node process:
            console.error(new Date().toISOString() + ' [FATAL] POOL_ENQUEUELIMIT, process exit 1.');
            process.exit(1);
        }
        if (isApi) {
            // API error:
            response.body = {
                error: err.error || (err.status === 404 ? '404' : '500'),
                data: err.data || '',
                message: err.status === 404 ? 'API not found.' : (err.message || 'Internal error.')
            };
        }
        else if (err.status === 404 || err.error === 'entity:notfound') {
            response.body = '404 Not Found'; //this.render('404.html', {});
        }
        else {
            console.error(new Date().toISOString() + ' [ERROR] 500 ', err.stack);
            response.body = '500 Internal Server Error'; //this.render('500.html', {});
        }
        if (execTime > 1000) {
            console.error(new Date().toISOString() + ' [ERROR] X-Execution-Time too long: ' + execTime);
        }
    }
    if (isApi) {
        if (isDevelopment) {
            console.log('[API Response]');
            logJSON(response.body);
        }
    }
});



function registerRoute(method, path, fn) {
    if (method === 'GET') {
        console.log('found route: GET %s', path);
        app.use(route.get(path, fn));
    }
    else if (method === 'POST') {
        console.log('found route: POST %s', path);
        app.use(route.post(path, fn));
    }
}

// scan all modules:

function loadControllerFilenames() {
    return fileUtil.getAllControllers({fullPath: true,trimExt: true});
}

function loadControllers() {
    var ctrls = {};
    _.each(loadControllerFilenames(), function (filename) {
        ctrls[filename] = require(filename);
    });
    return ctrls;
}

var controllers = loadControllers();

_.each(controllers, function (ctrl, fname) {
    _.each(ctrl, function (fn, path) {
        var ss, verb, route, docs;
        ss = path.split(' ', 2);
        if (ss.length !== 2) {
            console.log('Not a route definition: ' + path);
            return;
        }
        verb = ss[0];
        route = ss[1];
        if (verb === 'GET') {
            console.log('found: GET ' + route + ' in ' + fname + '.js');
            registerRoute('GET', route, fn);
        } else if (verb === 'POST') {
            console.log('found: POST ' + route + ' in ' + fname + '.js');
            registerRoute('POST', route, fn);
        } else {
            console.log('error: Invalid verb: ' + verb);
            return;
        }
        if (route.indexOf('/api/') === 0) {
            docs = fn.toString().match(/[\w\W]*\/\*\*?([\d\D]*)\*?\*\/[\w\W]*/);
            if (docs) {
                api_console.processApiDoc(fname, verb, route, docs[1]);
            } else {
                console.log('WARNING: no api docs found for api: ' + route);
            }
        }
    });
});

app.listen(3000);
console.log('application start in %s mode at 3000...', (process.productionMode ? 'production' : 'development'));
