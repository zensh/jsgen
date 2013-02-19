var conf = module.exports.conf = require('./config/config'),
    http = require('http'),
    rrest = require('rrestjs'),
    fs = require('fs');

global.jsGen = {};  // 注册全局变量jsGen
jsGen.errlog = rrest.restlog,
jsGen.Err = require('./lib/errmsg.js');
jsGen.json =  require('./lib/json.js');
jsGen.db = require('./dao/mongoDao.js').db;
jsGen.tools = require('./lib/tools.js');
jsGen.converter = require('./lib/nodeAnyBaseConverter.js');
jsGen.email = require('./lib/email.js'),
jsGen.index = require('./api/index.js');
jsGen.home = require('./api/home.js');
jsGen.admin = require('./api/admin.js');
jsGen.user = require('./api/user.js');
jsGen.article = require('./api/article.js');
jsGen.tag = require('./api/tag.js');
jsGen.collection = require('./api/collection.js');
jsGen.comment = require('./api/comment.js');
jsGen.message = require('./api/message.js');
jsGen.install = require('./api/install.js');

jsGen.index.cache._init();
jsGen.user.cache._init();
jsGen.tag.cache._init();
jsGen.config = jsGen.index.cache;
fs.readFile('package.json', 'utf8', function(err, data) {
        if(err) restlog.error(err);
        if(data) {
            jsGen.info = JSON.parse(data);
            jsGen.index.setGlobalConfig({info: jsGen.info}, function(err, doc) {
                if(err) console.log(err);
                else console.log(jsGen.config);
            });
        }
});

var server = http.createServer(function(req, res) {
    try {
        if(req.path[0] === 'api') {
            jsGen[req.path[1]][req.method](req, res);
            console.log(req.method + ' : ' + req.path);
        } else {
            res.file('/static/index.html');
            jsGen.index.setVisitHistory(req);
        }
    } catch(err) {
        restlog.error(err); //有error，info，等多种等级
        res.r404();
    }
}).listen(rrest.config.listenPort);
