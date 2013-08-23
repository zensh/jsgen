'use strict';
/*global global, require, process, module, jsGen, _restConfig*/

var domain = require('domain'),
    http = require('http'),
    fs = require('fs'),
    path = require('path'),
    zlib = require('zlib'),
    util = require('util'),
    processPath = path.dirname(process.argv[1]),
    serverDm = domain.create();

global.jsGen = {}; // 注册全局变量jsGen
jsGen.version = '0.5.8-dev';

serverDm.on('error', function (err) {
    delete err.domain;
    jsGen.serverlog.error(err);
});
serverDm.run(function () {
    jsGen.conf = module.exports.conf = require('./config/config'); // 注册rrestjs配置文件
    jsGen.module = {};
    jsGen.module.os = require('os');
    jsGen.module.rrestjs = require('rrestjs');
    jsGen.module.marked = require('marked');
    jsGen.module.mongoskin = require('mongoskin');
    jsGen.module.nodemailer = require('nodemailer');
    jsGen.module.then = require('thenjs');
    jsGen.module.xss = require('xss');
    jsGen.serverlog = jsGen.module.rrestjs.restlog;
    jsGen.lib = {};
    jsGen.lib.msg = require('./lib/msg.js');
    jsGen.lib.json = require('./lib/json.js');
    jsGen.lib.tools = require('./lib/tools.js');
    jsGen.lib.CacheLRU = require('./lib/cacheLRU.js');
    jsGen.lib.CacheTL = require('./lib/cacheTL.js');
    jsGen.lib.converter = require('./lib/anyBaseConverter.js');
    jsGen.lib.email = require('./lib/email.js');
    jsGen.lib.redis = require('./lib/redis.js');
    jsGen.Err = jsGen.lib.tools.Err;
    jsGen.dao = {};
    jsGen.dao.db = require('./dao/mongoDao.js').db;
    jsGen.dao.article = require('./dao/articleDao.js');
    jsGen.dao.collection = require('./dao/collectionDao.js');
    jsGen.dao.index = require('./dao/indexDao.js');
    jsGen.dao.message = require('./dao/messageDao.js');
    jsGen.dao.tag = require('./dao/tagDao.js');
    jsGen.dao.user = require('./dao/userDao.js');

    var redis = jsGen.lib.redis,
        then = jsGen.module.then,
        each = jsGen.lib.tools.each,
        extend = jsGen.lib.tools.extend,
        resJson = jsGen.lib.tools.resJson,
        throwError = jsGen.lib.tools.throwError,
        CacheLRU = jsGen.lib.CacheLRU,
        TimeLimitCache = jsGen.lib.redis.TimeLimitCache;

    then(function (defer) {
        jsGen.dao.index.getGlobalConfig(defer);
    }).then(function (defer, config) {
        defer(null, config);
    }, function (defer, err) {
        // 初始化数据库
        require('./api/install.js')().then(function () {
            defer(null, jsGen.lib.json.GlobalConfig);
        }).fail(defer);
    }).then(function (defer, config) {
        var api = ['index', 'user', 'article', 'tag', 'collection', 'message', 'rebuild'];

        jsGen.config = config;
        jsGen.cache = {};
        jsGen.cache.pagination = new TimeLimitCache(config.paginationCache[0], 'array', 'pagination', true);
        jsGen.cache.timeInterval = new TimeLimitCache(config.TimeInterval, 'string', 'interval', false);
        jsGen.cache.user = new CacheLRU(config.userCache);
        jsGen.cache.article = new CacheLRU(config.articleCache);
        jsGen.cache.comment = new CacheLRU(config.commentCache);
        jsGen.cache.list = new CacheLRU(config.listCache);
        jsGen.cache.tag = new CacheLRU(config.tagCache);
        jsGen.cache.collection = new CacheLRU(config.collectionCache);
        jsGen.cache.message = new CacheLRU(config.messageCache);
        jsGen.robot = {};
        jsGen.robot.reg = new RegExp(config.robots || 'Baiduspider|Googlebot|BingBot|Slurp!', 'i');
        jsGen.api = {};
        each(api, function (x) {
            jsGen.api[x] = {};
        });
        each(api, function (x) {
            extend(jsGen.api[x], require('./api/' + x + '.js'));
        });
        fs.readFile(processPath + '/package.json', 'utf8', defer);
    }).then(function (defer, data) {
        jsGen.config.info = JSON.parse(data);
        jsGen.config.info.version = jsGen.version;
        jsGen.config.info.nodejs = process.versions.node;
        jsGen.config.info.rrestjs = _restConfig._version;
        redis.userCache.index.total(defer);
    }).then(function (defer, users) {
        var rebuild = jsGen.api.rebuild;
        if (!users) {
            // 初始化redis缓存
            then(function (defer2) {
                rebuild.user().all(defer2);
            }).then(function (defer2) {
                rebuild.tag().all(defer2);
            }).then(function (defer2) {
                rebuild.article().all(defer);
            }).fail(throwError);
        } else {
            defer();
        }
    }).then(function (defer) {
        http.createServer(function (req, res) {
            var dm = domain.create();

            res.throwError = function (defer, err) {
                if (typeof err !== 'object') {
                    err = jsGen.Err(err);
                }
                dm.intercept()(err);
            };
            dm.on('error', function (err) {
                errHandler(err, res, dm);
            });
            dm.run(function () {
                router(req, res, dm);
            });
        }).listen(jsGen.module.rrestjs.config.listenPort);
        console.log('jsGen start!');

        function errHandler(err, res, dm) {
            delete err.domain;

            try {
                res.on('finish', function () {
                    //jsGen.dao.db.close();
                    process.nextTick(function () {
                        dm.dispose();
                    });
                });
                if (err.hasOwnProperty('name')) {
                    res.sendjson(resJson(err));
                } else {
                    //console.log('ReqErr:******************');
                    jsGen.serverlog.error(err);
                    res.sendjson(resJson(jsGen.Err(jsGen.lib.msg.requestDataErr)));
                }
            } catch (error) {
                delete error.domain;
                //console.log('CatchERR:******************');
                jsGen.serverlog.error(error);
                dm.dispose();
            }
        }

        function router(req, res, dm) {
            if (req.path[0] === 'api' && jsGen.api[req.path[1]]) {
                jsGen.api[req.path[1]][req.method.toUpperCase()](req, res, dm);
            } else if (jsGen.robot.reg.test(req.useragent)) {
                jsGen.api.article.robot(req, res, dm);
            } else {
                jsGen.config.visitors += 1;
                jsGen.dao.index.setGlobalConfig({
                    visitors: 1
                });
                res.setHeader("Content-Type", "text/html");
                if (jsGen.cache.indexTpl) {
                    res.send(jsGen.cache.indexTpl);
                } else {
                    then(function (defer) {
                        fs.readFile(processPath + '/static/index.html', 'utf8', defer);
                    }).then(function (defer, tpl) {
                        jsGen.cache.indexTpl = tpl.replace(/_jsGenVersion_/g, jsGen.version);
                        res.send(jsGen.cache.indexTpl);
                    }).fail(res.throwError);
                }
            }
        }
    }).fail(throwError);
});