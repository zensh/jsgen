'use strict';
/*global require, module, Buffer, process, jsGen*/

var tagAPI = jsGen.api.tag,
    userAPI = jsGen.api.user,
    jsGenCache = jsGen.cache,
    os = jsGen.module.os,
    then = jsGen.module.then,
    jsGenConfig = jsGen.config,
    userCache = jsGenCache.user,
    msg = jsGen.lib.msg,
    redis = jsGen.lib.redis,
    each = jsGen.lib.tools.each,
    union = jsGen.lib.tools.union,
    equal = jsGen.lib.tools.equal,
    resJson = jsGen.lib.tools.resJson,
    toArray = jsGen.lib.tools.toArray,
    removeItem = jsGen.lib.tools.remove,
    checkUrl = jsGen.lib.tools.checkUrl,
    intersect = jsGen.lib.tools.intersect,
    checkEmail = jsGen.lib.tools.checkEmail,
    errorHandler = jsGen.lib.tools.errorHandler,
    configSetTpl = jsGen.lib.json.ConfigSetTpl,
    configPublicTpl = jsGen.lib.json.ConfigPublicTpl;

function getIndex(req, res) {
    var Uid;

    then(function (defer) {
        if (req.session.Uid) {
            userCache.getP(req.session.Uid).all(defer);
        } else if (req.cookie.autologin) {
            userAPI.cookieLogin(req).then(function (defer2, _id) {
                Uid = _id;
                userAPI.cookieLoginUpdate(Uid).all(defer2);
            }).then(function (defer, cookie) {
                res.cookie('autologin', cookie, {
                    maxAge: 259200000,
                    path: '/',
                    httpOnly: true
                });
                userCache.getP(Uid).all(defer);
            }).fail(defer);
        } else {
            defer();
        }
    }).all(function (defer, err, user) {
        var config = union(configPublicTpl);

        // 自动登录更新session
        if (Uid && !req.session.Uid && user) {
            req.session.Uid = Uid;
            req.session.role = user.role;
            req.session.logauto = true;
        }

        // 更新在线用户
        then(function (defer2) {
            redis.onlineCache(req, defer2);
        }).then(function (defer2, onlineUser, onlineNum) {
            jsGenConfig.onlineUsers = onlineUser;
            jsGenConfig.onlineNum = onlineNum;
            if (jsGenConfig.onlineNum > jsGenConfig.maxOnlineNum) {
                jsGenConfig.maxOnlineNum = jsGenConfig.onlineNum;
                jsGenConfig.maxOnlineTime = Date.now();
                jsGen.dao.index.setGlobalConfig({
                    maxOnlineNum: jsGenConfig.onlineNum,
                    maxOnlineTime: jsGenConfig.maxOnlineTime
                });
            }
        });

        then(function (defer2) {
            intersect(config, jsGenConfig);
            redis.tagCache.index(0, 20, defer2);
        }).all(function (defer2, err, tags) {
            tagAPI.convertTags(tags).all(defer2);
        }).all(function (defer2, err, tags) {
            config.tagsList = tags || [];
            config.user = user || null;
            return res.sendjson(resJson(null, config));
        });
    }).fail(res.throwError);
}

function getGlobal(req, res) {
    var config = union(jsGenConfig);
    if (req.session.role >= 4) {
        config.sys = {
            uptime: Math.round(process.uptime()),
            cpus: os.cpus(),
            platform: process.platform,
            node: process.versions,
            memory: process.memoryUsage(),
            user: userCache.info(),
            article: jsGenCache.article.info(),
            comment: jsGenCache.comment.info(),
            list: jsGenCache.list.info(),
            tag: jsGenCache.tag.info(),
            collection: jsGenCache.collection.info(),
            message: jsGenCache.message.info(),
            pagination: jsGenCache.pagination.info(),
            timeInterval: jsGenCache.timeInterval.info()
        };
        delete config.smtp.auth.pass;
        return res.sendjson(resJson(null, config));
    } else {
        res.throwError(null, jsGen.Err(msg.userRoleErr));
    }
}

function setGlobal(req, res) {
    var body = {},
        defaultObj = union(configSetTpl),
        setObj = intersect(union(configSetTpl), req.apibody);

    function checkArray(x, i, list) {
        x = x > 0 ? +x : 0;
        list[i] = x;
    }

    then(function (defer) {
        if (req.session.role !== 5) {
            defer(jsGen.Err(msg.userRoleErr));
        }
        if (setObj.domain && !checkUrl(setObj.domain)) {
            defer(jsGen.Err(msg.globalDomainErr));
        }
        if (setObj.url) {
            if (!checkUrl(setObj.url)) {
                defer(jsGen.Err(msg.globalUrlErr));
            } else {
                setObj.url = setObj.url.replace(/(\/)+$/, '');
            }
        }
        if (setObj.email && !checkEmail(setObj.email)) {
            defer(jsGen.Err(msg.globalEmailErr));
        }
        if (setObj.TimeInterval && setObj.TimeInterval < 5) {
            setObj.TimeInterval = 5;
        }
        each(['UsersScore', 'ArticleStatus', 'ArticleHots', 'paginationCache'], function (x) {
            each(setObj[x], checkArray);
        });
        each(setObj, function (x, i, list) {
            if (equal(x, jsGenConfig[i])) {
                delete list[i];
            }
        });
        userCache.capacity = setObj.userCache || userCache.capacity;
        jsGenCache.article.capacity = setObj.articleCache || jsGenCache.article.capacity;
        jsGenCache.comment.capacity = setObj.commentCache || jsGenCache.comment.capacity;
        jsGenCache.list.capacity = setObj.listCache || jsGenCache.list.capacity;
        jsGenCache.tag.capacity = setObj.tagCache || jsGenCache.tag.capacity;
        jsGenCache.collection.capacity = setObj.collectionCache || jsGenCache.collection.capacity;
        jsGenCache.message.capacity = setObj.messageCache || jsGenCache.message.capacity;
        jsGenCache.pagination.timeLimit = setObj.paginationCache[0] || jsGenCache.pagination.timeLimit;
        jsGenCache.timeInterval.timeLimit = setObj.TimeInterval * 1000 || jsGenCache.timeInterval.timeLimit;
        jsGen.robotReg = new RegExp(setObj.robots, 'i');
        jsGen.dao.index.setGlobalConfig(setObj, defer);
    }).then(function (defer, config) {
        config = intersect(defaultObj, config);
        union(jsGenConfig, config);
        delete config.smtp.auth.pass;
        return res.sendjson(resJson(null, config));
    }).fail(res.throwError);
}

module.exports = {
    GET: function (req, res) {
        switch (req.path[2]) {
        case 'admin':
            return getGlobal(req, res);
        default:
            return getIndex(req, res);
        }
    },
    POST: function (req, res) {
        switch (req.path[2]) {
        case 'admin':
            return setGlobal(req, res);
        }
    }
};