'use strict';
/*global require, module, Buffer, jsGen*/

// rebuild redis cache

var redis = jsGen.lib.redis,
    then = jsGen.module.then;

module.exports = function () {
    return then.series([function (defer) {
        redis.userCache.removeAll(function () {
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
        });
    }, function (defer) {
        redis.tagCache.removeAll(function () {
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
        });
    }, function (defer) {
        redis.articleCache.removeAll(function () {
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
                    defer(null, total.comments + total.articles);
                }
            });
        });
    }]).all(function (defer, error, result) {
        defer(error, {
            users: result[0],
            tags: result[1],
            articles: result[2]
        });
    });
};