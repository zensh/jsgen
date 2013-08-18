'use strict';
/*global global, require, process, module, jsGen, _restConfig*/

var domain = require('domain'),
    http = require('http'),
    fs = require('fs'),
    path = require('path'),
    zlib = require('zlib'),
    processPath = path.dirname(process.argv[1]),
    serverDm = domain.create();

global.jsGen = {}; // 注册全局变量jsGen
jsGen.version = '0.5.8-dev';

serverDm.on('error', function (err) {
    delete err.domain;
    jsGen.errlog.error(err);
});
serverDm.run(function () {
    jsGen.conf = module.exports.conf = require('./config/config'); // 注册rrestjs配置文件
    jsGen.module = {};
    jsGen.module.rrestjs = require('rrestjs');
    jsGen.module.marked = require('marked');
    jsGen.module.mongoskin = require('mongoskin');
    jsGen.module.nodemailer = require('nodemailer');
    jsGen.module.then = require('then.js');
    jsGen.module.xss = require('xss');
    jsGen.errlog = jsGen.module.rrestjs.restlog;
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
    jsGen.config = {};

    var throwError = jsGen.lib.tools.throwError,
        then = jsGen.module.then,
        resJson = jsGen.lib.tools.resJson;

    then(function (defer) {
        jsGen.dao.index.getGlobalConfig(defer);
    }).then(function (defer, config) {
        defer(null, config);
    }, function (defer, err) {
        var install = require('./api/install.js');

        install().then(function () {
            defer(null, jsGen.lib.json.GlobalConfig);
        }).fail(defer);
    }).then(function (defer, config) {
        var each = jsGen.lib.tools.each,
            extend = jsGen.lib.tools.extend,
            api = ['index', 'user', 'article', 'tag', 'collection', 'message', 'rebuild'];

        jsGen.config._update = function (obj) {
            jsGen.lib.tools.union(this, obj);
            this._initTime = Date.now();
        };
        jsGen.config._update(config);
        jsGen.cache = {};
        jsGen.cache.pagination = new jsGen.lib.redis.TimeLimitCache(config.paginationCache[0], 'array', 'pagination', true);
        jsGen.cache.timeInterval = new jsGen.lib.redis.TimeLimitCache(config.TimeInterval, 'string', 'interval', false);
        jsGen.cache.user = new jsGen.lib.CacheLRU(config.userCache);
        jsGen.cache.article = new jsGen.lib.CacheLRU(config.articleCache);
        jsGen.cache.comment = new jsGen.lib.CacheLRU(config.commentCache);
        jsGen.cache.list = new jsGen.lib.CacheLRU(config.listCache);
        jsGen.cache.tag = new jsGen.lib.CacheLRU(config.tagCache);
        jsGen.cache.collection = new jsGen.lib.CacheLRU(config.collectionCache);
        jsGen.cache.message = new jsGen.lib.CacheLRU(config.messageCache);
        jsGen.cache.updateList = [];
        jsGen.cache.hotsList = [];
        jsGen.cache.hotCommentsList = [];
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
        var server = http.createServer(function (req, res) {
            var dm = domain.create();

            dm.on('error', function (err) {
                console.error(err);
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
                        console.log(req.session.Uid + ':' + req.method + ' : ' + req.path);
                        jsGen.errlog.error(err);
                        res.sendjson(resJson(jsGen.Err(jsGen.lib.msg.requestDataErr)));
                    }
                } catch (error) {
                    delete error.domain;
                    //console.log('CatchERR:******************');
                    jsGen.errlog.error(error);
                    dm.dispose();
                }
            });
            dm.run(function () {
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
                        }).fail(throwError);
                    }
                }
            });
        }).listen(jsGen.module.rrestjs.config.listenPort);
    }).fail(throwError);
});