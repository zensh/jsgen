'use strict';
/*global require, module, Buffer, jsGen*/

var url = require('url'),
    os = require('os'),
    jsGenConfig = jsGen.config,
    jsGenCache = jsGen.cache,
    userCache = jsGenCache.user,
    each = jsGen.lib.tools.each,
    removeItem = jsGen.lib.tools.remove,
    toArray = jsGen.lib.tools.toArray,
    eachAsync = jsGen.lib.tools.eachAsync,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    equal = jsGen.lib.tools.equal,
    checkEmail = jsGen.lib.tools.checkEmail,
    checkUrl = jsGen.lib.tools.checkUrl,
    onlineCache = jsGenCache.online,
    resJson = jsGen.lib.tools.resJson,
    tagAPI = jsGen.api.tag,
    userAPI = jsGen.api.user;

function updateOnlineCache(req) {
    var now = Date.now();
    if (!req.session._restsid) {
        return;
    }
    if (req.session.Uid) {
        onlineCache.remove(req.session._restsid).put('U' + req.session.Uid);
    } else {
        onlineCache.put(req.session._restsid);
    }
    jsGenConfig.onlineNum = onlineCache.linkedList.length;
    jsGenConfig.onlineUsers = (function () {
        var i = 0,
            user = onlineCache.linkedList.head;
        while (user && user.key) {
            i += user.key[0] === 'U' ? 1 : 0;
            user = user.p;
        }
        return i;
    }());
    if (jsGenConfig.onlineNum > jsGenConfig.maxOnlineNum) {
        jsGenConfig.maxOnlineNum = jsGenConfig.onlineNum;
        jsGenConfig.maxOnlineTime = now;
        jsGen.dao.index.setGlobalConfig({
            maxOnlineNum: jsGenConfig.onlineNum,
            maxOnlineTime: now
        });
    }
}

function getIndex(req, res, dm) {
    var config = {
        domain: '',
        title: '',
        url: '',
        logo: '',
        description: '',
        metatitle: '',
        metadesc: '',
        keywords: '',
        date: 0,
        visitors: 0,
        users: 0,
        articles: 0,
        comments: 0,
        onlineNum: 0,
        onlineUsers: 0,
        maxOnlineNum: 0,
        maxOnlineTime: 0,
        ArticleTagsMax: 0,
        UserTagsMax: 0,
        TitleMinLen: 0,
        TitleMaxLen: 0,
        SummaryMaxLen: 0,
        ContentMinLen: 0,
        ContentMaxLen: 0,
        UserNameMinLen: 0,
        UserNameMaxLen: 0,
        register: true,
        info: {}
    };
    intersect(config, jsGenConfig);
    config.tagsList = tagAPI.convertTags(tagAPI.cache._index.slice(0, 20));
    config.timestamp = Date.now();
    if (req.session.Uid) {
        userCache.getP(req.session.Uid, dm.intercept(function (doc) {
            config.user = doc;
            return res.sendjson(resJson(null, config));
        }));
    } else if (req.cookie.autologin) {
        userAPI.cookieLogin(req, function (Uid) {
            if (Uid) {
                userCache.getP(Uid, dm.intercept(function (doc) {
                    req.session.Uid = Uid;
                    req.session.role = doc.role;
                    req.session.logauto = true;
                    userAPI.cookieLoginUpdate(Uid, function (cookie) {
                        if (cookie) {
                            res.cookie('autologin', cookie, {
                                maxAge: 259200000,
                                path: '/',
                                httpOnly: true
                            });
                        }
                        config.user = doc;
                        return res.sendjson(resJson(null, config));
                    });
                }));
            } else {
                return res.sendjson(resJson(null, config));
            }
        });
    } else {
        return res.sendjson(resJson(null, config));
    }
}

function getServTime(req, res, dm) {
    return res.sendjson(resJson());
}

function getGlobal(req, res, dm) {
    var body = union(jsGenConfig);
    if (req.session.role < 4) {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    body.sys = {
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
    delete body.smtp.auth.pass;
    return res.sendjson(resJson(null, body));
}

function setGlobal(req, res, dm) {
    var body = {},
        defaultObj = {
            domain: '',
            title: '',
            url: '',
            logo: '',
            email: '',
            description: '',
            metatitle: '',
            metadesc: '',
            keywords: '',
            robots: '',
            TimeInterval: 0,
            ArticleTagsMax: 0,
            UserTagsMax: 0,
            TitleMinLen: 0,
            TitleMaxLen: 0,
            SummaryMaxLen: 0,
            ContentMinLen: 0,
            ContentMaxLen: 0,
            UserNameMinLen: 0,
            UserNameMaxLen: 0,
            register: true,
            emailVerification: true,
            UsersScore: [null, null, null, null, null, null],
            ArticleStatus: [null, null],
            ArticleHots: [null, null, null, null, null],
            userCache: 0,
            articleCache: 0,
            commentCache: 0,
            listCache: 0,
            tagCache: 0,
            collectionCache: 0,
            messageCache: 0,
            paginationCache: [null, null],
            smtp: {
                host: '',
                secureConnection: true,
                port: 0,
                auth: {
                    user: '',
                    pass: ''
                },
                senderName: '',
                senderEmail: ''
            }
        };

    function checkArray(key, i, array) {
        key = key > 0 ? +key : 0;
        array[i] = key;
    }
    var setObj = union(defaultObj);
    intersect(setObj, req.apibody);

    if (req.session.Uid === 5) {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    if (setObj.domain && !checkUrl(setObj.domain)) {
        throw jsGen.Err(jsGen.lib.msg.globalDomainErr);
    }
    if (setObj.url) {
        if (!checkUrl(setObj.url)) {
            throw jsGen.Err(jsGen.lib.msg.globalUrlErr);
        } else {
            setObj.url = setObj.url.replace(/(\/)+$/, '');
        }
    }
    if (setObj.email && !checkEmail(setObj.email)) {
        throw jsGen.Err(jsGen.lib.msg.globalEmailErr);
    }
    if (setObj.UsersScore) {
        each(setObj.UsersScore, checkArray);
    }
    if (setObj.ArticleStatus) {
        each(setObj.ArticleStatus, checkArray);
    }
    if (setObj.ArticleHots) {
        each(setObj.ArticleHots, checkArray);
    }
    if (setObj.paginationCache) {
        each(setObj.paginationCache, checkArray);
    }
    if (setObj.TimeInterval && setObj.TimeInterval < 5) {
        setObj.TimeInterval = 5;
    }
    each(setObj, function (x, i, list) {
        if (equal(x, jsGenConfig[i])) {
            delete list[i];
        }
    });
    if (setObj.userCache) {
        userCache.capacity = setObj.userCache;
    }
    if (setObj.articleCache) {
        jsGenCache.article.capacity = setObj.articleCache;
    }
    if (setObj.commentCache) {
        jsGenCache.comment.capacity = setObj.commentCache;
    }
    if (setObj.listCache) {
        jsGenCache.list.capacity = setObj.listCache;
    }
    if (setObj.tagCache) {
        jsGenCache.tag.capacity = setObj.tagCache;
    }
    if (setObj.collectionCache) {
        jsGenCache.collection.capacity = setObj.collectionCache;
    }
    if (setObj.messageCache) {
        jsGenCache.message.capacity = setObj.messageCache;
    }
    if (setObj.paginationCache) {
        jsGenCache.pagination.timeLimit = setObj.paginationCache[0] * 1000;
        jsGenCache.pagination.capacity = setObj.paginationCache[1];
    }
    if (setObj.TimeInterval) {
        jsGenCache.timeInterval.timeLimit = setObj.TimeInterval * 1000;
    }
    if (setObj.robots) {
        jsGen.robotReg = new RegExp(setObj.robots, 'i');
    }
    jsGen.dao.index.setGlobalConfig(setObj, dm.intercept(function (doc) {
        doc = intersect(defaultObj, doc);
        union(jsGenConfig, doc);
        delete doc.smtp.auth.pass;
        return res.sendjson(resJson(null, doc));
    }));
}

function getFn(req, res, dm) {
    switch (req.path[2]) {
    case 'time':
        return getServTime(req, res, dm);
    case 'admin':
        return getGlobal(req, res, dm);
    default:
        return getIndex(req, res, dm);
    }
}

function postFn(req, res, dm) {
    switch (req.path[2]) {
    case 'admin':
        return setGlobal(req, res, dm);
    }
}

module.exports = {
    GET: getFn,
    POST: postFn,
    updateOnlineCache: updateOnlineCache
};