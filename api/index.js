var globalDao = require('../dao/globalDao.js'),
    db = require('../dao/mongoDao.js').db,
    errlog = require('rrestjs').restlog,
    platform = require('platform'),
    callbackFn = require('../lib/tools.js').callbackFn,
    union = require('../lib/tools.js').union,
    intersect = require('../lib/tools.js').intersect,
    checkEmail = require('../lib/tools.js').checkEmail,
    checkUserID = require('../lib/tools.js').checkUserID,
    checkUserName = require('../lib/tools.js').checkUserName,
    HmacSHA256 = require('../lib/tools.js').HmacSHA256,
    cacheUser = require('./user.js').cache,
    Err = require('./errmsg.js');

var cache = {
    _initTime: 0
};
cache._init = function(callback) {
        var that = this;
        globalDao.getGlobalConfig(function(err, doc) {
            if(err) errlog.error(err);
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
                    db.close();
                });
            }
            db.close();
        });
    });
};

function getvisitHistory(req, res) {
    var body = {
        data: []
    };
    if(req.session.role === 'admin') {
        globalDao.getVisitHistory(cache.visitHistory, function(err, doc) {
            db.close();
            if(err) {
                errlog.error(err);
                body.err = Err.dbErr;
            }
            if(!doc) return res.sendjson(body);
            else body.data = body.data.concat(doc.data);
        });
    } else {
        body.err = Err.userRoleErr;
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
        body.user.name = cacheUser[req.session.Uid].name;
        body.user.email = cacheUser[req.session.Uid].email;
        body.user.avatar = cacheUser[req.session.Uid].avatar;
    } else body.user = null;
    return res.sendjson(body);
};

function postFn(req, res) {
    var body = {};
    if(req.session.Uid === 'Uadmin') {
        newObj = req.apibody;
        setGlobalConfig(newObj, function(err, doc) {
            if(err) {
                body.err = Err.db.Err;
                errlog.error(err);
            } else {
                body = doc;
            }
            return res.sendjson(body);
        });
    } else {
        body.err = Err.userRoleErr;
        return res.sendjson(body);
    }
};

module.exports = {
    GET: getFn,
    POST: postFn,
    setVisitHistory: setVisitHistory,
    setGlobalConfig: setGlobalConfig,
    global: cache
};
console.log(cache);
