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

    return then(function (cont) {
        if (ID >= 0) {
            var tag = that.get(ID);
            if (tag) {
                inCache = true;
                return cont(null, tag);
            } else {
                return tagDao.getTag(ID, cont);
            }
        } else {
            cont(jsGen.Err(msg.TAG.tagNone));
        }
    }).then(function (cont, tag) {
        if (!inCache) {
            that.put(ID, tag);
        }
        cont(null, tag);
    }).fail(errorHandler);
};


function convertTags(IDArray, idd) {
    return then.each(toArray(IDArray), function (cont, x) {
        cache(x, function (err, tag) {
            tag = tag && {
                _id: tagDao.convertID(tag._id),
                tag: tag.tag,
                articles: tag.articles,
                users: tag.users
            };
            cont(null, tag || null);
        });
    }).fin(function (cont, err, list) {
        removeItem(list, null);
        cont(null, list);
    });
}

function setTag(tagObj) {
    var setKey = null;

    return then(function (cont) {
        if (!tagObj || !tagObj._id) {
            cont(true);
        } else if (tagObj.tag) {
            setKey = 'tag';
        } else if (tagObj.articlesList) {
            setKey = 'articlesList';
        } else if (tagObj.usersList) {
            setKey = 'usersList';
        }
        cache(tagObj._id, cont);
    }).then(function (cont, tag) {
        if (setKey === 'tag') {
            then(function (cont2) {
                if (tagObj.tag === tag.tag) {
                    cont(true);
                } else {
                    cache.get(tagObj.tag, cont2);
                }
            }).fin(function (cont2, err, ID) {
                if (!err && ID !== tagObj._id) {
                    cont2(null, ID);
                } else {
                    cont2(true);
                }
            }).then(function (cont2, toID) {
                tagCache.getP(tagObj._id).then(function (cont3, tag) {
                    then.each(tag.articlesList, function (cont4, x) {
                        if (x) {
                            setTag({
                                _id: toID,
                                articlesList: x
                            });
                            jsGen.cache.list.getP(x, false).then(function (cont5, article) {
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
                        cont4();
                    }).each(tag.usersList, function (cont4, x) {
                        if (x) {
                            setTag({
                                _id: toID,
                                usersList: x
                            });
                            jsGen.cache.user.getP(x, false).then(function (cont5, user) {
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
                        cont4();
                    });
                    tagDao.delTag(tagObj._id, cont3);
                }).then(function (cont3) {
                    tagCache.remove(tagObj._id);
                    cache.remove(tagObj._id);
                    tagCache.getP(toID).fin(cont);
                }).fail(cont);
            }, function (cont2) {
                tagDao.setTag(tagObj, function (err, tag) {
                    if (tag) {
                        cache.update(tag);
                        tagCache.put(tag._id, tag);
                    }
                    cont(err, tag);
                });
            }).fail(cont);
        } else if (setKey === 'articlesList' || setKey === 'usersList') {
            tagCache.getP(tagObj._id).then(function (cont2, tag) {
                var exist = tag[setKey].indexOf(Math.abs(tagObj[setKey]));
                if ((tagObj[setKey] < 0 && exist >= 0) || (tagObj[setKey] > 0 && exist < 0)) {
                    tagDao.setTag(tagObj, cont2);
                } else {
                    cont2(true);
                }
            }).then(function (cont2, tag) {
                cache.update(tag);
                tagCache.put(tag._id, tag);
            }).fail(cont);
        } else {
            cont(true);
        }
    }).fail(function (cont, err) {
        cont(err === true ? jsGen.Err(msg.MAIN.requestDataErr) : err);
    });
}

function filterTags(tagArray) {
    return then.each(toArray(tagArray), function (cont, x) {
        if (x && (x = filterTag(x))) {
            then(function (cont2) {
                cache.get(x, cont2);
            }).then(function (cont2, ID) {
                cont(null, ID);
            }, function (cont2, err) {
                tagDao.setNewTag({
                    tag: x
                }, function (err, tag) {
                    cont(null, tag ? (cache.update(tag), tag._id) : null);
                });
            });
        } else {
            cont(null, null);
        }
    }).then(function (cont, IDArray) {
        removeItem(IDArray, null);
        cont(null, IDArray);
    });
}

function getTagID(req) {
    var tag = decodeURI(req.path[2]);
    return then(function (cont) {
        if (checkID(tag, 'T')) {
            cont(null, tagDao.convertID(tag));
        } else {
            cache.get(tag, function (err, ID) {
                cont(err ? jsGen.Err(msg.TAG.tagNone) : null, ID);
            });
        }
    }).then(function (cont, ID) {
        cache(ID, cont);
    }).fail(errorHandler);
}

function getTag(req, res) {
    var tag,
        p = +req.getparam.p || +req.getparam.pageIndex || 1;

    req.session.paginationKey = req.session.paginationKey || {};
    getTagID(req).then(function (cont, doc) {
        var key = 'Tag' + doc.tag,
            list = paginationCache.get(req.session.paginationKey[key]);
        tag = doc;
        if (!list || p === 1) {
            then(function (cont2) {
                tagCache.getP(tag._id).fin(cont2);
            }).then(function (cont2, tag) {
                list = tag.articlesList;
                req.session.paginationKey[key] = MD5(JSON.stringify(list.slice(0, 100)), 'base64');
                paginationCache.put(req.session.paginationKey[key], list);
                cont(null, list);
            }).fail(cont);
        } else {
            cont(null, list);
        }
    }).then(function (cont, list) {
        paginationList(req, list, jsGen.cache.list, cont);
    }).then(function (cont, data, pagination) {
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

    then(function (cont) {
        cache.index(0, -1, cont);
    }).then(function (cont, list) {
        paginationList(req, list, tagCache, cont);
    }).then(function (cont, data, pagination) {
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

    then(function (cont) {
        if (!req.session.role || req.session.role < 4) {
            cont(jsGen.Err(msg.USER.userRoleErr));
        } else {
            cont(null, toArray(req.apibody.data));
        }
    }).each(null, function (cont, x) {
            x = intersect(union(defaultObj), x);
            x._id = tagDao.convertID(x._id);
            setTag(x).fin(function (cont, err, tag) {
                if (tag) {
                    tag._id = tagDao.convertID(tag._id);
                    delete tag.articlesList;
                    delete tag.usersList;
                    result[tag._id] = tag;
                }
                cont();
            });
    }).then(function (cont) {
        res.sendjson(resJson(null, result));
    }).fail(res.throwError);
}

function delTag(req, res) {
    var ID;
    getTagID(req).then(function (cont, tag) {
        if (req.session.role !== 5) {
            cont(jsGen.Err(msg.USER.userRoleErr));
        } else {
            ID = tag._id;
            tagDao.delTag(ID, cont);
        }
    }).then(function (cont) {
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