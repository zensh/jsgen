var http = require('http'),
    fs = require('fs');

global.jsGen = {};  // 注册全局变量jsGen
jsGen.conf = module.exports.conf = require('./config/config');  // 注册rrestjs配置文件

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
jsGen.lib.Err = require('./lib/errmsg.js');
jsGen.lib.json =  require('./lib/json.js');
jsGen.lib.tools = require('./lib/tools.js');
jsGen.lib.converter = require('./lib/nodeAnyBaseConverter.js');
jsGen.lib.email = require('./lib/email.js');
jsGen.dao= {};
jsGen.dao.db = require('./dao/mongoDao.js').db;
jsGen.dao.article = require('./dao/articleDao.js');
jsGen.dao.collection = require('./dao/collectionDao.js');
jsGen.dao.index = require('./dao/indexDao.js');
jsGen.dao.message = require('./dao/messageDao.js');
jsGen.dao.tag = require('./dao/tagDao.js');
jsGen.dao.user = require('./dao/userDao.js');
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

jsGen.api.index.cache._init();
jsGen.api.user.cache._init();
jsGen.api.tag.cache._init();
jsGen.config = jsGen.api.index.cache;

fs.readFile('package.json', 'utf8', function(err, data) {
        if(err) restlog.error(err);
        if(data) {
            jsGen.info = JSON.parse(data);
            if(jsGen.info !== jsGen.config.info) jsGen.api.index.setGlobalConfig({info: jsGen.info}, function(err, doc) {
                if(err) console.log(err);
                else console.log(jsGen.config);
            });
        }
});

var server = http.createServer(function(req, res) {
    try {
        if(req.path[0] === 'api') {
            jsGen.api[req.path[1]][req.method](req, res);
            console.log(req.method + ' : ' + req.path);
        } else {
            res.file('/static/index.html');
            jsGen.api.index.setVisitHistory(req);
        }
    } catch(err) {
        jsGen.errlog.error(err); //有error，info，等多种等级
        res.r404();
    }
}).listen(jsGen.conf.listenPort);
