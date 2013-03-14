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
    jsGen.module.platform = require('platform');
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
            that._update(doc);
            jsGen.cache = {};
            jsGen.cache.pagination = new jsGen.lib.CacheTL(jsGen.config.paginationCache[0] * 1000, jsGen.config.paginationCache[1]);
            jsGen.cache.timeInterval = new jsGen.lib.CacheTL(that.TimeInterval * 1000, 0, true);
            jsGen.cache.user = new jsGen.lib.CacheLRU(jsGen.config.userCache);
            jsGen.cache.article = new jsGen.lib.CacheLRU(jsGen.config.articleCache);
            jsGen.cache.comment = new jsGen.lib.CacheLRU(jsGen.config.commentCache);
            jsGen.cache.list = new jsGen.lib.CacheLRU(jsGen.config.listCache);
            jsGen.cache.tag = new jsGen.lib.CacheLRU(jsGen.config.tagCache);
            jsGen.cache.collection = new jsGen.lib.CacheLRU(jsGen.config.collectionCache);
            jsGen.cache.message = new jsGen.lib.CacheLRU(jsGen.config.messageCache);
            jsGen.api = {};
            jsGen.api.index = require('./api/index.js');
            jsGen.api.home = require('./api/home.js');
            jsGen.api.admin = require('./api/admin.js');
            jsGen.api.user = require('./api/user.js');
            jsGen.api.article = require('./api/article.js');
            jsGen.api.tag = require('./api/tag.js');
            jsGen.api.collection = require('./api/collection.js');
            jsGen.api.comment = require('./api/comment.js');
            jsGen.api.message = require('./api/message.js');
            jsGen.api.install = require('./api/install.js');

            fs.readFile('package.json', 'utf8', serverDm.intercept(function (data) {
                jsGen.config.info = JSON.parse(data);
                jsGen.config.info.nodejs = process.versions.node;
            }));
        }));
    }).call(jsGen.config);

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
                    res.r404();
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
                    console.log('update:' + Date.now());
                });
            } else {
                res.file('/static/index.html');
                jsGen.api.index.setVisitHistory(req);
            }
            console.log(req.session.Uid + ':' + req.method + ' : ' + req.path);
        });
    }).listen(jsGen.conf.listenPort);
});
