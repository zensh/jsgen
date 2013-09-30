'use strict';
/*global require, module, Buffer, jsGen*/

var msg = jsGen.lib.msg,
    MD5 = jsGen.lib.tools.MD5,
    each = jsGen.lib.tools.each,
    union = jsGen.lib.tools.union,
    resJson = jsGen.lib.tools.resJson,
    toArray = jsGen.lib.tools.toArray,
    checkID = jsGen.lib.tools.checkID,
    intersect = jsGen.lib.tools.intersect,
    filterTag = jsGen.lib.tools.filterTag,
    removeItem = jsGen.lib.tools.removeItem,
    errorHandler = jsGen.lib.tools.errorHandler,
    paginationList = jsGen.lib.tools.paginationList,
    tagDao = jsGen.dao.tag,
    redis = jsGen.lib.redis,
    then = jsGen.module.then,
    tagCache = jsGen.cache.tag,
    cache = jsGen.lib.redis.tagCache,
    paginationCache = jsGen.cache.pagination;

tagCache.getP = function (ID) {
    var that = this,
        inCache = false;

    return then(function (defer) {
        if (ID >= 0) {
            var tag = that.get(ID);
            if (tag) {
                inCache = true;
                return defer(null, tag);
            } else {
                return tagDao.getTag(ID, defer);
            }
        } else {
            defer(jsGen.Err(msg.TAG.tagNone));
        }
    }).then(function (defer, tag) {
        if (!inCache) {
            that.put(ID, tag);
        }
        defer(null, tag);
    }).fail(errorHandler);
};


function convertTags(IDArray, idd) {
    return then.each(toArray(IDArray), function (defer, x) {
        cache(x, function (err, tag) {
            tag = tag && {
                _id: tagDao.convertID(tag._id),
                tag: tag.tag,
                articles: tag.articles,
                users: tag.users
            };
            defer(null, tag || null);
        });
    }).all(function (defer, err, list) {
        removeItem(list, null);
        defer(null, list);
    });
}

function setTag(tagObj) {
    var setKey = null;

    return then(function (defer) {
        if (!tagObj || !tagObj._id) {
            defer(true);
        } else if (tagObj.tag) {
            setKey = 'tag';
        } else if (tagObj.articlesList) {
            setKey = 'articlesList';
        } else if (tagObj.usersList) {
            setKey = 'usersList';
        }
        cache(tagObj._id, defer);
    }).then(function (defer, tag) {
        if (setKey === 'tag') {
            then(function (defer2) {
                if (tagObj.tag === tag.tag) {
                    defer(true);
                } else {
                    cache.get(tagObj.tag, defer2);
                }
            }).all(function (defer2, err, ID) {
                if (!err && ID !== tagObj._id) {
                    defer2(null, ID)
                } else {
                    defer2(true);
                }
            }).then(function (defer2, toID) {
                tagCache.getP(tagObj._id).then(function (defer3, tag) {
                    then.each(tag.articlesList, function (defer4, x) {
                        if (x) {
                            setTag({
                                _id: toID,
                                articlesList: x
                            });
                            jsGen.cache.list.getP(x, false).then(function (defer5, article) {
                                removeItem(article.tagsList, tagObj._id);
                                if (article.tagsList.indexOf(toID) < 0) {
                                    article.tagsList.push(toID);
                                    jsGen.cache.list.put(article._id, article);
                                    jsGen.cache.article.update(article._id, function (value) {
                                        value.tagsList = article.tagsList;
                                        return value;
                                    });
                                    jsGen.dao.article.setArticle({
                                        _id: x,
                                        tagsList: article.tagsList
                                    });
                                }
                            });
                        }
                        defer4();
                    }).each(tag.usersList, function (defer4, x) {
                        if (x) {
                            setTag({
                                _id: toID,
                                usersList: x
                            });
                            jsGen.cache.user.getP(x, false).then(function (defer5, user) {
                                removeItem(user.tagsList, tagObj._id);
                                if (user.tagsList.indexOf(toID) < 0) {
                                    user.tagsList.push(toID);
                                    jsGen.cache.user.put(user._id, user);
                                    jsGen.dao.user.setUserInfo({
                                        _id: x,
                                        tagsList: user.tagsList
                                    });
                                }
                            });
                        }
                        defer4();
                    });
                    tagDao.delTag(tagObj._id, defer3);
                }).then(function (defer3) {
                    tagCache.remove(tagObj._id);
                    cache.remove(tagObj._id);
                    tagCache.getP(toID).all(defer);
                }).fail(defer);
            }, function (defer2) {
                tagDao.setTag(tagObj, function (err, tag) {
                    if (tag) {
                        cache.update(tag);
                        tagCache.put(tag._id, tag);
                    }
                    defer(err, tag);
                });
            }).fail(defer);
        } else if (setKey === 'articlesList' || setKey === 'usersList') {
            tagCache.getP(tagObj._id).then(function (defer2, tag) {
                var exist = tag[setKey].indexOf(Math.abs(tagObj[setKey]));
                if ((tagObj[setKey] < 0 && exist >= 0) || (tagObj[setKey] > 0 && exist < 0)) {
                    tagDao.setTag(tagObj, defer2);
                } else {
                    defer2(true);
                }
            }).then(function (defer2, tag) {
                cache.update(tag);
                tagCache.put(tag._id, tag);
            }).fail(defer);
        } else {
            defer(true);
        }
    }).fail(function (defer, err) {
        defer(err === true ? jsGen.Err(msg.MAIN.requestDataErr) : err);
    });
}

function filterTags(tagArray) {
    return then.each(toArray(tagArray), function (defer, x) {
        if (x && (x = filterTag(x))) {
            then(function (defer2) {
                cache.get(x, defer2);
            }).then(function (defer2, ID) {
                defer(null, ID);
            }, function (defer2, err) {
                tagDao.setNewTag({
                    tag: x
                }, function (err, tag) {
                    defer(null, tag ? (cache.update(tag), tag._id) : null);
                });
            });
        } else {
            defer(null, null);
        }
    }).then(function (defer, IDArray) {
        removeItem(IDArray, null);
        defer(null, IDArray);
    });
}

function getTagID(req) {
    var tag = decodeURI(req.path[2]);
    return then(function (defer) {
        if (checkID(tag, 'T')) {
            defer(null, tagDao.convertID(tag));
        } else {
            cache.get(tag, function (err, ID) {
                defer(err ? jsGen.Err(msg.TAG.tagNone) : null, ID);
            });
        }
    }).then(function (defer, ID) {
        cache(ID, defer);
    }).fail(errorHandler);
}

function getTag(req, res) {
    var tag,
        p = +req.getparam.p || +req.getparam.pageIndex || 1;

    req.session.paginationKey = req.session.paginationKey || {};
    getTagID(req).then(function (defer, doc) {
        var key = 'Tag' + doc.tag,
            list = paginationCache.get(req.session.paginationKey[key]);
        tag = doc;
        if (!list || p === 1) {
            then(function (defer2) {
                tagCache.getP(tag._id).all(defer2);
            }).then(function (defer2, tag) {
                list = tag.articlesList;
                req.session.paginationKey[key] = MD5(JSON.stringify(list.slice(0, 100)), 'base64');
                paginationCache.put(req.session.paginationKey[key], list);
                defer(null, list);
            }).fail(defer);
        } else {
            defer(null, list);
        }
    }).then(function (defer, list) {
        paginationList(req, list, jsGen.cache.list, defer);
    }).then(function (defer, data, pagination) {
        tag._id = tagDao.convertID(tag._id);
        return res.sendjson(resJson(null, data, pagination, {
            tag: tag
        }));
    }).fail(res.throwError);
}

function getTags(req, res) {
    var list,
        s = +req.path[3],
        p = +req.getparam.p || +req.getparam.pageIndex || 1,
        listPagination = req.session.listPagination;

    then(function (defer) {
        cache.index(0, -1, defer);
    }).then(function (defer, list) {
        paginationList(req, list, tagCache, defer);
    }).then(function (defer, data, pagination) {
        each(data, function (tag) {
            tag._id = tagDao.convertID(tag._id);
            delete tag.articlesList;
            delete tag.usersList;
        });
        return res.sendjson(resJson(null, data, pagination));
    }).fail(res.throwError);
}

function editTags(req, res) {
    var defaultObj = {
        _id: '',
        tag: ''
    },
        result = {};

    then(function (defer) {
        if (!req.session.role || req.session.role < 4) {
            defer(jsGen.Err(msg.USER.userRoleErr));
        } else {
            defer(null, toArray(req.apibody.data));
        }
    }).each(null, function (defer, x) {
            x = intersect(union(defaultObj), x);
            x._id = tagDao.convertID(x._id);
            setTag(x).all(function (defer, err, tag) {
                if (tag) {
                    tag._id = tagDao.convertID(tag._id);
                    delete tag.articlesList;
                    delete tag.usersList;
                    result[tag._id] = tag;
                }
                defer();
            });
    }).then(function (defer) {
        res.sendjson(resJson(null, result));
    }).fail(res.throwError);
}

function delTag(req, res) {
    var ID;
    getTagID(req).then(function (defer, tag) {
        if (req.session.role !== 5) {
            defer(jsGen.Err(msg.USER.userRoleErr));
        } else {
            ID = tag._id;
            tagDao.delTag(ID, defer);
        }
    }).then(function (defer) {
        tagCache.remove(ID);
        cache.remove(ID);
        return res.sendjson(resJson());
    }).fail(res.throwError);
}



module.exports = {
    GET: function (req, res) {
        switch (req.path[2]) {
        case undefined:
        case 'index':
        case 'hots':
            return getTags(req, res);
        default:
            return getTag(req, res);
        }
    },
    POST: function (req, res) {
        switch (req.path[2]) {
        case undefined:
        case 'index':
            return getTags(req, res);
        case 'admin':
            return editTags(req, res);
        default:
            return res.r404();
        }
    },
    DELETE: function (req, res) {
        return delTag(req, res);
    },
    filterTags: filterTags,
    setTag: setTag,
    convertTags: convertTags
};