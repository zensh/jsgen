'use strict';
/*global global, require, process, module, jsGen, _restConfig*/

var fs = require('fs'),
    path = require('path'),
    zlib = require('zlib'),
    util = require('util'),
    http = require('http'),
    domain = require('domain'),
    serverDm = domain.create(),
    processPath = path.dirname(process.argv[1]);

global.jsGen = {}; // 注册全局变量jsGen
module.exports.conf = require('./config/config'); // 注册rrestjs配置文件

serverDm.on('error', function (error) {
    delete error.domain;
    console.error(error);
    jsGen.serverlog.error(error);
});

serverDm.run(function () {
    jsGen.module = {};
    jsGen.module.os = require('os');
    jsGen.module.xss = require('xss');
    jsGen.module.then = require('thenjs');
    jsGen.module.marked = require('marked');
    jsGen.module.rrestjs = require('rrestjs');
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

    jsGen.thenErrLog = function (cont, err) {
        console.error(err);
        jsGen.serverlog.error(err);
    };

    var redis = jsGen.lib.redis,
        then = jsGen.module.then,
        each = jsGen.lib.tools.each,
        CacheLRU = jsGen.lib.CacheLRU,
        extend = jsGen.lib.tools.extend,
        resJson = jsGen.lib.tools.resJson,
        TimeLimitCache = jsGen.lib.redis.TimeLimitCache;

    function exit() {
        redis.close();
        jsGen.dao.db.close();
        return process.exit(1);
    }

    // 带'install'参数启动则初始化MongoDB，完成后退出
    if (process.argv.indexOf('install') > 0) {
        require('./lib/install.js')().then(function () {
            console.log('jsGen installed!');
            return exit();
        }).fail(jsGen.thenErrLog);
        return;
    }

    // v0.7.5升级至v0.7.6 更新账号密码
    if (process.argv.indexOf('update-passwd') > 0) {
        require('./patch/passwd_0.7.5-0.7.6.js')().then(function () {
            return exit();
        }).fail(jsGen.thenErrLog);
        return;
    }

    then.parallel([
        function (cont) {
            // 连接 mongoDB，读取config
            jsGen.dao.index.getGlobalConfig(cont);
        },
        function (cont) {
            // 连接 redis
            redis.connect(cont);
        }
    ]).then(function (cont, result) {
        // 初始化config缓存
        redis.initConfig(result[0], cont);
    }).then(function (cont, config) {
        jsGen.config = config;
        redis.userCache.index.total(cont); // 读取user缓存
    }).then(function (cont, users) {
        if (!users || process.argv.indexOf('recache') > 0) {
            // user缓存为空，则判断redis缓存为空，需要初始化
            // 或启动时指定了recache，手动初始化
            var recache = require('./lib/recache.js');
            recache(cont);
        } else {
            cont();
        }
    }).parallel([
        function (cont) {
            fs.readFile(processPath + '/package.json', 'utf8', cont); // 读取软件版本信息
        },
        function (cont) {
            fs.readFile(processPath + jsGen.conf.staticFolder + '/index.html', 'utf8', cont); // 读取首页模板
        },
        function (cont) {
            fs.readFile(processPath + '/views/robots.txt', 'utf8', cont); // 读取robots.txt
        }
    ]).then(function (cont, result) {
        var api = ['index', 'user', 'article', 'tag', 'collection', 'message'],
            config = jsGen.config;

        // 初始化内存缓存
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

        var packageInfo = JSON.parse(result[0]);
        packageInfo.nodejs = process.versions.node;
        packageInfo.rrestjs = _restConfig._version;
        jsGen.config.info = packageInfo;

        jsGen.cache.indexTpl = result[1];
        jsGen.cache.robotsTxt = result[2];

        // 数据准备就绪，初始化 http server

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
            var path = req.path[0].toLowerCase();

            if (path === 'api' && jsGen.api[req.path[1]]) {
                jsGen.api[req.path[1]][req.method](req, res); // 处理api请求
            } else if (jsGen.robotReg.test(req.useragent)) {
                jsGen.api.article.robot(req, res); // 处理搜索引擎请求
            } else if (path === 'sitemap.xml') {
                jsGen.api.article.sitemap(req, res); // 响应搜索引擎sitemap，动态生成
            } else if (path === 'robots.txt') {
                res.setHeader('Content-Type', 'text/plain');
                res.send(jsGen.cache.robotsTxt);
            } else {
                jsGen.config.visitors = 1; // 访问次数+1
                res.setHeader('Content-Type', 'text/html');
                res.send(jsGen.cache.indexTpl); // 响应首页index.html
            }
        }

        function handler(req, res) {
            var dm = domain.create();

            res.throwError = function (cont, error) { // 处理then.js捕捉的错误
                if (!util.isError(error)) {
                    error = jsGen.Err(error);
                }
                errHandler(error, res, dm);
            };
            dm.on('error', function (error) { // 处理domain捕捉的错误
                errHandler(error, res, dm);
            });
            dm.run(function () {
                router(req, res); // 运行
            });
        }

        http.createServer(handler).listen(jsGen.conf.listenPort);
        console.log('jsGen start at ' + jsGen.conf.listenPort);
    }).fail(function (cont, error) {
        console.error(error);
        jsGen.serverlog.error(error);
        return exit();
    });
});
