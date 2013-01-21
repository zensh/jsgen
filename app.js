var conf = module.exports.conf = require('./config/config'),
    jsGen = {};

jsGen.index = require('./server/index.js');
jsGen.home = require('./server/home.js');
jsGen.admin = require('./server/admin.js');
jsGen.user = require('./server/user.js');
jsGen.article = require('./server/article.js');
jsGen.tag = require('./server/tag.js');
jsGen.collection = require('./server/collection.js');
jsGen.comment = require('./server/comment.js');
jsGen.message = require('./server/message.js');
jsGen.test = require('./server/test.js');

var http = require('http'),
    rrest = require('rrestjs'),
    server = http.createServer(function(req, res) {
        try {
            if (req.path[0] === 'api') {
                jsGen[req.path[1]][req.method](req, res);
            } else res.file('/static/index.html');
        } catch(err) {
            restlog.error(err); //有error，info，等多种等级
            res.r404();
        }
    }).listen(rrest.config.listenPort);
