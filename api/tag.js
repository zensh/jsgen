var union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    checkID = jsGen.lib.tools.checkID,
    filterTag = jsGen.lib.tools.filterTag,
    MD5 = jsGen.lib.tools.MD5,
    pagination = jsGen.lib.tools.pagination,
    tagCache = jsGen.cache.tag;

tagCache.getP = function (ID, callback) {
    var that = this,
        doc = this.get(ID);
    callback = callback || jsGen.lib.tools.callbackFn;
    if (doc) {
        return callback(null, doc);
    } else {
        jsGen.dao.tag.getTag(ID, function (err, doc) {
            if (doc) {
                that.put(ID, doc);
            }
            return callback(err, doc);
        });
    }
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
    this[obj.tag.toLowerCase()] = this[obj._id];
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
            that._update(doc);
        }
    });
}).call(cache);

function convertTags(IDArray) {
    var result = [];
    if (!Array.isArray(IDArray)) {
        IDArray = [IDArray];
    }
    for (var i = 0, len = IDArray.length; i < len; i++) {
        if (cache[IDArray[i]]) {
            result.push({
                _id: jsGen.dao.tag.convertID(IDArray[i]),
                tag: cache[IDArray[i]].tag
            });
        }
    }
    return result;
};

function setTag(tagObj, callback) {
    var setKey = null,
        callback = callback || jsGen.lib.tools.callbackFn;

    function setCache(doc) {
        cache._remove(doc._id);
        cache._update(doc);
        tagCache.put(doc._id, doc);
    };

    if (!tagObj || !tagObj._id || !cache[tagObj._id]) {
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
        if (tagObj.tag === cache[tagObj._id].tag) {
            return callback(null, null);
        }
        if (cache[tagObj.tag.toLowerCase()] && cache[tagObj.tag.toLowerCase()]._id !== tagObj._id) {
            var toID = cache[tagObj.tag.toLowerCase()]._id;
            tagCache.getP(tagObj._id, function (err, doc) {
                if (err) {
                    return callback(err, null);
                }
                doc.articlesList.reverse();
                doc.usersList.reverse();
                articlesListNext();

                function articlesListNext() {
                    var article;
                    if (doc.articlesList.length === 0) {
                        return usersListNext();
                    }
                    article = doc.articlesList.pop();
                    if (!article) {
                        return articlesListNext();
                    }
                    setTag({
                        _id: toID,
                        articlesList: article
                    });
                    jsGen.cache.list.getP(article, function (err, value) {
                        if (err) {
                            return callback(err, null);
                        }
                        if (value.tagsList.indexOf(toID) < 0) {
                            value.tagsList.push(toID);
                            jsGen.cache.list.put(value._id, value);
                            jsGen.cache.article.update(value._id, function (v) {
                                v.tagsList = value.tagsList;
                                return v;
                            });
                            jsGen.dao.article.setArticle({
                                _id: article,
                                tagsList: value.tagsList
                            });
                        }
                    }, false);
                    return articlesListNext();
                };

                function usersListNext() {
                    var user;
                    if (doc.usersList.length === 0) {
                        return delTag();
                    }
                    user = doc.usersList.pop();
                    if (!user) {
                        return usersListNext();
                    }
                    setTag({
                        _id: toID,
                        usersList: user
                    });
                    jsGen.cache.user.getP(user, function (err, value) {
                        if (err) {
                            return callback(err, null);
                        }
                        if (value.tagsList.indexOf(toID) < 0) {
                            value.tagsList.push(toID);
                            jsGen.cache.user.put(value._id, value);
                            jsGen.dao.user.setUserInfo({
                                _id: user,
                                tagsList: value.tagsList
                            });
                        }
                    }, false);
                    return usersListNext();
                };

                function delTag() {
                    jsGen.dao.tag.delTag(tagObj._id, function () {
                        tagCache.remove(tagObj._id);
                        cache._remove(tagObj._id);
                        tagCache.getP(toID, function (err, doc) {
                            return callback(err, doc);
                        });
                    });
                };
            });
        } else {
            jsGen.dao.tag.setTag(tagObj, function (err, doc) {
                if (doc) {
                    setCache(doc);
                }
                return callback(err, doc);
            });
        }
    } else if (setKey === 'articlesList' || setKey === 'usersList') {
        tagCache.getP(tagObj._id, function (err, doc) {
            if (err) {
                return callback(err, null);
            }
            var exist = doc[setKey].indexOf(Math.abs(tagObj[setKey]));
            if ((tagObj[setKey] < 0 && exist >= 0) || (tagObj[setKey] > 0 && exist < 0)) {
                jsGen.dao.tag.setTag(tagObj, function (err, doc) {
                    if (doc) {
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
        var tag;
        if (tagArray.length === 0) {
            return callback(null, tags);
        }
        tag = filterTag(tagArray.pop());
        if (!tag) {
            return next();
        }
        tag = tag.toLowerCase();
        if (cache[tag]) {
            tags.push(cache[tag]._id);
            return next();
        } else {
            jsGen.dao.tag.setNewTag({
                tag: tag
            }, function (err, doc) {
                if (doc) {
                    tags.push(doc._id);
                    cache._update(doc);
                }
                return next();
            });
        }
    };
};

function getTag(req, res, dm) {
    var tag = decodeURI(req.path[2]);
    if (tag[0] === '_') {
        throw jsGen.Err(jsGen.lib.msg.tagNone);
    }
    if (checkID(tag, 'T')) {
        tag = jsGen.dao.tag.convertID(tag);
    }
    if (typeof tag === 'string') {
        tag = tag.toLowerCase();
    }
    if (cache[tag]) {
        tag = cache[tag]._id;
    } else {
        throw jsGen.Err(jsGen.lib.msg.tagNone);
    }
    tagCache.getP(tag, dm.intercept(function (doc) {
        var list, key,
            n = +req.path[3],
            p = req.getparam.p || req.getparam.page || 1;

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
                list = doc.articlesList.reverse();
                jsGen.cache.pagination.put(req.session.listPagination.key, list);
            }
        }
        pagination(req, list, jsGen.cache.list, dm.intercept(function (articlesList) {
            if (articlesList.pagination) {
                union(req.session.listPagination, articlesList.pagination);
            }
            if (p === 1 || n > 0) {
                doc._id = jsGen.dao.tag.convertID(doc._id);
                delete doc.articlesList;
                delete doc.usersList;
                articlesList.tag = doc;
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
        list = cache._index.slice(-n);
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
            list = cache._index.slice(0);
            jsGen.cache.pagination.put(req.session.listPagination.key, list);
        }
    }
    pagination(req, list, tagCache, dm.intercept(function (tagsList) {
        tagsList.data.forEach(function (tag) {
            tag._id = jsGen.dao.tag.convertID(tag._id);
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
    var defaultObj = {
            _id: '',
            tag: ''
        },
        body = {
            data: []
        },
        tagArray = req.apibody.data;

    if (req.session.role < 4) {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    if (!tagArray) {
        throw jsGen.Err(jsGen.lib.msg.requestDataErr);
    }
    if (!Array.isArray(tagArray)) {
        tagArray = [tagArray];
    }
    tagArray.reverse();
    next();

    function next() {
        var tagObj;
        if (tagArray.length === 0) {
            return res.sendjson(body);
        }
        tagObj = tagArray.pop();
        if (!tagObj || !tagObj._id || !tagObj.tag) {
            return next();
        }
        tagObj = intersect(union(defaultObj), tagObj);
        setTag(tagObj, dm.intercept(function (doc) {
            if (doc) {
                doc._id = jsGen.dao.tag.convertID(doc._id);
                delete doc.articlesList;
                delete doc.usersList;
                body.data.push(doc);
            }
            return next();
        }));
    };
};

function delTag(req, res, dm) {
    var tag = decodeURI(req.path[2]);

    if (req.session.role !== 5) {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    if (tag[0] === '_') {
        throw jsGen.Err(jsGen.lib.msg.tagNone);
    }
    if (checkID(tag, 'T')) {
        tag = jsGen.dao.tag.convertID(tag);
    }
    if (typeof tag === 'string') {
        tag = tag.toLowerCase();
    }
    if (cache[tag]) {
        tag = cache[tag]._id;
    } else {
        throw jsGen.Err(jsGen.lib.msg.tagNone);
    }
    jsGen.dao.tag.delTag(tag, dm.intercept(function () {
        tagCache.remove(tag);
        cache._remove(tag);
        return res.sendjson({
            remove: 'Ok'
        });
    }));
};

function getFn(req, res, dm) {
    switch (req.path[2]) {
        case undefined:
        case 'index':
        case 'hots':
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
