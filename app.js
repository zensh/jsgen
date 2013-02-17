var conf = module.exports.conf = require('./config/config'),
    http = require('http'),
    rrest = require('rrestjs'),
    fs = require('fs'),
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
jsGen.info = require('./api/install.js');

fs.readFile('package.json', 'utf8', function(err, data) {
        if(err) restlog.error(err);
        if(data) {
            jsGen.info = JSON.parse(data);
            console.log(jsGen.info);
        }
});
jsGen.index.cache._init();
jsGen.user.cache._init();
jsGen.tag.cache._init();

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
