'use strict';
/*global global, require, process, module, jsGen, _restConfig*/

var fs = require('fs'),
    path = require('path'),
    zlib = require('zlib'),
    util = require('util'),
    http = require('http'),
    domain = require('domain'),
    serverDm = domain.create(),
    processPath = path.dirname(process.argv[1]),
    log4js = require('log4js');

global.jsGen = {}; // 注册全局变量jsGen
module.exports.conf = require('./config/config'); // 注册rrestjs配置文件
module.exports.conf_dev = require('./config/config_dev'); // 注册开发模式配置文件

serverDm.on('error', function (err) {
    delete err.domain;
    jsGen.serverlog.error(err);
});
serverDm.run(function () {
    jsGen.module = {};
    jsGen.module.os = require('os');
    jsGen.module.xss = require('xss');
    jsGen.module.then = require('thenjs');
    jsGen.module.marked = require('marked');
    jsGen.module.rrestjs = require('rrestjs');
    jsGen.module.mongoskin = require('mongoskin');
    jsGen.module.nodemailer = require('nodemailer');
    jsGen.serverlog = jsGen.module.rrestjs.restlog;
    jsGen.conf = jsGen.module.rrestjs.config;
    jsGen.lib = {};
    jsGen.lib.msg = require('./lib/msg.js');
    jsGen.lib.json = require('./lib/json.js');
    jsGen.lib.tools = require('./lib/tools.js');
    jsGen.lib.email = require('./lib/email.js');
    jsGen.lib.redis = require('./lib/redis.js');
    jsGen.lib.CacheLRU = require('./lib/cacheLRU.js');
    jsGen.lib.converter = require('./lib/anyBaseConverter.js');
    jsGen.Err = jsGen.lib.tools.Err;
    jsGen.dao = {};
    jsGen.dao.db = require('./dao/mongoDao.js').db;
    jsGen.dao.tag = require('./dao/tagDao.js');
    jsGen.dao.user = require('./dao/userDao.js');
    jsGen.dao.index = require('./dao/indexDao.js');
    jsGen.dao.article = require('./dao/articleDao.js');
    jsGen.dao.message = require('./dao/messageDao.js');
    jsGen.dao.collection = require('./dao/collectionDao.js');

    // FIXME：测试内容
    jsGen.dao.test = require('./dao/testDao.js');

    jsGen.thenErrLog = function (defer, err) {
        jsGen.serverlog.error(err);
    };

    var redis = jsGen.lib.redis,
        then = jsGen.module.then,
        each = jsGen.lib.tools.each,
        CacheLRU = jsGen.lib.CacheLRU,
        extend = jsGen.lib.tools.extend,
        resJson = jsGen.lib.tools.resJson,
        TimeLimitCache = jsGen.lib.redis.TimeLimitCache;

    then(function (defer) {
        redis.initConfig(jsGen.lib.json.GlobalConfig, defer); // 初始化config缓存
    }).then(function (defer, config) {
            jsGen.config = config;
            if (process.argv.indexOf('install') > 0) { // 带'install'参数启动则初始化MongoDB
                require('./api/install.js')().all(defer);
            } else { // Redis config缓存未赋值，则从MongoDB取值
                jsGen.dao.index.getGlobalConfig(defer);
            }
        }).then(function (defer, config) {
            each(jsGen.config, function (value, key, list) {
                if (key in config) {
                    list[key] = config[key]; // 写入config缓存
                }
            });
            defer(null, jsGen.config);
        }).then(function (defer, config) {
            var api = ['index', 'user', 'article', 'tag', 'collection', 'message', 'rebuild', 'test'];

            jsGen.cache = {};
            jsGen.cache.tag = new CacheLRU(config.tagCache);
            jsGen.cache.user = new CacheLRU(config.userCache);
            jsGen.cache.list = new CacheLRU(config.listCache);
            jsGen.cache.article = new CacheLRU(config.articleCache);
            jsGen.cache.comment = new CacheLRU(config.commentCache);
            jsGen.cache.message = new CacheLRU(config.messageCache);
            jsGen.cache.collection = new CacheLRU(config.collectionCache);
            jsGen.cache.timeInterval = new TimeLimitCache(config.TimeInterval, 'string', 'interval', false);
            jsGen.cache.pagination = new TimeLimitCache(config.paginationCache, 'array', 'pagination', true);
            jsGen.robotReg = new RegExp(config.robots || 'Baiduspider|Googlebot|BingBot|Slurp!', 'i');
            jsGen.api = {};
            each(api, function (x) {
                jsGen.api[x] = {}; // 初始化api引用，从而各api内部可提前获取其它api引用
            });
            each(api, function (x) {
                extend(jsGen.api[x], require('./api/' + x + '.js')); // 扩展各api的具体方法
            });
            fs.readFile(processPath + '/package.json', 'utf8', defer); // 读取软件信息
        }).then(function (defer, data) {
            data = JSON.parse(data);
            data.nodejs = process.versions.node;
            data.rrestjs = _restConfig._version;
            jsGen.config.info = data;
            redis.userCache.index.total(defer); // 读取user缓存
        }).then(function (defer, users) {
            var rebuild = jsGen.api.rebuild;
            if (!users) { // user缓存为空，则判断redis缓存为空，需要初始化
                // 初始化redis缓存
                then(function (defer2) {
                    rebuild.user().all(defer2);
                }).then(function (defer2) {
                        rebuild.tag().all(defer2);
                    }).then(function (defer2) {
                        rebuild.article().all(defer);
                    }).fail(defer);
            } else {
                defer();
            }
        }).then(function (defer) {
            http.createServer(function (req, res) {
                var dm = domain.create();

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
                            jsGen.serverlog.error(err);
                            res.sendjson(resJson(jsGen.Err(jsGen.lib.msg.MAIN.requestDataErr)));
                        }
                    } catch (error) {
                        delete error.domain;
                        jsGen.serverlog.error(error);
                        dm.dispose();
                    }
                }

                function router(req, res) {
                    if (req.path[0] === 'api' && jsGen.api[req.path[1]]) {
                        jsGen.api[req.path[1]][req.method.toUpperCase()](req, res); // 处理api请求
                    } else if (req.path[0].toLowerCase() === 'sitemap.xml') {
                        jsGen.api.article.sitemap(req, res); // 响应搜索引擎sitemap，动态生成
                    } else if (req.path[0].slice(-3).toLowerCase() === 'txt') {
                        // 直接响应static目录的txt文件，如robots.txt
                        then(function (defer) {
                            fs.readFile(processPath + jsGen.conf.staticFolder + req.path[0], 'utf8', defer);
                        }).then(function (defer, txt) {
                                res.setHeader('Content-Type', 'text/plain');
                                res.send(txt);
                            }).fail(res.throwError);
                    } else if (jsGen.robotReg.test(req.useragent)) {
                        jsGen.api.article.robot(req, res); // 处理搜索引擎请求
                    } else {
                        jsGen.config.visitors = 1; // 访问次数+1
                        res.setHeader('Content-Type', 'text/html');
                        if (jsGen.cache.indexTpl) {
                            res.send(jsGen.cache.indexTpl); // 响应首页index.html
                        } else {
                            then(function (defer) {
                                fs.readFile(processPath + jsGen.conf.staticFolder + '/index.html', 'utf8', defer);
                            }).then(function (defer, tpl) {
                                    jsGen.cache.indexTpl = tpl;
                                    res.send(jsGen.cache.indexTpl);
                                }).fail(res.throwError);
                        }
                    }
                }

                res.throwError = function (defer, err) { // 处理then.js捕捉的错误
                    if (!util.isError(err)) {
                        err = jsGen.Err(err);
                    }
                    errHandler(err, res, dm);
                };
                dm.on('error', function (err) { // 处理domain捕捉的错误
                    errHandler(err, res, dm);
                });
                dm.run(function () {
                    router(req, res); // 运行
                });
            }).listen(jsGen.conf.listenPort);
            console.log('jsGen start at ' + jsGen.conf.listenPort);
        }).fail(function (defer, err) {
            throw err;
        });
});
