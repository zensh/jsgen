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
    CacheFn = require('../lib/tools.js').CacheFn,
    callbackFn = require('../lib/tools.js').callbackFn,
    Err = require('./errmsg.js');

var tagCache = new CacheFn(50);
tagCache.getTag = function(tagID, callback) {
    var that = this,
        callback = callback || callbackFn,
        doc = this.get(tagID);

    if(doc) return callback(null, doc);
    else tagDao.getTag(tagDao.convertID(tagID), function(err, doc) {
        if(err) errlog.error(err);
        if(doc) {
            doc._id = tagDao.convertID(doc._id);
            that.put(doc._id, doc);
        }
        return callback(err, doc);
    });
};

var cache = {
    _initTime: 0,
    _index: []
};
cache._init = function(callback) {
    var that = this,
        callback = callback || callbackFn;

    tagDao.getTagsIndex(function(err, doc) {
        if(err) return errlog.error(err);
        if(doc) {
            doc._id = tagDao.convertID(doc._id);
            that._update(doc);
        }
        if(callback) callback(err, doc);
    });
    return this;
};
cache._update = function(obj) {
    var that = this;
    if(!this[obj._id]) {
        this[obj._id] = {};
        this._index.push(obj._id);
    }
    this[obj._id]._id = obj._id;
    this[obj._id].tag = obj.tag;
    this[obj._id].articles = obj.articles;
    this[obj._id].users = obj.users;
    if(!this[obj.tag.toLowerCase()]) this[obj.tag.toLowerCase()] = this[obj._id];
    this._index.sort(function(a, b) {
        return that[b].articles + that[b].users - that[a].articles - that[a].users;
    });
    this._initTime = Date.now();
    return this;
};
cache._remove = function(tagID) {
    var that = this;
    if(this[tagID]) {
        delete this[this[tagID].tag.toLowerCase()];
        delete this[tagID];
        this._index.splice(this._index.indexOf(tagID), 1);
        this._index.sort(function(a, b) {
            return that[b].articles + that[b].users - that[a].articles - that[a].users;
        });
        this._initTime = Date.now();
    }
    return this;
};

function addTag(tagObj, callback) {
    var callback = callback || callbackFn;
    tagDao.setNewTag(tagObj, function(err, doc) {
        if(err) errlog.error(err);
        if(doc) {
            doc._id = tagDao.convertID(doc._id);
            cache._update(doc);
        }
        return callback(err, doc);
    });
}

function setTag(tagObj, callback) {
    var tagID = null,
        setKey = null,
        callback = callback || callbackFn;

    function setCache(doc) {
        cache._remove(doc._id);
        cache._update(doc);
        tagCache.put(doc._id, doc);
    };

    if(typeof tagObj._id === 'string') {
        tagID = tagObj._id;
        tagObj._id = tagDao.convertID(tagObj._id);
    } else if(typeof tagObj._id === 'number') {
        tagID = tagDao.convertID(tagObj._id);
    }

    if(!cache[tagID]) return callback(null, null);

    if(tagObj.tag) setKey = 'tag';
    else if(tagObj.articlesList) setKey = 'articlesList';
    else if(tagObj.usersList) setKey = 'usersList';

    switch(setKey) {
    case 'tag':
        if(tagObj.tag === cache[tagID].tag) return callback(null, null);
        if(cache[tagObj.tag.toLowerCase()] && cache[tagObj.tag.toLowerCase()]._id !== tagID) {
            toID = cache[tagObj.tag.toLowerCase()]._id;
            tagCache.getTag(tagID, function(err, doc) {
                if(err) return callback(err, null);
                return doc.articlesList.forEach(function(_id, i, array) {
                    if(i < array.length - 1) {
                        setTag({
                            _id: toID,
                            articlesList: _id
                        });
                    } else setTag({
                        _id: toID,
                        articlesList: _id
                    }, function() {
                        return doc.usersList.forEach(function(_id, i, array) {
                            if(i < array.length - 1) {
                                setTag({
                                    _id: toID,
                                    usersList: _id
                                });
                            } else setTag({
                                _id: toID,
                                usersList: _id
                            }, function() {
                                return tagDao.delTag(tagObj._id, function() {
                                    tagCache.remove(tagID);
                                    cache._remove(tagID);
                                    return tagCache.getTag(toID, function(err, doc) {
                                        return callback(err, doc);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        } else {
            tagDao.setTag(tagObj, function(err, doc) {
                if(doc) {
                    doc._id = tagDao.convertID(doc._id);
                    setCache(doc);
                }
                return callback(err, doc);
            });
        }
        break;
    case 'articlesList':
    case 'usersList':
        tagCache.getTag(tagID, function(err, doc) {
            if(err) return callback(err, null);
            var exist = doc[setKey].indexOf(Math.abs(tagObj[setKey]));
            if((tagObj[setKey] < 0 && exist >= 0) || (tagObj[setKey] > 0 && exist < 0)) {
                tagDao.setTag(tagObj, function(err, doc) {
                    if(doc) {
                        doc._id = tagDao.convertID(doc._id);
                        setCache(doc);
                    }
                    return callback(err, doc);
                });
            } else return callback(null, null);
        });
        break;
    default: return callback(null, null);
    }
};

function filterTags(tagArray, convert, callback) {
    var tags = [],
        type = null,
        callback = callback || callbackFn;

    if(!Array.isArray(tagArray)) tagArray = [tagArray];
    tagArray.forEach(function(tag, i, array) {
        if(i === 0) type = typeof tag;
        if(type === typeof tag) {
            if(type === 'string' && checkTag(tag)) {
                if(convert) {
                    if(cache[tag]) {
                        tags.push(tagDao.convertID(cache[tag]._id));
                        if(i === array.length - 1) return callback(null, tags);
                    } else if(cache[tag.toLowerCase()]) {
                        tags.push(tagDao.convertID(cache[tag.toLowerCase()]._id));
                        if(i === array.length - 1) return callback(null, tags);
                    } else {
                        addTag({
                            tag: tag
                        }, function(err, doc) {
                            if(doc) tags.push(doc._id);
                            if(i === array.length - 1) return callback(err, tags);
                        });
                    }
                } else {
                    if(cache[tag]) {
                        tags.push(cache[tag].tag);
                        if(i === array.length - 1) return callback(null, tags);
                    } else if(cache[tag.toLowerCase()]) {
                        tags.push(cache[tag.toLowerCase()].tag);
                        if(i === array.length - 1) return callback(null, tags);
                    } else {
                        addTag({
                            tag: tag
                        }, function(err, doc) {
                            if(doc) tags.push(doc.tag);
                            if(i === array.length - 1) return callback(err, tags);
                        });
                    }
                }
            } else if(type === 'number') {
                tag = tagDao.convertID(tag);
                if(cache[tag]) tags.push(cache[tag].tag);
                if(i === array.length - 1) return callback(null, tags);
            }
        } else {
            if(i === array.length - 1) return callback(null, tags);
        }
    });
};

function getTag(req, res) {
    var tag = req.path[2];
    var _id = null,
        body = {};

    if(cache[tag]) {
        _id = tagDao.convertID(cache[tag]._id);
    } else if(cache[tag.toLowerCase()]) {
        _id = tagDao.convertID(cache[tag.toLowerCase()]._id);
    } else {
        body.err = Err.tagNone;
        return res.sendjson(body);
    }
    tagCache.getTag(_id, function(err, doc) {
        db.close();
        if(err) body.err = Err.dbErr;
        else body = doc;
        return res.sendjson(body);
    });
};

function getTags(req, res) {
    var idArray = [],
        body = {};
    if(req.apibody && req.apibody.idArray && req.apibody.idArray.length >= 1) {
        for(var i = req.apibody.idArray.length - 1; i >= 0; i--) {
            if(cache[req.apibody.idArray[i]]) idArray.push(req.apibody.idArray[i]);
        };
    } else {
        body.idArray = cache._index;
        idArray = body.idArray;
    }
    body.data = idArray.slice(0, 50).map(function(tag) {
        return cache[tag];
    });
    return res.sendjson(cache);
};

function editTags(req, res) {
    var body = {};
    body.data = [];
    if(req.session.role === 'admin') {
        if(Array.isArray(req.apibody)) {
            req.apibody.forEach(function(tag, i, array) {
                setTag(tag, function(err, doc) {
                    if(err) body.err = err;
                    if(doc) body.data.push(doc);
                    if(body.err || i >= array.length - 1) {
                        db.close();
                        return res.sendjson(body);
                    }
                });
            });
        }
    } else {
        body.err = Err.userRoleErr;
        return res.sendjson(body);
    }
};

function delTag(req, res) {
    var tag = req.path[2];
    var _id = null,
        body = {};

    if(req.session.role === 'admin') {
        if(cache[tag]) {
            _id = tagDao.convertID(cache[tag]._id);
        } else if(cache[tag.toLowerCase()]) {
            _id = tagDao.convertID(cache[tag.toLowerCase()]._id);
        } else {
            body.err = Err.tagNone;
            return res.sendjson(body);
        }
        tagDao.delTag(_id, function(err, doc) {
            db.close();
            if(err) body.err = Err.dbErr;
            else body = doc;
            return res.sendjson(body);
        });
    } else {
        body.err = Err.userRoleErr;
        return res.sendjson(body);
    }
};

function delTags(req, res) {
    var body = {};

    if(req.session.role === 'admin') {
        if(Array.isArray(req.apibody)) {
            req.apibody.forEach(function(tag, i) {
                var _id = null;
                if(cache[tag]) {
                    _id = tagDao.convertID(cache[tag]._id);
                } else if(cache[tag.toLowerCase()]) {
                    _id = tagDao.convertID(cache[tag.toLowerCase()]._id);
                } else {
                    body.err = Err.tagNone;
                    return res.sendjson(body);
                }
                tagDao.delTag(_id, function(err, doc) {
                    body.data = i + 1;
                    if(i = req.apibody.length - 1) {
                        db.close();
                        return res.sendjson(body);
                    }
                    if(err) {
                        db.close();
                        body.err = Err.dbErr;
                        return res.sendjson(body);
                    }
                });
            });
        }
    } else {
        body.err = Err.userRoleErr;
        return res.sendjson(body);
    }
};

function getFn(req, res) {
    switch(req.path[2]) {
    case undefined:
    case 'index':
        return getTags(req, res);
    default:
        return getTag(req, res);
    }
};

function postFn(req, res) {
    switch(req.path[2]) {
    case undefined:
    case 'index':
        return getTags(req, res);
    case 'admin':
        return editTags(req, res);
    default:
        return res.r404();
    }
};

function deleteFn(req, res) {
    switch(req.path[2]) {
    case undefined:
    case 'index':
    case 'admin':
        return delTags(req, res);
    default:
        return delTag(req, res);
    }
};

module.exports = {
    GET: getFn,
    POST: postFn,
    DELETE: deleteFn,
    filterTags: filterTags,
    setTag: setTag,
    cache: cache
};
