var domain = require('domain'),
    http = require('http'),
    fs = require('fs');
var serverDm = domain.create();

serverDm.on('error', function (err) {
    delete err.domain;
    console.log('SevERR:******************');
    jsGen.errlog.error(err);
});
serverDm.run(function () {
    global.jsGen = {}; // 注册全局变量jsGen
    jsGen.conf = module.exports.conf = require('./config/config'); // 注册rrestjs配置文件

    jsGen.module = {};
    jsGen.module.rrestjs = require('rrestjs');
    jsGen.module.marked = require('marked');
    jsGen.module.mongoskin = require('mongoskin');
    jsGen.module.nodemailer = require('nodemailer');
    //jsGen.module.qiniu = require('qiniu');
    jsGen.module.xss = require('xss');
    jsGen.errlog = jsGen.module.rrestjs.restlog;
    jsGen.lib = {};
    jsGen.lib.tools = require('./lib/tools.js');
    jsGen.lib.CacheLRU = require('./lib/cacheLRU.js');
    jsGen.lib.CacheTL = require('./lib/cacheTL.js');
    jsGen.lib.msg = require('./lib/msg.js');
    jsGen.lib.json = require('./lib/json.js');
    jsGen.lib.converter = require('./lib/anyBaseConverter.js');
    jsGen.lib.email = require('./lib/email.js');
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
    (function () {
        var that = this;
        this._update = function (obj) {
            jsGen.lib.tools.union(this, obj);
            this._initTime = Date.now();
        };
        jsGen.dao.index.getGlobalConfig(serverDm.intercept(function (doc) {
            if (!doc) {
                var install = require('./api/install.js');
                install(function () {
                    var doc = jsGen.lib.json.GlobalConfig;
                    todo(doc);
                });
            } else todo(doc);

            function todo(doc) {
                that._update(doc);
                jsGen.cache = {};
                jsGen.cache.pagination = new jsGen.lib.CacheTL(doc.paginationCache[0] * 1000, doc.paginationCache[1]);
                jsGen.cache.timeInterval = new jsGen.lib.CacheTL(doc.TimeInterval * 1000, 0, true);
                jsGen.cache.user = new jsGen.lib.CacheLRU(doc.userCache);
                jsGen.cache.article = new jsGen.lib.CacheLRU(doc.articleCache);
                jsGen.cache.comment = new jsGen.lib.CacheLRU(doc.commentCache);
                jsGen.cache.list = new jsGen.lib.CacheLRU(doc.listCache);
                jsGen.cache.tag = new jsGen.lib.CacheLRU(doc.tagCache);
                jsGen.cache.collection = new jsGen.lib.CacheLRU(doc.collectionCache);
                jsGen.cache.message = new jsGen.lib.CacheLRU(doc.messageCache);
                jsGen.cache.updateList = [];
                jsGen.cache.hotsList = [];
                jsGen.cache.hotCommentsList = [];
                jsGen.robot = {};
                jsGen.robot.reg = new RegExp(doc.robots || 'Baiduspider|Googlebot|BingBot|Slurp!', 'i');
                jsGen.api = {};
                jsGen.api.index = require('./api/index.js');
                jsGen.api.user = require('./api/user.js');
                jsGen.api.article = require('./api/article.js');
                jsGen.api.tag = require('./api/tag.js');
                jsGen.api.collection = require('./api/collection.js');
                jsGen.api.message = require('./api/message.js');
                fs.readFile('package.json', 'utf8', serverDm.intercept(function (data) {
                    jsGen.config.info = JSON.parse(data);
                    jsGen.config.info.nodejs = process.versions.node;
                }));
                createServer();
            };
        }));
    }).call(jsGen.config);

    function createServer() {
        var server = http.createServer(function (req, res) {
            var dm = domain.create();
            res.on('finish', function () {
                //jsGen.dao.db.close();
                process.nextTick(function () {
                    dm.dispose();
                    console.log('dispose:' + Date.now());
                });
            });
            dm.add(req);
            dm.add(res);
            dm.on('error', function (err) {
                delete err.domain;
                err.type = 'error';
                try {
                    res.on('finish', function () {
                        //jsGen.dao.db.close();
                        process.nextTick(function () {
                            dm.dispose();
                        });
                    });
                    if (err.hasOwnProperty('name')) {
                        res.sendjson({
                            err: err
                        });
                    } else {
                        res.sendjson({
                            err: {
                                name: '请求错误',
                                message: '对不起，请求出错了！',
                                type: 'error',
                                url: '/'
                            }
                        });
                        console.log('ReqErr:******************');
                        jsGen.errlog.error(err);
                    }
                } catch (err) {
                    delete err.domain;
                    console.log('CatchERR:******************');
                    jsGen.errlog.error(err);
                    dm.dispose();
                }
            });
            dm.run(function () {
                if (req.path[0] === 'api') {
                    jsGen.api[req.path[1]][req.method](req, res, dm);
                    process.nextTick(function () {
                        jsGen.api.index.updateOnlineCache(req);
                    });
                } else if (jsGen.robot.reg.test(req.useragent)) {
                    jsGen.api.article.robot(req, res, dm);
                } else {
                    jsGen.config.visitors += 1;
                    jsGen.dao.index.setGlobalConfig({
                        visitors: 1
                    });
                    res.file('/static/index.html');
                }
                console.log(req.session.Uid + ':' + req.method + ' : ' + req.path);
            });
        }).listen(jsGen.conf.listenPort);
    };
});
