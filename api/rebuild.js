'use strict';
/*global require, module, Buffer, jsGen*/

// rebuild redis cache

var redis = jsGen.lib.redis,
    then = jsGen.module.then,
    resJson = jsGen.lib.tools.resJson,
    errorHandler = jsGen.lib.tools.errorHandler;

module.exports = {
    user: function () {
        return then(function (defer) {
            redis.userCache.removeAll(defer);
        }).then(function (defer) {
            var users = 0;
            jsGen.dao.user.getUsersIndex(function (err, doc) {
                if (err) {
                    defer(err);
                } else if (doc) {
                    redis.userCache.update(doc);
                    users += 1;
                } else {
                    jsGen.config.users = users;
                    defer(null, users);
                }
            });
        }).fail(errorHandler);
    },
    tag: function () {
        return then(function (defer) {
            redis.tagCache.removeAll(defer);
        }).then(function (defer) {
            var tags = 0;
            jsGen.dao.tag.getTagsIndex(function (err, doc) {
                if (err) {
                    defer(err);
                } else if (doc) {
                    redis.tagCache.update(doc);
                    tags += 1;
                } else {
                    defer(null, tags);
                }
            });
        }).fail(errorHandler);
    },
    article: function () {
        return then(function (defer) {
            redis.articleCache.removeAll(defer);
        }).then(function (defer) {
            var total = {
                comments: 0,
                articles: 0
            };

            jsGen.dao.article.getArticlesIndex(function (err, doc) {
                if (err) {
                    defer(err);
                } else if (doc) {
                    redis.articleCache.update(doc);
                    total[doc.status === -1 ? 'comments' : 'articles'] += 1;
                } else {
                    jsGen.config.comments = total.comments;
                    jsGen.config.articles = total.articles;
                    redis.articleCache.clearup();
                    console.log('redis cache rebuild success!');
                    defer(null, total.comments + total.articles);
                }
            });
        }).fail(errorHandler);
    },
    GET: function (req, res) {
        var that = this;
        then(function (defer) {
            if (req.session.role !== 5) {
                defer(jsGen.Err(jsGen.lib.msg.userRoleErr));
            } else if (['user', 'tag', 'article'].indexOf(req.path[2]) >= 0) {
                that[req.path[2]].then(function (defer2, num) {
                    return res.sendjson(resJson(null, {
                        update: num
                    }));
                }).fail(defer);
            } else {
                defer(jsGen.Err(jsGen.lib.msg.resetInvalid));
            }
        }).fail(res.throwError);
    }
};