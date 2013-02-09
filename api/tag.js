var userDao = require('../dao/userDao.js'),
    articleDao = require('../dao/articleDao.js'),
    collectionDao = require('../dao/collectionDao.js'),
    commentDao = require('../dao/commentDao.js'),
    messageDao = require('../dao/messageDao.js'),
    tagDao = require('../dao/tagDao.js'),
    db = require('../dao/mongoDao.js').db,
    errlog = require('rrestjs').restlog,
    merge = require('../lib/tools.js').merge,
    checkID = require('../lib/tools.js').checkID,
    checkTag = require('../lib/tools.js').checkTag,
    Err = require('./errmsg.js');

var cache = {
    _initTime: 0
};
cache.init = function(callback) {
    var that = this;
    tagDao.getTagsIndex(function(err, doc) {
        if(err) return errlog.error(err);
        if(doc) {
            doc.obj._id = tagDao.convertID(doc.obj._id);
            that.update(doc);
        }
        if(callback) callback(err, doc);
    });
    return this;
};
cache.update = function(obj) {
    if(!this[obj._id]) this[obj._id] = {};
    this[obj._id]._id = obj._id;
    this[obj._id].tag = obj.tag;
    this[obj._id].articles = obj.articles;
    this[obj._id].users = obj.users;
    this[obj.tag] = this[obj._id];
    this._initTime = Date.now();
    return this;
};

function addTag(tagObj, callback) {
    var result = {};
    if(checkTag(tagObj.tag)) tagDao.setNewTag(tagObj, function(err, doc) {
        if(err) {
            result.err = Err.dbErr;
            errlog.error(err);
        }
        if(doc) {
            result = doc;
            result.err = null;
            result._id = tagDao.convertID(result._id);
            process.nextTick(function() {
                return cache.update(result);
            });
        }
        return callback(result);
    });
}

function getTag(req, res) {

};

function getFn(req, res) {};

function postFn(req, res) {};

function deleteFn(req, res) {};

module.exports = {
    GET: getFn,
    POST: postFn,
    DELETE: deleteFn,
    cache: cache
};
addTag({tag:'mongoDB'},function(doc){console.log(doc);});
