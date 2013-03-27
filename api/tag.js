var union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    checkID = jsGen.lib.tools.checkID,
    filterTag = jsGen.lib.tools.filterTag,
    MD5 = jsGen.lib.tools.MD5,
    pagination = jsGen.lib.tools.pagination,
    tagCache = jsGen.cache.tag;

tagCache.getP = function (tagID, callback) {
    var that = this,
        doc = this.get(tagID);
    callback = callback || jsGen.lib.tools.callbackFn;
    if (doc) {
        return callback(null, doc);
    } else jsGen.dao.tag.getTag(jsGen.dao.tag.convertID(tagID), function (err, doc) {
        if (doc) {
            doc._id = jsGen.dao.tag.convertID(doc._id);
            that.put(doc._id, doc);
        }
        return callback(err, doc);
    });
};

var cache = {
    _initTime: 0,
    _index: []
};
cache._update = function (obj) {
    var that = this;
    if (!this[obj._id]) {
        this[obj._id] = {};
        this._index.push(obj._id);
    }
    this[obj._id]._id = obj._id;
    this[obj._id].tag = obj.tag;
    this[obj._id].articles = obj.articles;
    this[obj._id].users = obj.users;
    if (!this[obj.tag.toLowerCase()]) {
        this[obj.tag.toLowerCase()] = this[obj._id];
    }
    this._index.sort(function (a, b) {
        return that[b].articles - that[a].articles;
    });
    this._initTime = Date.now();
    return this;
};
cache._remove = function (ID) {
    var i, that = this;
    if (this[ID]) {
        delete this[this[ID].tag.toLowerCase()];
        delete this[ID];
        this._index.splice(i = this._index.indexOf(ID), i >= 0 ? 1 : 0);
        this._index.sort(function (a, b) {
            return that[b].articles - that[a].articles;
        });
        this._initTime = Date.now();
    }
    return this;
};
(function () {
    var that = this;
    jsGen.dao.tag.getTagsIndex(function (err, doc) {
        if (err) {
            throw err;
        }
        if (doc) {
            doc._id = jsGen.dao.tag.convertID(doc._id);
            that._update(doc);
        }
    });
}).call(cache);

function convertTags(_idArray) {
    var result = [];
    if (!Array.isArray(_idArray)) _idArray = [_idArray];
    if (typeof _idArray[0] === 'number') {
        _idArray = _idArray.map(function (x) {
            return jsGen.dao.tag.convertID(x);
        });
    }
    if (typeof _idArray[0] !== 'string') {
        return result;
    }
    _idArray.forEach(function (x, i) {
        if (cache[x]) {
            result.push({
                _id: cache[x]._id,
                tag: cache[x].tag
            });
        }
    });
    return result;
};

function setTag(tagObj, callback) {
    var tagID = null,
        setKey = null,
        callback = callback || jsGen.lib.tools.callbackFn;

    function setCache(doc) {
        cache._remove(doc._id);
        cache._update(doc);
        tagCache.put(doc._id, doc);
    };

    if (!tagObj || !tagObj._id) {
        return callback(null, null);
    }
    if (typeof tagObj._id === 'string') {
        tagID = tagObj._id;
        tagObj._id = jsGen.dao.tag.convertID(tagObj._id);
    } else {
        tagID = jsGen.dao.tag.convertID(tagObj._id);
    }
    if (!cache[tagID]) {
        return callback(null, null);
    }
    if (tagObj.tag) {
        setKey = 'tag';
    } else if (tagObj.articlesList) {
        setKey = 'articlesList';
    } else if (tagObj.usersList) {
        setKey = 'usersList';
    }

    if (setKey === 'tag') {
        if (tagObj.tag === cache[tagID].tag) {
            return callback(null, null);
        }
        if (cache[tagObj.tag.toLowerCase()] && cache[tagObj.tag.toLowerCase()]._id !== tagID) {
            toID = cache[tagObj.tag.toLowerCase()]._id;
            tagCache.getP(tagID, function (err, doc) {
                if (err) {
                    return callback(err, null);
                }
                doc.articlesList.reverse();
                doc.usersList.reverse();
                articlesListNext();

                function articlesListNext() {
                    var article = doc.articlesList.pop();
                    if (!article) {
                        return usersListNext();
                    }
                    setTag({
                        _id: toID,
                        articlesList: article
                    });
                    return articlesListNext();
                };

                function usersListNext() {
                    var user = doc.usersList.pop();
                    if (!user) {
                        return delTag();
                    }
                    setTag({
                        _id: toID,
                        usersList: user
                    });
                    return usersListNext();
                };

                function delTag() {
                    jsGen.dao.tag.delTag(tagObj._id, function () {
                        tagCache.remove(tagID);
                        cache._remove(tagID);
                        tagCache.getP(toID, function (err, doc) {
                            return callback(err, doc);
                        });
                    });
                };
            });
        } else {
            jsGen.dao.tag.setTag(tagObj, function (err, doc) {
                if (doc) {
                    doc._id = jsGen.dao.tag.convertID(doc._id);
                    setCache(doc);
                }
                return callback(err, doc);
            });
        }
    } else if (setKey === 'articlesList' || setKey === 'usersList') {
        tagCache.getP(tagID, function (err, doc) {
            if (err) {
                return callback(err, null);
            }
            var exist = doc[setKey].indexOf(Math.abs(tagObj[setKey]));
            if ((tagObj[setKey] < 0 && exist >= 0) || (tagObj[setKey] > 0 && exist < 0)) {
                jsGen.dao.tag.setTag(tagObj, function (err, doc) {
                    if (doc) {
                        doc._id = jsGen.dao.tag.convertID(doc._id);
                        setCache(doc);
                    }
                    return callback(err, doc);
                });
            } else {
                return callback(null, null);
            }
        });
    } else {
        return callback(null, null);
    }
};

function filterTags(tagArray, callback) {
    var tags = [],
        callback = callback || jsGen.lib.tools.callbackFn;

    if (!Array.isArray(tagArray)) {
        tagArray = [tagArray];
    }
    if (tagArray.length === 0) {
        return callback(null, tags);
    }
    tagArray.reverse();
    next();

    function next() {
        var tag = tagArray.pop();
        if (!tag) {
            return callback(null, tags);
        }
        tag = filterTag(tag);
        if (!tag) return next();
        if (cache[tag]) {
            tags.push(jsGen.dao.tag.convertID(cache[tag]._id));
            return next();
        } else if (cache[tag.toLowerCase()]) {
            tags.push(jsGen.dao.tag.convertID(cache[tag.toLowerCase()]._id));
            return next();
        } else {
            jsGen.dao.tag.setNewTag({
                tag: tag
            }, function (err, doc) {
                if (doc) {
                    tags.push(doc._id);
                    doc._id = jsGen.dao.tag.convertID(doc._id);
                    cache._update(doc);
                }
                return next();
            });
        }
    };
};

function getTag(req, res, dm) {
    var tag = req.path[2];
    if (!checkID(tag, 'T')) {
        throw jsGen.Err(jsGen.lib.msg.tagNone);
    }
    if (cache[tag]) {
        tag = cache[tag]._id;
    } else if (cache[tag.toLowerCase()]) {
        tag = cache[tag.toLowerCase()]._id;
    } else {
        throw jsGen.Err(jsGen.lib.msg.tagNone);
    }

    tagCache.getP(tag, dm.intercept(function (doc) {
        var list, key,
            n = +req.path[3],
            p = req.getparam.p || req.getparam.page || 1;

        doc.articlesList.forEach(function (x, i) {
            doc.articlesList[i] = jsGen.dao.tag.convertID(x);
        });
        if (n > 0) {
            if (n > 20) {
                n = 20;
            }
            req.getparam = req.getparam || {};
            req.getparam.p = 1;
            req.getparam.n = n;
            list = doc.articlesList.slice(-n).reverse();
        } else {
            n = 0;
            p = +p;
            key = MD5(JSON.stringify(doc.articlesList), 'base64');

            if (!req.session.listPagination) {
                req.session.listPagination = {
                    key: key
                };
            }
            list = jsGen.cache.pagination.get(req.session.listPagination.key);
            if (!list || (p === 1 && req.session.listPagination.key !== key)) {
                req.session.listPagination.key = key;
                list = doc.articlesList.slice(0).reverse();
                jsGen.cache.pagination.put(req.session.listPagination.key, list);
            }
        }
        pagination(req, list, jsGen.cache.list, dm.intercept(function (articlesList) {
            var tag = {
                _id: '',
                tag: '',
                articles: 0
            };
            if (articlesList.pagination) {
                union(req.session.listPagination, articlesList.pagination);
            }
            if (p === 1 || n > 0) {
                articlesList.tag = intersect(tag, doc);
            }
            return res.sendjson(articlesList);
        }));
    }));
};

function getTags(req, res, dm) {
    var list,
        n = +req.path[3],
        p = req.getparam.p || req.getparam.page || 1;

    if (n > 0) {
        if (n > 20) {
            n = 20;
        }
        req.getparam = req.getparam || {};
        req.getparam.p = 1;
        req.getparam.n = n;
        list = cache._index.slice(-n).reverse();
    } else {
        n = 0;
        p = +p;
        if (!req.session.listPagination) {
            req.session.listPagination = {
                key: 'tag' + cache._initTime
            };
        }
        list = jsGen.cache.pagination.get(req.session.listPagination.key);
        if (!list || (p === 1 && req.session.listPagination.key !== 'tag' + cache._initTime)) {
            req.session.listPagination.key = 'tag' + cache._initTime;
            list = cache._index.slice(0).reverse();
            jsGen.cache.pagination.put(req.session.listPagination.key, list);
        }
    }
    pagination(req, list, tagCache, dm.intercept(function (tagsList) {
        tagsList.data.forEach(function (tag) {
            delete tag.articlesList;
            delete tag.usersList;
        });
        if (tagsList.pagination) {
            union(req.session.listPagination, tagsList.pagination);
        }
        return res.sendjson(tagsList);
    }));
};

function editTags(req, res, dm) {
    var body = {};
    body.data = [];
    if (req.session.role < 4) throw jsGen.Err(jsGen.lib.msg.userRoleErr);

    if (Array.isArray(req.apibody)) {
        req.apibody.forEach(function (tag, i, array) {
            setTag(tag, function (err, doc) {
                if (err) {
                    body.err = err;
                }
                if (doc) {
                    body.data.push(doc);
                }
                if (body.err || i >= array.length - 1) {
                    jsGen.dao.db.close();
                    return res.sendjson(body);
                }
            });
        });
    }
};

function delTag(req, res, dm) {
    var tag = req.path[2];
    var _id = null,
        body = {};

    if (req.session.role < 4) throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    if (cache[tag]) {
        _id = jsGen.dao.tag.convertID(cache[tag]._id);
    } else if (cache[tag.toLowerCase()]) {
        _id = jsGen.dao.tag.convertID(cache[tag.toLowerCase()]._id);
    } else {
        throw jsGen.Err(jsGen.lib.msg.tagNone);
    }
    jsGen.dao.tag.delTag(_id, function (err, doc) {
        jsGen.dao.db.close();
        if (err) {
            body.err = jsGen.lib.msg.dbErr;
        } else {
            body = doc;
        }
        return res.sendjson(body);
    });
};

function getFn(req, res, dm) {
    switch (req.path[2]) {
        case undefined:
        case 'index':
            return getTags(req, res, dm);
        default:
            return getTag(req, res, dm);
    }
};

function postFn(req, res, dm) {
    switch (req.path[2]) {
        case undefined:
        case 'index':
            return getTags(req, res, dm);
        case 'admin':
            return editTags(req, res, dm);
        default:
            return res.r404();
    }
};

function deleteFn(req, res, dm) {
        return delTag(req, res, dm);
    }
};

module.exports = {
    GET: getFn,
    POST: postFn,
    DELETE: deleteFn,
    filterTags: filterTags,
    setTag: setTag,
    cache: cache,
    convertTags: convertTags
};
