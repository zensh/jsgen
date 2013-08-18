'use strict';
/*global require, module, Buffer, jsGen*/

// rebuild redis cache

var redis = jsGen.redis,
    then = jsGen.module.then,
    resJson = jsGen.lib.tools.resJson;

function user(req, res, dm) {
    then(function (defer) {
        redis.userCache.removeAll(defer);
    }).then(function (defer) {
        jsGen.config.users = 0;
        jsGen.dao.user.getUsersIndex(function (err, doc) {
            if (err) {
                throw err;
            } else if (doc) {
                redis.userCache.update(doc);
                jsGen.config.users += 1;
            } else {
                return res.sendjson(resJson(null, {
                    update: jsGen.config.users
                }));
            }
        });
    });
}

function tag(req, res, dm) {
    then(function (defer) {
        redis.tagCache.removeAll(defer);
    }).then(function (defer) {
        var tags = 0;
        jsGen.dao.tag.getTagsIndex(function (err, doc) {
            if (err) {
                throw err;
            } else if (doc) {
                redis.tagCache.update(doc);
                tags += 1;
            } else {
                return res.sendjson(resJson(null, {
                    update: tags;
                }));
            }
        });
    });
}

function article(req, res, dm) {
    then(function (defer) {
        redis.articleCache.removeAll(defer);
    }).then(function (defer) {
        jsGen.dao.article.getArticlesIndex(function (err, doc) {
            if (err) {
                throw err;
            } else if (doc) {
                redis.articleCache.update(doc);
                jsGen.config[doc.status === -1 ? 'comments' : 'articles'] += 1;
            } else {
                return res.sendjson(resJson(null, {
                    update: jsGen.config.comments + jsGen.config.articles
                }));
            }
        });
    });
}

function checkAdmin(req, res, dm) {
    if (req.session.role !== 5) {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    } else {
        switch (req.path[2]) {
        case 'user':
            return user(req, res, dm);
        }
    }
}

module.exports = {
    GET: checkAdmin
};