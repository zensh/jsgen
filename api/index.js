var url = require('url'),
    os = require('os'),
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    equal = jsGen.lib.tools.equal,
    checkEmail = jsGen.lib.tools.checkEmail,
    checkUrl = jsGen.lib.tools.checkUrl,
    onlineCache = jsGen.cache.online,
    resJson = jsGen.lib.tools.resJson;

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
    jsGen.config.onlineNum = onlineCache.linkedList.length;
    jsGen.config.onlineUsers = (function () {
        var i = 0,
            user = onlineCache.linkedList.head;
        while (user && user.key) {
            if (user.key[0] === 'U') {
                i += 1;
            }
            user = user.p;
        }
        return i;
    }());
    if (jsGen.config.onlineNum > jsGen.config.maxOnlineNum) {
        jsGen.config.maxOnlineNum = jsGen.config.onlineNum;
        jsGen.config.maxOnlineTime = now;
        jsGen.dao.index.setGlobalConfig({
            maxOnlineNum: jsGen.config.onlineNum,
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
    intersect(config, jsGen.config);
    config.tagsList = jsGen.api.tag.convertTags(jsGen.api.tag.cache._index.slice(0, 20));
    config.timestamp = Date.now();
    if (req.session.Uid) {
        jsGen.cache.user.getP(req.session.Uid, dm.intercept(function (doc) {
            config.user = doc;
            return res.sendjson(resJson(null, config));
        }));
    } else if (req.cookie.autologin) {
        jsGen.api.user.cookieLogin(req.cookie.autologin, function (Uid) {
            if (Uid) {
                jsGen.cache.user.getP(Uid, dm.intercept(function (doc) {
                    req.session.Uid = Uid;
                    req.session.role = doc.role;
                    req.session.logauto = true;
                    jsGen.api.user.cookieLoginUpdate(Uid, function (cookie) {
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
};

function getServTime(req, res, dm) {
    return res.sendjson(resJson());
};

function getGlobal(req, res, dm) {
    var body = union(jsGen.config);
    if (req.session.role < 4) {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    body.sys = {
        uptime: process.uptime(),
        cpus: os.cpus(),
        platform: process.platform,
        node: process.versions,
        memory: process.memoryUsage(),
        user: jsGen.cache.user.info(),
        article: jsGen.cache.article.info(),
        comment: jsGen.cache.comment.info(),
        list: jsGen.cache.list.info(),
        tag: jsGen.cache.tag.info(),
        collection: jsGen.cache.collection.info(),
        message: jsGen.cache.message.info(),
        pagination: jsGen.cache.pagination.info(),
        timeInterval: jsGen.cache.timeInterval.info()
    };
    body.sys.uptime = jsGen.lib.tools.formatTime(Math.round(body.sys.uptime));
    body.sys.memory.rss = jsGen.lib.tools.formatBytes(body.sys.memory.rss);
    body.sys.memory.heapTotal = jsGen.lib.tools.formatBytes(body.sys.memory.heapTotal);
    body.sys.memory.heapUsed = jsGen.lib.tools.formatBytes(body.sys.memory.heapUsed);
    body.sys.memory.total = jsGen.lib.tools.formatBytes(os.totalmem());
    body.sys.memory.free = jsGen.lib.tools.formatBytes(os.freemem());
    return res.sendjson(resJson(null, body));
};

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
            UsersScore: [0, 0, 0, 0, 0, 0, 0],
            ArticleStatus: [0, 0],
            ArticleHots: [0, 0, 0, 0, 0],
            userCache: 0,
            articleCache: 0,
            commentCache: 0,
            listCache: 0,
            tagCache: 0,
            collectionCache: 0,
            messageCache: 0,
            paginationCache: [0, 0],
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
        key = +key;
        if (key < 0) {
            key = 0;
        }
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
        setObj.UsersScore.forEach(checkArray);
    }
    if (setObj.ArticleStatus) {
        setObj.ArticleStatus.forEach(checkArray);
    }
    if (setObj.ArticleHots) {
        setObj.ArticleHots.forEach(checkArray);
    }
    if (setObj.paginationCache) {
        setObj.paginationCache.forEach(checkArray);
    }
    if (setObj.TimeInterval && setObj.TimeInterval < 5) {
        setObj.TimeInterval = 5;
    }
    Object.keys(setObj).forEach(function (key) {
        if (equal(setObj[key], jsGen.config[key])) {
            delete setObj[key];
        }
    });
    if (setObj.userCache) {
        jsGen.cache.user.capacity = setObj.userCache;
    }
    if (setObj.articleCache) {
        jsGen.cache.article.capacity = setObj.articleCache;
    }
    if (setObj.commentCache) {
        jsGen.cache.comment.capacity = setObj.commentCache;
    }
    if (setObj.listCache) {
        jsGen.cache.list.capacity = setObj.listCache;
    }
    if (setObj.tagCache) {
        jsGen.cache.tag.capacity = setObj.tagCache;
    }
    if (setObj.collectionCache) {
        jsGen.cache.collection.capacity = setObj.collectionCache;
    }
    if (setObj.messageCache) {
        jsGen.cache.message.capacity = setObj.messageCache;
    }
    if (setObj.paginationCache) {
        jsGen.cache.pagination.timeLimit = setObj.paginationCache[0] * 1000;
        jsGen.cache.pagination.capacity = setObj.paginationCache[1];
    }
    if (setObj.TimeInterval) {
        jsGen.cache.timeInterval.timeLimit = setObj.TimeInterval * 1000;
    }
    if (setObj.robots) {
        jsGen.robotReg = new RegExp(setObj.robots, 'i');
    }
    jsGen.dao.index.setGlobalConfig(setObj, dm.intercept(function (doc) {
        body = intersect(defaultObj, doc);
        union(jsGen.config, body);
        return res.sendjson(resJson(null, body));
    }));
};

function getFn(req, res, dm) {
    switch (req.path[2]) {
    case 'time':
        return getServTime(req, res, dm);
    case 'admin':
        return getGlobal(req, res, dm);
    default:
        return getIndex(req, res, dm);
    }
};

function postFn(req, res, dm) {
    switch (req.path[2]) {
    case 'admin':
        return setGlobal(req, res, dm);
    }
};

module.exports = {
    GET: getFn,
    POST: postFn,
    updateOnlineCache: updateOnlineCache
};