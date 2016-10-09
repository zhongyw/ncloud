'use strict';

/*
 * This is the default configuration for iTranswarp.js.
 *
 * DO NOT change it. Instead, make a copy and rename to:
 * "config_development.js" which is enabled in development environment.
 * "config_production.js" which is enabled in production environment.
 * Then edit settings you needed.
 */
module.exports = {
    // server domain name:
    domain: 'www.nbn8.com',
    // the theme used, default to 'default':
    theme: 'default',
    session: {
        cookie: 'isession',
        // used to generate secure session cookie, can be set to any random string:
        salt: 'iTranswarp.js',
        // signin expires in N seconds:
        expires: 7 * 24 * 3600,
        // use https for management:
        httpsForManagement: false
    },
    db: {
        // host or ip address of mysql, e.g. '192.168.1.123':
        host: '101.200.142.86',
        // port of mysql, default to 3306:
        port: 3306,
        // user to login to mysql, change to your mysql user:
        user: 'zhongyw',
        // password to login to mysql, change to your mysql password:
        password: 'zhongyw@2016g00d',
        // database used in mysql, default to 'itranswarp':
        database: 'zhongywdb',
        // timeout before initial a connection to mysql, default to 3 seconds:
        connectTimeout: 3000,
        // maximum concurrent db connections:
        connectionLimit: 20,
        // acquire timeout:
        acquireTimeout: 3000,
        // waiting queue size:
        queueLimit: 10
    },
    // NOT USED NOW:
    cdn: {
        static_prefix: ''
    },
    cache: {
        prefix: 'it/',
        // host or ip address of memcached:
        host: '127.0.0.1',
        // port of memcached, default to 11211:
        port: 11211,
        // connection timeout, default to 1 second:
        timeout: 1000,
        // retries when failed:
        retries: 3
    },
    // NOT USED NOW:
    queue: {
        // host or ip address of redis:
        host: '127.0.0.1',
        // port of redis, default to 6379:
        port: 6379
    },
    search: {
        provider: 'site_search',
        configs: {
            // default set to google search:
            search_url: 'https://www.google.com/search?ie=utf-8&q=%s',
            // other search engines:
            // baidu: 'http://www.baidu.com/s?ie=utf-8&wd=%s'
            // bing: 'http://www.bing.com/search?ie=utf-8&q=%s'
            domain: 'www.example.com'
        }
    },
    // oauth2 providers that allow sign in from other oauth2 providers:
    oauth2: {
        // e.g. facebook oauth2 configuration:
        /*'facebook': {
            'icon': 'facebook',
            'name': 'Facebook登录',
            'app_key': '1229544160397328',
            'app_secret': '7a981b2fbd96c9092ab4084df74cb52e',
            'redirect_uri': 'http://your-redirect-uri/config/in/facebook'
        },*/
        'weibo':{
            'icon': 'weibo',
            'name': '新浪微博登录',
            'app_key': '3273065943',
            'app_secret': 'f756a27fbb94ce8748c651a6d00b688e',
            'redirect_uri': 'http://www.nbn8.com/auth/callback/weibo'
        }
    },
    // END:
    END: 'END'
};
