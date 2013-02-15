var conf = module.exports.conf = require('./config/config'),
    http = require('http'),
    rrest = require('rrestjs'),
    jsGen = {};

jsGen.index = require('./api/index.js');
jsGen.home = require('./api/home.js');
jsGen.admin = require('./api/admin.js');
jsGen.user = require('./api/user.js');
jsGen.article = require('./api/article.js');
jsGen.tag = require('./api/tag.js');
jsGen.collection = require('./api/collection.js');
jsGen.comment = require('./api/comment.js');
jsGen.message = require('./api/message.js');
//jsGen.test = require('./api/test.js');
jsGen.install = require('./api/install.js');

jsGen.index.cache._init();
jsGen.user.cache._init();
jsGen.tag.cache._init();

var server = http.createServer(function(req, res) {
    try {
        if(req.path[0] === 'api') {
            jsGen[req.path[1]][req.method](req, res);
            jsGen.index.setVisitHistory(req);
            console.log(req.method + ' : ' + req.path);
        } else {
            res.file('/static/index.html');
        }
    } catch(err) {
        restlog.error(err); //有error，info，等多种等级
        res.r404();
    }
}).listen(rrest.config.listenPort);
