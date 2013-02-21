var url = require('url'),
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
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

function getvisitHistory(req, res) {
    var body = {
        data: []
    };
    if(req.session.role === 'admin') {
        jsGen.dao.index.getVisitHistory(cache.visitHistory, function(err, doc) {
            jsGen.dao.db.close();
            if(err) {
                jsGen.errlog.error(err);
                body.err = jsGen.lib.Err.dbErr;
            }
            if(!doc) return res.sendjson(body);
            else body.data = body.data.concat(doc.data);
        });
    } else {
        body.err = jsGen.lib.Err.userRoleErr;
        return res.sendjson(body);
    }
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
        body.user.name = jsGen.api.user.cache[req.session.Uid].name;
        body.user.email = jsGen.api.user.cache[req.session.Uid].email;
        body.user.avatar = jsGen.api.user.cache[req.session.Uid].avatar;
    } else body.user = null;
    return res.sendjson(body);
};

function postFn(req, res) {
    var body = {};
    var newObj = {
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
        CommentUp: 0,
        RecommendUp: 0,
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
        },
        register: true
    };
    console.log(req.apibody);
    console.log(req.session);
    try {
        if(req.session.Uid !== 'Uadmin') throw new Error(jsGen.lib.Err.userRoleErr);
        newObj = intersect(newObj, req.apibody);
        if(newObj.domain && !checkUrl(newObj.domain)) throw new Error(jsGen.lib.Err.globalDomainErr);
        if(newObj.url) {
            if(!checkUrl(newObj.url)) throw new Error(jsGen.lib.Err.globalUrlErr);
            urlObj = url.parse(newObj.url);
            if(newObj.domain && newObj.domain !== urlObj.hostname) throw new Error(jsGen.lib.Err.globalUrlErr);
            else if(jsGen.config.domain !== urlObj.hostname) throw new Error(jsGen.lib.Err.globalUrlErr);
        }
        setGlobalConfig(newObj, function(err, doc) {
            if(err) {
                jsGen.errlog.error(err);
                throw new Error(jsGen.lib.Err.dbErr);
            } else {
                body = doc;
                jsGen.dao.db.close();
                return res.sendjson(body);
            }
        });
    } catch(err) {
        jsGen.dao.db.close();
        body.err = err.toString();
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
