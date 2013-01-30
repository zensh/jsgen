var userDao = require('../dao/userDao.js'),
    globalDao = require('../dao/globalDao.js'),
    collectionDao = require('../dao/collectionDao.js'),
    commentDao = require('../dao/commentDao.js'),
    messageDao = require('../dao/messageDao.js'),
    tagDao = require('../dao/tagDao.js'),
    db = require('../dao/mongoDao.js').db,
    errlog = require('rrestjs').restlog,
    merge = require('../lib/tools.js').merge,
    intersect = require('../lib/tools.js').intersect,
    checkEmail = require('../lib/tools.js').checkEmail,
    checkUserID = require('../lib/tools.js').checkUserID,
    checkUserName = require('../lib/tools.js').checkUserName,
    HmacSHA256 = require('../lib/tools.js').HmacSHA256,
    userErr = require('./errmsg.js').userErr;

var cache = {};
var callbackFn = function(err, doc) {
    if(err) console.log(err);
    return doc;
};
cache.init = function(callback) {
    var that = this;
    callback = callback || callbackFn;
    return globalDao.getGlobalConfig(function(err, doc) {
        if(err) errlog.error(err);
        else merge(that, doc);
        return callback(err, that);
    });
};

function getFn(req, res) {
    var body = {};
    if(cache.date > 0) return res.sendjson(cache);
    else cache.init(function(err, doc) {
        if(err) body.err = err;
        else body = doc;
        return res.sendjson(body);
    });
};

function postFn(req, res) {
    if(req.session.name === 'admin') {
        var data = JSON.parse(req.bodyparam),
            newObj = {
                domain: '',
                website: '',
                description: '',
                metatitle: '',
                metadesc: '',
                maxOnlineNum: 0,
                maxOnlineTime: 0,
                ArticleTagsMax: 0,
                UserTagsMax: 0,
                TitleMinLen: 0,
                TitleMaxLen: 0,
                SummaryMinLen: 0,
                SummaryMaxLen: 0,
                CommentMinLen: 0,
                CommentMaxLen: 0,
                ContentMinLen: 0,
                ContentMaxLen: 0,
                UserNameMinLen: 0,
                UserNameMaxLen: 0
            };
        newObj = intersect(newObj, data);
        globalDao.setGlobalConfig(newObj, function(err, doc) {
            if(err) {
                body.err = userErr.db;
                errlog.error(err);
            } else {
                doc._id = userDao.convertID(doc._id);
                body = doc;
            }
            db.close();
            return res.sendjson(body);
        });
    } else {}
};

if(!(cache.date > 0)) process.nextTick(function() {
    return cache.init();
});
module.exports = {
    GET: getFn,
    POST: postFn,
    cache: cache
};
