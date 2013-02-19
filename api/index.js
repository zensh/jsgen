var globalDao = require('../dao/globalDao.js'),
    platform = require('platform'),
    union = jsGen.tools.union,
    intersect = jsGen.tools.intersect,
    checkEmail = jsGen.tools.checkEmail,
    checkUserID = jsGen.tools.checkUserID,
    checkUserName = jsGen.tools.checkUserName,
    HmacSHA256 = jsGen.tools.HmacSHA256;

var cache = {
    _initTime: 0
};
cache._init = function(callback) {
        var that = this;
        globalDao.getGlobalConfig(function(err, doc) {
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

function setVisitHistory(req) {
    var visit = {
        _id: 0,
        data: []
    };
    var info = platform.parse(req.useragent);
    visit._id = cache._initTime ? cache.visitHistory[cache.visitHistory.length - 1] : 1;
    visit.data[0] = Date.now();
    visit.data[1] = req.session.Uid;
    visit.data[2] = req.ip || '0.0.0.0';
    visit.data[3] = req.referer || 'direct';
    visit.data[4] = info.name || 'unknow';
    visit.data[5] = info.os.toString() || 'unknow';
    process.nextTick(function() {
        setGlobalConfig({visit: 1});
        globalDao.setVisitHistory(visit, function(err, doc) {
            if(err && err.code === 10131) {
                visit._id += 1;
                globalDao.newVisitHistory(visit, function(err, doc) {
                    if(!err) {
                        setGlobalConfig({
                            visitHistory: visit._id
                        });
                        globalDao.setVisitHistory(visit);
                    }
                    jsGen.db.close();
                });
            }
            jsGen.db.close();
        });
    });
};

function getvisitHistory(req, res) {
    var body = {
        data: []
    };
    if(req.session.role === 'admin') {
        globalDao.getVisitHistory(cache.visitHistory, function(err, doc) {
            jsGen.db.close();
            if(err) {
                jsGen.errlog.error(err);
                body.err = jsGen.Err.dbErr;
            }
            if(!doc) return res.sendjson(body);
            else body.data = body.data.concat(doc.data);
        });
    } else {
        body.err = jsGen.Err.userRoleErr;
        return res.sendjson(body);
    }
};

function setGlobalConfig(obj, callback) {
    globalDao.setGlobalConfig(obj, function(err, doc) {
        if (doc) cache._update(doc);
        if (callback) return callback(err, doc);
    });
};

function getFn(req, res) {
    var body = union(cache);
    delete body.visitHistory;
    delete body.email;
    delete body.smtp;
    if(req.session.Uid) {
        body.user = {};
        body.user._id = req.session.Uid;
        body.user.role = req.session.role;
        body.user.name = jsGen.user.cache[req.session.Uid].name;
        body.user.email = jsGen.user.cache[req.session.Uid].email;
        body.user.avatar = jsGen.user.cache[req.session.Uid].avatar;
    } else body.user = null;
    return res.sendjson(body);
};

function postFn(req, res) {
    var body = {};
    if(req.session.Uid === 'Uadmin') {
        newObj = req.apibody;
        setGlobalConfig(newObj, function(err, doc) {
            if(err) {
                body.err = jsGen.Err.dbErr;
                jsGen.errlog.error(err);
            } else {
                body = doc;
            }
            return res.sendjson(body);
        });
    } else {
        body.err = jsGen.Err.userRoleErr;
        return res.sendjson(body);
    }
};

module.exports = {
    GET: getFn,
    POST: postFn,
    setVisitHistory: setVisitHistory,
    setGlobalConfig: setGlobalConfig,
    cache: cache
};
