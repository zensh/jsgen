var url = require('url'),
    os = require('os'),
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    equal = jsGen.lib.tools.equal,
    checkEmail = jsGen.lib.tools.checkEmail,
    checkUserID = jsGen.lib.tools.checkUserID,
    checkUrl = jsGen.lib.tools.checkUrl,
    checkUserName = jsGen.lib.tools.checkUserName,
    HmacSHA256 = jsGen.lib.tools.HmacSHA256;

var onlineCache = {};
function updateOnlineCache(req) {
    var now = Date.now(),
        users = 0,
        online = 0;
    if (req.session.Uid) {
        delete onlineCache[req.session._id];
        onlineCache[req.session.Uid] = now;
    } else onlineCache[req.session._id] = now;
    for (var key in onlineCache) {
        if ((now - onlineCache[key]) > 600000) delete onlineCache[key];
        else {
            online += 1;
            if (key[0] === 'U') users += 1;
        }
    }
    jsGen.config.onlineNum = online;
    jsGen.config.onlineUsers = users;
    if (online > jsGen.config.maxOnlineNum) {
        jsGen.config.maxOnlineNum = online;
        jsGen.config.maxOnlineTime = now;
        jsGen.dao.index.setGlobalConfig({
            maxOnlineNum: online,
            maxOnlineTime: now
        });
    }
}

function setVisitHistory(req) {
    var visit = {
        _id: 0,
        data: []
    };
    var info = jsGen.module.platform.parse(req.useragent);
    visit._id = jsGen.config._initTime ? jsGen.config.visitHistory[jsGen.config.visitHistory.length - 1] : 1;
    visit.data[0] = Date.now();
    visit.data[1] = req.session.Uid;
    visit.data[2] = req.ip || '0.0.0.0';
    visit.data[3] = req.referer || 'direct';
    visit.data[4] = info.name || 'unknow';
    visit.data[5] = info.os.toString() || 'unknow';
    process.nextTick(function () {
        jsGen.config.visitors += 1;
        jsGen.dao.index.setGlobalConfig({
            visitors: 1
        });
        jsGen.dao.index.setVisitHistory(visit, function (err, doc) {
            if (err && err.code === 10131) {
                visit._id += 1;
                jsGen.dao.index.newVisitHistory(visit, function (err, doc) {
                    if (!err) {
                        jsGen.config.visitHistory.push(visit._id);
                        jsGen.dao.index.setGlobalConfig({
                            visitHistory: visit._id
                        });
                        jsGen.dao.index.setVisitHistory(visit);
                    }
                });
            }
        });
    });
};

function getvisitHistory(req, res, dm) {
    var body = {
        data: []
    };
    if (req.session.role !== 'admin') throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    jsGen.dao.index.getVisitHistory(jsGen.config.visitHistory, dm.intercept(function (doc) {
        if (doc) body.data = body.data.concat(doc.data);
        return res.sendjson(body);
    }));
};

function getIndex(req, res, dm) {
    var config = {
        domain: '',
        title: '',
        url: '',
        logo: '',
        email: '',
        description: '',
        metatitle: '',
        metadesc: '',
        keywords: '',
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
    },
    body = union(config, jsGen.config);

    body.tagsList = jsGen.api.tag.convertTags(jsGen.api.tag.cache._index.slice(0, 20));
    if (req.session.Uid) {
        jsGen.api.user.userCache.getP(req.session.Uid, dm.intercept(function (doc) {
            body.user = doc;
            return res.sendjson(body);
        }));
    } else return res.sendjson(body);
};

function getGlobal(req, res, dm) {
    var body = union(jsGen.config);
    if (req.session.role !== 'admin') throw jsGen.Err(jsGen.lib.msg.userRoleErr);
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
    return res.sendjson(body);
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
        if (typeof key !== 'number') key = Number(key);
        if (key < 0) key = 0;
        array[i] = key;
    }
    var setObj = union(defaultObj);
    intersect(setObj, req.apibody);

    if (req.session.Uid !== 'Uadmin') throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    if (setObj.domain && !checkUrl(setObj.domain)) throw jsGen.Err(jsGen.lib.msg.globalDomainErr);
    if (setObj.url) {
        if (!checkUrl(setObj.url)) throw jsGen.Err(jsGen.lib.msg.globalUrlErr);
        else setObj.url = setObj.url.replace(/(\/)+$/, '');
    }
    if (setObj.email && !checkEmail(setObj.email)) throw jsGen.Err(jsGen.lib.msg.globalEmailErr);
    if (setObj.UsersScore) setObj.UsersScore.forEach(checkArray);
    if (setObj.ArticleStatus) setObj.ArticleStatus.forEach(checkArray);
    if (setObj.ArticleHots) setObj.ArticleHots.forEach(checkArray);
    if (setObj.paginationCache) setObj.paginationCache.forEach(checkArray);
    if (setObj.TimeInterval && setObj.TimeInterval < 5) setObj.TimeInterval = 5;
    Object.keys(setObj).forEach(function (key) {
        if (equal(setObj[key], jsGen.config[key])) delete setObj[key];
    });
    if (setObj.userCache) jsGen.cache.user.capacity = setObj.userCache
    if (setObj.articleCache) jsGen.cache.article.capacity = setObj.articleCache
    if (setObj.commentCache) jsGen.cache.comment.capacity = setObj.commentCache
    if (setObj.listCache) jsGen.cache.list.capacity = setObj.listCache
    if (setObj.tagCache) jsGen.cache.tag.capacity = setObj.tagCache
    if (setObj.collectionCache) jsGen.cache.collection.capacity = setObj.collectionCache
    if (setObj.messageCache) jsGen.cache.message.capacity = setObj.messageCache
    if (setObj.paginationCache) {
        jsGen.cache.pagination.timeLimit = setObj.paginationCache[0] * 1000;
        jsGen.cache.pagination.capacity = setObj.paginationCache[1];
    }
    jsGen.dao.index.setGlobalConfig(setObj, dm.intercept(function (doc) {
        body = intersect(defaultObj, doc);
        union(jsGen.config, body);
        return res.sendjson(body);
    }));
};

function getFn(req, res, dm) {
    switch (req.path[2]) {
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
    setVisitHistory: setVisitHistory,
    updateOnlineCache: updateOnlineCache
};
