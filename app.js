var module.exports.conf = require('./config/config'),
    jsGen = {};

jsGen.index = require('./server/index.js');
jsGen.home = require('./server/home.js');
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
            switch(req.path[0][0]) {
            case 'U':
                jsGen.user(req, res);
                break;
            case 'A':
                jsGen.article(req, res);
                break;
            case 'T':
                jsGen.tag(req, res);
                break;
            case 'C':
                jsGen.comment(req, res);
                break;
            case 'O':
                jsGen.collection(req, res);
                break;
            case 'M':
                jsGen.message(req, res);
                break;
            default:
                jsGen[req.path[0]](req, res);
            }
        } catch(err) {
            restlog.info(err); //有error，info，等多种等级
            res.r404();
        }
    }).listen(rrest.config.listenPort);
