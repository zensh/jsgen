var url = require('url'),
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    equal = jsGen.lib.tools.equal,
    checkEmail = jsGen.lib.tools.checkEmail,
    checkUserID = jsGen.lib.tools.checkUserID,
    checkUrl = jsGen.lib.tools.checkUrl,
    checkUserName = jsGen.lib.tools.checkUserName,
    HmacSHA256 = jsGen.lib.tools.HmacSHA256;

var cache = {
    _initTime: 0
};
cache._init = function(callback) {
    var that = this;
    jsGen.dao.index.getGlobalConfig(function(err, doc) {
        if(err) jsGen.errlog.error(err);
        else that._update(doc);
        if(callback) callback(err, that.data);
    });
    return this;
};
cache._update = function(obj) {
    union(this, obj);
    this._initTime = Date.now();
};

var onlineCache = {
};
function updateOnlineCache(req) {
    var now = Date.now(),
        users = 0,
        online = 0;
    if(req.session.Uid) {
        delete onlineCache[req.session._id];
        onlineCache[req.session.Uid] = now;
    } else onlineCache[req.session._id] = now;
    for(var key in onlineCache) {
        if((now - onlineCache[key]) > 600000) delete  onlineCache[key];
        else {
            online += 1;
            if(key[0] === 'U') users += 1;
        }
    }
    cache.onlineNum = online;
    cache.onlineUsers = users;
    if(online > cache.maxOnlineNum) setGlobalConfig({
        maxOnlineNum: online,
        maxOnlineTime: now
    });
}

function setGlobalConfig(obj, callback) {
    jsGen.dao.index.setGlobalConfig(obj, function(err, doc) {
        if(doc) cache._update(doc);
        if(callback) return callback(err, doc);
    });
};

function setVisitHistory(req) {
    var visit = {
        _id: 0,
        data: []
    };
    var info = jsGen.module.platform.parse(req.useragent);
    visit._id = cache._initTime ? cache.visitHistory[cache.visitHistory.length - 1] : 1;
    visit.data[0] = Date.now();
    visit.data[1] = req.session.Uid;
    visit.data[2] = req.ip || '0.0.0.0';
    visit.data[3] = req.referer || 'direct';
    visit.data[4] = info.name || 'unknow';
    visit.data[5] = info.os.toString() || 'unknow';
    process.nextTick(function() {
        setGlobalConfig({
            visit: 1
        });
        jsGen.dao.index.setVisitHistory(visit, function(err, doc) {
            if(err && err.code === 10131) {
                visit._id += 1;
                jsGen.dao.index.newVisitHistory(visit, function(err, doc) {
                    if(!err) {
                        setGlobalConfig({
                            visitHistory: visit._id
                        });
                        jsGen.dao.index.setVisitHistory(visit);
                    }
                    jsGen.dao.db.close();
                });
            }
            jsGen.dao.db.close();
        });
    });
};

function getvisitHistory(req, res, dm) {
    var body = {
        data: []
    };
    if(req.session.role !== 'admin') throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    jsGen.dao.index.getVisitHistory(cache.visitHistory, dm.intercept(function(doc) {
        if(!doc) {
            jsGen.dao.db.close();
            return res.sendjson(body);
        } else body.data = body.data.concat(doc.data);
    }));
};

function getGlobal(req, res, dm) {
    var body = union(cache);
    if(req.session.Uid !== 'Uadmin' || req.path[2] !== 'admin') {
        delete body.visitHistory;
        delete body.email;
        delete body.smtp;
    }
    if(req.session.Uid && req.path[2] !== 'admin') {
        jsGen.api.user.userCache.getUser(req.session.Uid, dm.intercept(function(doc) {
            body.user = doc;
            return res.sendjson(body);
        }));
    }
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
        if(typeof key !== 'number') key = Number(key);
        if(key < 0) key = 0;
        array[i] = key;
    }
    var setObj = union(defaultObj);
    intersect(setObj, req.apibody);

    if(req.session.Uid !== 'Uadmin') throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    if(setObj.domain && !checkUrl(setObj.domain)) throw jsGen.Err(jsGen.lib.msg.globalDomainErr);
    if(setObj.url) {
        if(!checkUrl(setObj.url)) throw jsGen.Err(jsGen.lib.msg.globalUrlErr);
        else setObj.url = setObj.url.replace(/(\/)+$/, '');
    }
    if(setObj.email && !checkEmail(setObj.email)) throw jsGen.Err(jsGen.lib.msg.globalEmailErr);
    if(setObj.UsersScore) setObj.UsersScore.forEach(checkArray);
    if(setObj.ArticleStatus) setObj.ArticleStatus.forEach(checkArray);
    if(setObj.ArticleHots) setObj.ArticleHots.forEach(checkArray);
    for(var key in setObj) {
        if(equal(setObj[key], cache[key])) delete setObj[key];
    }
    setGlobalConfig(setObj, dm.intercept(function(doc) {
        body = intersect(defaultObj, doc);
        return res.sendjson(body);
    }));
};

function getFn(req, res, dm) {
    switch(req.path[2]) {
    case 'admin':
        return getGlobal(req, res, dm);
    default:
        return getGlobal(req, res, dm);
    }
};

function postFn(req, res, dm) {
    switch(req.path[2]) {
    case 'admin':
        return setGlobal(req, res, dm);
    }
};

module.exports = {
    GET: getFn,
    POST: postFn,
    setVisitHistory: setVisitHistory,
    setGlobalConfig: setGlobalConfig,
    cache: cache,
    updateOnlineCache: updateOnlineCache
};
