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
            }).then(function (defer2, cookie) {
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
            jsGenConfig.onlineUsers = onlineUser > 1 ? onlineUser : 2;
            jsGenConfig.onlineNum = onlineNum > 1 ? onlineNum : 2;
            if (jsGenConfig.onlineNum > jsGenConfig.maxOnlineNum) {
                jsGenConfig.maxOnlineNum = jsGenConfig.onlineNum;
                jsGenConfig.maxOnlineTime = Date.now();
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
    then(function (defer) {
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
                message: jsGenCache.message.info()
            };
            jsGenCache.pagination.info(defer);
        } else {
            defer(null, jsGen.Err(msg.USER.userRoleErr));
        }
    }).then(function (defer, info) {
        config.sys.pagination = info;
        jsGenCache.timeInterval.info(defer);
    }).then(function (defer, info) {
        config.sys.timeInterval = info;
        delete config.smtp.auth.pass;
        return res.sendjson(resJson(null, config, null, {
            configTpl: union(configSetTpl)
        }));
    }).fail(res.throwError);
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
            defer(jsGen.Err(msg.USER.userRoleErr));
        }
        if (setObj.domain && !checkUrl(setObj.domain)) {
            defer(jsGen.Err(msg.MAIN.globalDomainErr));
        }
        if (setObj.url) {
            if (!checkUrl(setObj.url)) {
                defer(jsGen.Err(msg.MAIN.globalUrlErr));
            } else {
                setObj.url = setObj.url.replace(/(\/)+$/, '');
            }
        }
        if (setObj.email && !checkEmail(setObj.email)) {
            defer(jsGen.Err(msg.MAIN.globalEmailErr));
        }
        if (setObj.TimeInterval && setObj.TimeInterval < 5) {
            setObj.TimeInterval = 5;
        }
        each(['UsersScore', 'ArticleStatus', 'ArticleHots', 'paginationCache'], function (x) {
            each(setObj[x], checkArray);
        });
        if (setObj.robots) {
            jsGen.robotReg = new RegExp(setObj.robots, 'i');
        }
        if (setObj.smtp) {
            setObj.smtp = union(jsGenConfig.smtp, setObj.smtp);
        }
        userCache.capacity = setObj.userCache || userCache.capacity;
        jsGenCache.article.capacity = setObj.articleCache || jsGenCache.article.capacity;
        jsGenCache.comment.capacity = setObj.commentCache || jsGenCache.comment.capacity;
        jsGenCache.list.capacity = setObj.listCache || jsGenCache.list.capacity;
        jsGenCache.tag.capacity = setObj.tagCache || jsGenCache.tag.capacity;
        jsGenCache.collection.capacity = setObj.collectionCache || jsGenCache.collection.capacity;
        jsGenCache.message.capacity = setObj.messageCache || jsGenCache.message.capacity;
        jsGenCache.pagination.timeLimit = setObj.paginationCache || jsGenCache.pagination.timeLimit;
        jsGenCache.timeInterval.timeLimit = setObj.TimeInterval || jsGenCache.timeInterval.timeLimit;
        each(setObj, function (value, key, list) {
            jsGenConfig[key] = value;
        });
        intersect(defaultObj, jsGenConfig);
        delete defaultObj.smtp.auth.pass;
        return res.sendjson(resJson(null, defaultObj));
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