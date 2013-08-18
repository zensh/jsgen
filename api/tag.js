'use strict';
/*global require, module, Buffer, jsGen*/

var then = jsGen.module.then,
    throwError = jsGen.lib.tools.throwError,
    errorHandler = jsGen.lib.tools.errorHandler,
    each = jsGen.lib.tools.each,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    removeItem = jsGen.lib.tools.remove,
    toArray = jsGen.lib.tools.toArray,
    checkID = jsGen.lib.tools.checkID,
    filterTag = jsGen.lib.tools.filterTag,
    MD5 = jsGen.lib.tools.MD5,
    paginationList = jsGen.lib.tools.paginationList,
    tagCache = jsGen.cache.tag,
    resJson = jsGen.lib.tools.resJson,
    callbackFn = jsGen.lib.tools.callbackFn,
    tagDao = jsGen.dao.tag,
    paginationCache = jsGen.cache.pagination;

tagCache.getP = function (ID) {
    var that = this,
        isCache = false,
        doc = this.get(ID);

    return then(function (defer) {
        if (doc) {
            isCache = true;
            return defer(null, doc);
        } else {
            return tagDao.getTag(ID, defer);
        }
    }).all(function (defer, err, doc) {
        if (doc && !isCache) {
            that.put(ID, doc);
        }
        return defer(err, doc);
    });
};


function convertTags(IDArray) {
    var result = [];
    IDArray = toArray(IDArray);
    each(IDArray, function (x) {
        if (cache[x]) {
            result.push({
                _id: tagDao.convertID(x),
                tag: cache[x].tag
            });
        }
    });
    return result;
}

function setTag(tagObj, callback) {
    var setKey = null;

    callback = callback || callbackFn;

    function setCache(doc) {
        cache._remove(doc._id);
        cache._update(doc);
        tagCache.put(doc._id, doc);
    }

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
        var tagLower = tagObj.tag.toLowerCase();
        if (tagObj.tag === cache[tagObj._id].tag) {
            return callback(null, null);
        } else if (cache[tagLower] && cache[tagLower]._id !== tagObj._id) {
            var toID = cache[tagLower]._id;
            tagCache.getP(tagObj._id).all(function (defer, err, doc) {
                if (err) {
                    return callback(err, null);
                } else {
                    articlesListNext();
                }

                function articlesListNext() {
                    then.each(doc.articlesList, function (next, x) {
                        if (x) {
                            setTag({
                                _id: toID,
                                articlesList: x
                            });
                            jsGen.cache.list.getP(x, false).all(function (defer, err, value) {
                                if (err) {
                                    return callback(err, null);
                                } else if (value.tagsList.indexOf(toID) < 0) {
                                    value.tagsList.push(toID);
                                    jsGen.cache.list.put(value._id, value);
                                    jsGen.cache.article.update(value._id, function (v) {
                                        v.tagsList = value.tagsList;
                                        return v;
                                    });
                                    jsGen.dao.article.setArticle({
                                        _id: x,
                                        tagsList: value.tagsList
                                    });
                                }
                            });
                        }
                        return next ? next() : usersListNext();
                    });
                }

                function usersListNext() {
                    then.each(doc.usersList, function (next, x) {
                        if (x) {
                            setTag({
                                _id: toID,
                                usersList: x
                            });
                            jsGen.cache.user.getP(x, false).then(function (defer, err, value) {
                                if (err) {
                                    return callback(err, null);
                                } else if (value.tagsList.indexOf(toID) < 0) {
                                    value.tagsList.push(toID);
                                    jsGen.cache.user.put(value._id, value);
                                    jsGen.dao.user.setUserInfo({
                                        _id: x,
                                        tagsList: value.tagsList
                                    });
                                }
                            });
                        }
                        return next ? next() : delTag();
                    });
                }

                function delTag() {
                    tagDao.delTag(tagObj._id, function () {
                        tagCache.remove(tagObj._id);
                        cache._remove(tagObj._id);
                        tagCache.getP(toID).all(function (defer, err, doc) {
                            return callback(err, doc);
                        });
                    });
                }
            });
        } else {
            tagDao.setTag(tagObj, function (err, doc) {
                if (doc) {
                    setCache(doc);
                }
                return callback(err, doc);
            });
        }
    } else if (setKey === 'articlesList' || setKey === 'usersList') {
        tagCache.getP(tagObj._id).all(function (defer, err, doc) {
            if (err) {
                return callback(err, null);
            }
            var exist = doc[setKey].indexOf(Math.abs(tagObj[setKey]));
            if ((tagObj[setKey] < 0 && exist >= 0) || (tagObj[setKey] > 0 && exist < 0)) {
                tagDao.setTag(tagObj, function (err, doc) {
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
}

function filterTags(tagArray) {

    return then(function (defer) {
        var tags = [];

        tagArray = toArray(tagArray);
        then.each(tagArray, function (next, x) {
            if (x && (x = filterTag(x))) {
                if (cache[x.toLowerCase()]) {
                    tags.push(cache[x.toLowerCase()]._id);
                    return next ? next() : defer(null, tags);
                } else {
                    tagDao.setNewTag({
                        tag: x
                    }, function (err, doc) {
                        if (doc) {
                            tags.push(doc._id);
                            cache._update(doc);
                        }
                        return next ? next() : defer(null, tags);
                    });
                }
            } else {
                return next ? next() : defer(null, tags);
            }
        });
    });
}

function getTag(req, res, dm) {
    var tag = decodeURI(req.path[2]);
    if (tag[0] === '_') {
        throw jsGen.Err(jsGen.lib.msg.tagNone);
    }
    if (checkID(tag, 'T')) {
        tag = tagDao.convertID(tag);
    }
    if (typeof tag === 'string') {
        tag = tag.toLowerCase();
    }
    if (cache[tag]) {
        tag = cache[tag]._id;
    } else {
        throw jsGen.Err(jsGen.lib.msg.tagNone);
    }
    tagCache.getP(tag).then(function (defer, doc) {
        var list, key,
            s = +req.path[3],
            p = +req.getparam.p || +req.getparam.pageIndex || 1,
            listPagination = req.session.listPagination;

        if (s > 0) {
            s = s > 20 ? 20 : s;
            req.getparam = req.getparam || {};
            req.getparam.p = 1;
            req.getparam.s = s;
            list = doc.articlesList.slice(-s).reverse();
        } else {
            s = 0;
            key = MD5(JSON.stringify(doc.articlesList), 'base64');
            if (!listPagination) {
                listPagination = req.session.listPagination = {
                    key: key
                };
            }
            list = paginationCache.get(listPagination.key);
            if (!list || (p === 1 && listPagination.key !== key)) {
                listPagination.key = key;
                list = doc.articlesList.reverse();
                paginationCache.put(listPagination.key, list);
            }
        }
        paginationList(req, list, jsGen.cache.list, defer);
    }).then(function (defer, data, pagination) {
        union(req.session.listPagination, pagination);
        if (p === 1 || s > 0) {
            doc._id = tagDao.convertID(doc._id);
            delete doc.articlesList;
            delete doc.usersList;
        }
        return res.sendjson(resJson(null, data, pagination, {
            tag: doc
        }));
    }).fail(throwError);
}

function getTags(req, res, dm) {
    var list,
        s = +req.path[3],
        p = +req.getparam.p || +req.getparam.pageIndex || 1,
        listPagination = req.session.listPagination;

    if (s > 0) {
        s = s > 20 ? 20 : s;
        req.getparam = req.getparam || {};
        req.getparam.pageIndex = 1;
        req.getparam.pageSize = s;
        list = cache._index.slice(-s);
    } else {
        s = 0;
        if (!listPagination) {
            listPagination = req.session.listPagination = {
                key: 'tag' + cache._initTime
            };
        }
        list = paginationCache.get(listPagination.key);
        if (!list || (p === 1 && listPagination.key !== 'tag' + cache._initTime)) {
            listPagination.key = 'tag' + cache._initTime;
            list = cache._index.slice(0);
            paginationCache.put(listPagination.key, list);
        }
    }
    paginationList(req, list, tagCache, dm.intercept(function (data, pagination) {
        data.forEach(function (tag) {
            tag._id = tagDao.convertID(tag._id);
            delete tag.articlesList;
            delete tag.usersList;
        });
        union(req.session.listPagination, pagination);
        return res.sendjson(resJson(null, data, pagination));
    }));
}

function editTags(req, res, dm) {
    var defaultObj = {
        _id: '',
        tag: ''
    },
        data = {},
        tagArray = req.apibody.data;

    if (!req.session.role || req.session.role < 4) {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    if (!tagArray) {
        throw jsGen.Err(jsGen.lib.msg.requestDataErr);
    }
    tagArray = toArray(tagArray);
    then.each(tagArray, function (next, x) {
        if (x && x._id && x.tag) {
            x = intersect(union(defaultObj), x);
            x._id = tagDao.convertID(x._id);
            setTag(x, dm.intercept(function (doc) {
                if (doc) {
                    doc._id = tagDao.convertID(doc._id);
                    delete doc.articlesList;
                    delete doc.usersList;
                    data[doc._id] = doc;
                }
                return next ? next() : res.sendjson(resJson(null, data));
            }));
        } else {
            return next ? next() : res.sendjson(resJson(null, data));
        }
    });
}

function delTag(req, res, dm) {
    var tag = decodeURI(req.path[2]);

    if (req.session.role !== 5) {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    if (tag[0] === '_') {
        throw jsGen.Err(jsGen.lib.msg.tagNone);
    }
    if (checkID(tag, 'T')) {
        tag = tagDao.convertID(tag);
    }
    if (typeof tag === 'string') {
        tag = tag.toLowerCase();
    }
    if (cache[tag]) {
        tag = cache[tag]._id;
    } else {
        throw jsGen.Err(jsGen.lib.msg.tagNone);
    }
    tagDao.delTag(tag, dm.intercept(function () {
        tagCache.remove(tag);
        cache._remove(tag);
        return res.sendjson(resJson());
    }));
}

function getFn(req, res, dm) {
    switch (req.path[2]) {
    case undefined:
    case 'index':
    case 'hots':
        return getTags(req, res, dm);
    default:
        return getTag(req, res, dm);
    }
}

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
}

function deleteFn(req, res, dm) {
    return delTag(req, res, dm);
}

module.exports = {
    GET: getFn,
    POST: postFn,
    DELETE: deleteFn,
    filterTags: filterTags,
    setTag: setTag,
    cache: cache,
    convertTags: convertTags
};