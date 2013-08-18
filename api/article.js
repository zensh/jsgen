'use strict';
/*global require, module, Buffer, jsGen, setImmediate*/

var commentTpl = jsGen.lib.json.Comment,
    listArticleTpl = jsGen.lib.json.ListArticle,
    jsGenConfig = jsGen.config,
    jsGenCache = jsGen.cache,
    userCache = jsGenCache.user,
    listCache = jsGenCache.list,
    articleCache = jsGenCache.article,
    commentCache = jsGenCache.comment,
    then = jsGen.module.then,
    msg = jsGen.lib.msg,
    each = jsGen.lib.tools.each,
    removeItem = jsGen.lib.tools.remove,
    toArray = jsGen.lib.tools.toArray,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    checkID = jsGen.lib.tools.checkID,
    checkUrl = jsGen.lib.tools.checkUrl,
    MD5 = jsGen.lib.tools.MD5,
    filterTitle = jsGen.lib.tools.filterTitle,
    filterSummary = jsGen.lib.tools.filterSummary,
    filterContent = jsGen.lib.tools.filterContent,
    paginationList = jsGen.lib.tools.paginationList,
    checkTimeInterval = jsGen.lib.tools.checkTimeInterval,
    resJson = jsGen.lib.tools.resJson,
    callbackFn = jsGen.lib.tools.callbackFn,
    throwError = jsGen.lib.tools.throwError,
    errorHandler = jsGen.lib.tools.errorHandler,
    articleDao = jsGen.dao.article,
    convertArticleID = articleDao.convertID,
    getArticleDao = articleDao.getArticle,
    convertUserID = jsGen.dao.user.convertID,
    tagAPI = jsGen.api.tag,
    userAPI = jsGen.api.user;

articleCache.getP = function (ID, convert) {
    var that = this,
        isCache = false,
        doc = this.get(ID);

    convert = convert === undefined ? true : convert;
    return then(function (defer) {
        if (doc) {
            isCache = true;
            defer(null, doc);
        } else {
            getArticleDao(ID, defer);
        }
    }).then(function (defer, doc) {
        if (!isCache) {
            that.put(ID, doc);
        }
        if (convert) {
            doc.visitors += 1;
            calcuHots(doc);
            union(doc, cache[ID]);
            that.put(ID, doc);
            listCache.update(ID, function (value) {
                value.visitors += 1;
                return value;
            });
            articleDao.setArticle({
                _id: ID,
                visitors: doc.visitors,
                hots: cache[ID].hots
            });
            doc._id = convertArticleID(doc._id);
            doc.tagsList = tagAPI.convertTags(doc.tagsList);
            userAPI.convertUsers(doc.author).then(function (defer2, userList) {
                doc.author = userList[0];
                userAPI.convertUsers(doc.favorsList).all(defer2);
            }, errorHandler).then(function (defer2, userList) {
                doc.favorsList = userList;
                userAPI.convertUsers(doc.opposesList).all(defer2);
            }, errorHandler).then(function (defer2, userList) {
                doc.opposesList = userList;
                userAPI.convertUsers(doc.markList).all(defer2);
            }, errorHandler).then(function (defer2, userList) {
                doc.markList = userList;
                doc.refer = convertRefer(doc.refer);
                doc.comments = doc.commentsList.length;
                defer(null, doc);
            }, errorHandler);
        } else {
            defer(null, doc);
        }
    }, errorHandler);
};

commentCache.getP = function (ID, convert) {
    var that = this,
        isCache = false,
        doc = this.get(ID);

    convert = convert === undefined ? true : convert;
    return then(function (defer) {
        if (doc) {
            isCache = true;
            defer(null, doc);
        } else {
            getArticleDao(ID, defer);
        }
    }).then(function (defer, doc) {
        if (!isCache) {
            doc = intersect(union(commentTpl), doc);
            that.put(ID, doc);
        }
        if (convert) {
            calcuHots(doc);
            union(doc, cache[ID]);
            that.put(ID, doc);
            articleDao.setArticle({
                _id: ID,
                hots: cache[ID].hots
            });
            doc._id = convertArticleID(doc._id);
            userAPI.convertUsers(doc.author).then(function (defer2, userList) {
                doc.author = userList[0];
                userAPI.convertUsers(doc.favorsList).all(defer2);
            }, errorHandler).then(function (defer2, userList) {
                doc.favorsList = userList;
                userAPI.convertUsers(doc.opposesList).all(defer2);
            }, errorHandler).then(function (defer2, userList) {
                doc.opposesList = userList;
                userAPI.convertUsers(doc.markList).all(defer2);
            }, errorHandler).then(function (defer2, userList) {
                doc.markList = userList;
                doc.refer = convertRefer(doc.refer);
                doc.comments = doc.commentsList.length;
                doc.commentsList = convertArticlesID(doc.commentsList);
                defer(null, doc);
            }, errorHandler);
        } else {
            defer(null, doc);
        }
    }, errorHandler);
};

listCache.getP = function (ID, convert) {
    var that = this,
        isCache = false,
        doc = this.get(ID);

    convert = convert === undefined ? true : convert;
    return then(function (defer) {
        if (doc) {
            isCache = true;
            defer(null, doc);
        } else {
            getArticleDao(ID, defer);
        }
    }).then(function (defer, doc) {
        if (!isCache) {
            doc.content = filterSummary(doc.content);
            doc.comments = doc.commentsList.length;
            doc = intersect(union(listArticleTpl), doc);
            that.put(ID, doc);
        }
        if (convert) {
            union(doc, cache[ID]);
            doc._id = convertArticleID(doc._id);
            doc.tagsList = tagAPI.convertTags(doc.tagsList);
            userAPI.convertUsers(doc.author).then(function (defer2, userList) {
                doc.author = userList[0];
                doc.refer = convertRefer(doc.refer);
                defer(null, doc);
            }, errorHandler);
        } else {
            defer(null, doc);
        }
    }, errorHandler);
};

function convertArticlesID(IDArray) {
    var result = [];
    IDArray = toArray(IDArray);
    each(IDArray, function (x) {
        result.push(convertArticleID(x));
    });
    return result;
}

function convertArticles(IDArray, callback, mode) {
    var result = [],
        dataCache = mode === 'comment' ? commentCache : listCache;

    callback = callback || callbackFn;
    IDArray = toArray(IDArray);
    then.each(IDArray, function (next, id) {
        if (id) {
            dataCache.getP(id).all(function (defer, err, doc) {
                if (err) {
                    return callback(err, null);
                }
                if (doc) {
                    result.push(doc);
                }
                return next ? next() : callback(null, result);
            });
        } else {
            return next ? next() : callback(null, result);
        }
    });
}

function convertRefer(refer) {
    if (checkID(refer, 'A') && cache[convertArticleID(refer)]) {
        return {
            _id: refer,
            url: '/' + refer
        };
    } else {
        return {
            _id: null,
            url: refer
        };
    }
}

function calcuHots(doc) {
    var hots = jsGenConfig.ArticleHots;
    doc.hots = hots[0] * (doc.visitors ? doc.visitors : 0);
    doc.hots += hots[1] * (doc.favorsList ? doc.favorsList.length : 0);
    doc.hots -= hots[1] * (doc.opposesList ? doc.opposesList.length : 0);
    doc.hots += hots[2] * (doc.commentsList ? doc.commentsList.length : 0);
    doc.hots += hots[3] * (doc.markList ? doc.markList.length : 0);
    doc.hots += hots[4] * (doc.status === 2 ? 1 : 0);
    doc.hots = Math.round(doc.hots);
    cache._update(doc);
}

function checkStatus(article) {
    var status = jsGenConfig.ArticleStatus,
        len = article.commentsList.length;
    if (status[0] > 0 && article.status === -1 && len >= status[0]) {
        article.status = 0;
        return true;
    }
    if (status[1] > 0 && article.status === 0 && len >= status[1]) {
        article.status = 1;
        return true;
    }
    return false;
}

function filterArticle(articleObj, callback) {
    var newObj = {
        display: 0,
        refer: '',
        title: '',
        cover: '',
        content: '',
        tagsList: [''],
        comment: true
    };
    callback = callback || callbackFn;
    intersect(newObj, articleObj);
    if (!(newObj.title = filterTitle(newObj.title))) {
        return callback(jsGen.Err(msg.titleMinErr), null);
    }
    if (!(newObj.content = filterContent(newObj.content))) {
        return callback(jsGen.Err(msg.articleMinErr), null);
    }
    if (newObj.cover && !checkUrl(newObj.cover)) {
        delete newObj.cover;
    }
    if (newObj.refer && !checkUrl(newObj.refer) && !checkID(newObj.refer, 'A')) {
        delete newObj.refer;
    }
    if (newObj.tagsList && newObj.tagsList.length > 0) {
        tagAPI.filterTags(newObj.tagsList.slice(0, jsGenConfig.ArticleTagsMax)).all(function (defer, err, tagsList) {
            if (err) {
                return callback(err, null);
            }
            if (tagsList) {
                newObj.tagsList = tagsList;
            }
            if (!articleObj._id) {
                return callback(null, newObj);
            }
            articleCache.getP(articleObj._id, false).all(function (defer, err, doc) {
                var tagList = {}, setTagList = [];
                if (err) {
                    return callback(err, null);
                }
                if (doc) {
                    each(doc.tagsList, function (x) {
                        tagList[x] = -articleObj._id;
                    });
                }
                each(newObj.tagsList, function (x) {
                    if (tagList[x]) {
                        delete tagList[x];
                    } else {
                        tagList[x] = articleObj._id;
                    }
                });
                each(tagList, function (x) {
                    setTagList.push({
                        _id: +x,
                        articlesList: tagList[x]
                    });
                });
                each(setTagList, function (x) {
                    tagAPI.setTag(x);
                });
                return callback(null, newObj);
            });
        });
    } else {
        return callback(null, newObj);
    }
}

function getArticle(req, res, dm) {
    var ID = req.path[2],
        p = req.getparam.p || req.getparam.pageIndex || 1;

    if (checkID(ID, 'A')) {
        ID = convertArticleID(ID);
    }
    if (typeof ID !== 'number' || !cache[ID]) {
        throw jsGen.Err(msg.articleNone);
    }
    if (cache[ID].display > 0 && !req.session.Uid) {
        throw jsGen.Err(msg.userNeedLogin);
    }
    if (cache[ID].display > 2 && req.session.role < 4) {
        throw jsGen.Err(msg.articleDisplay2);
    }
    articleCache.getP(ID, dm.intercept(function (article) {
        var authorUid = convertUserID(article.author._id);
        if (req.session.Uid !== authorUid && cache[ID].display === 1) {
            userCache.getP(authorUid, dm.intercept(function (user) {
                if (user.fansList.indexOf(req.session.Uid) < 0) {
                    throw jsGen.Err(msg.articleDisplay1);
                } else {
                    get();
                }
            }), false);
        } else {
            get();
        }

        function get() {
            var list = null,
                commentPagination = req.session.commentPagination;
            if (req.path[3] === 'comment') {
                if (!commentPagination) {
                    return res.sendjson(resJson());
                }
                list = jsGenCache.pagination.get(commentPagination.key);
                if (!list || (p === 1 && commentPagination.key !== article._id + article.updateTime)) {
                    commentPagination.key = article._id + article.updateTime;
                    list = article.commentsList.reverse();
                    jsGenCache.pagination.put(commentPagination.key, list);
                }
                paginationList(req, list, commentCache, dm.intercept(function (data, pagination) {
                    union(commentPagination, pagination);
                    return res.sendjson(resJson(null, data, pagination));
                }));
            } else {
                list = article.commentsList.reverse();
                paginationList(req, list, commentCache, dm.intercept(function (data, pagination) {
                    article.commentsList = data;
                    commentPagination = pagination;
                    commentPagination.key = article._id + article.updateTime;
                    jsGenCache.pagination.put(commentPagination.key, list);
                    return res.sendjson(resJson(null, article, pagination));
                }));
            }
        }
    }));
}

function getComments(req, res, dm) {
    var result = [],
        IDArray = req.apibody.data;

    IDArray = toArray(IDArray);
    each(IDArray, function (x, i, list) {
        if (checkID(x, 'A')) {
            list[i] = convertArticleID(x);
        } else {
            IDArray[i] = null;
        }
    });
    then.each(IDArray, function (next, id) {
        if (id && cache[id] && cache[id].status > -1 && cache[id].display > 0) {
            commentCache.getP(id, function (err, doc) {
                if (err) {
                    return res.sendjson(resJson(err, null));
                }
                if (doc) {
                    result.push(doc);
                }
                return next ? next() : res.sendjson(resJson(null, result));
            });
        } else {
            return next ? next() : res.sendjson(resJson(null, result));
        }
    });
}

function getLatest(req, res, dm) {
    var list,
        p = +req.getparam.p || +req.getparam.pageIndex || 1,
        s = +req.path[3],
        session = req.session;

    if (req.path[2] === 'latest' && s > 0) {
        s = s > 20 ? 20 : s;
        req.getparam = req.getparam || {};
        req.getparam.p = 1;
        req.getparam.s = s;
        list = cache._index.slice(-s).reverse();
    } else {
        s = 0;
        session.listPagination = session.listPagination || {
            key: cache._initTime
        };
        list = jsGenCache.pagination.get(session.listPagination.key);
        if (!list || (p === 1 && session.listPagination.key !== cache._initTime)) {
            session.listPagination.key = cache._initTime;
            list = cache._index.slice(0).reverse();
            jsGenCache.pagination.put(session.listPagination.key, list);
        }
    }
    paginationList(req, list, listCache, dm.intercept(function (data, pagination) {
        union(session.listPagination, pagination);
        return res.sendjson(resJson(null, data, pagination));
    }));
}

function getUpdate(req, res, dm) {
    var list,
        p = +req.getparam.p || +req.getparam.pageIndex || 1,
        s = +req.path[3],
        key = MD5(JSON.stringify(jsGenCache.updateList), 'base64'),
        session = req.session;

    if (s > 0) {
        s = s > 20 ? 20 : s;
        req.getparam = req.getparam || {};
        req.getparam.p = 1;
        req.getparam.s = s;
        list = jsGenCache.updateList.slice(0, s);
    } else {
        s = 0;
        session.listPagination = session.listPagination || {
            key: key
        };
        list = jsGenCache.pagination.get(session.listPagination.key);
        if (!list || (p === 1 && session.listPagination.key !== key)) {
            session.listPagination.key = key;
            list = jsGenCache.updateList.slice(0);
            jsGenCache.pagination.put(session.listPagination.key, list);
        }
    }
    paginationList(req, list, listCache, dm.intercept(function (data, pagination) {
        union(session.listPagination, pagination);
        return res.sendjson(resJson(null, data, pagination));
    }));
}

function getHots(req, res, dm) {
    var list,
        p = +req.getparam.p || +req.getparam.pageIndex || 1,
        s = +req.path[3],
        key = MD5(JSON.stringify(jsGenCache.hotsList), 'base64'),
        session = req.session;

    if (s > 0) {
        s = s > 20 ? 20 : s;
        req.getparam = req.getparam || {};
        req.getparam.p = 1;
        req.getparam.s = s;
        list = jsGenCache.hotsList.slice(0, s);
    } else {
        s = 0;
        s = 0;
        session.listPagination = session.listPagination || {
            key: key
        };
        list = jsGenCache.pagination.get(session.listPagination.key);
        if (!list || (p === 1 && session.listPagination.key !== key)) {
            session.listPagination.key = key;
            list = jsGenCache.hotsList.slice(0);
            jsGenCache.pagination.put(session.listPagination.key, list);
        }
    }
    paginationList(req, list, listCache, dm.intercept(function (data, pagination) {
        union(session.listPagination, pagination);
        return res.sendjson(resJson(null, data, pagination));
    }));
}

function getHotComments(req, res, dm) {
    var list, s = +req.path[3] || 5;

    s = s > 3 ? s : 3;
    s = s > 50 ? 50 : s;
    list = jsGenCache.hotCommentsList.slice(0, s);
    convertArticles(list, dm.intercept(function (doc) {
        return res.sendjson(resJson(null, doc));
    }));
}

function addArticle(req, res, dm) {
    if (!req.session.Uid) {
        throw jsGen.Err(msg.userNeedLogin);
    }
    if (req.session.role < 2) {
        throw jsGen.Err(msg.userRoleErr);
    }
    if (checkTimeInterval(req, 'Ad')) {
        throw jsGen.Err(msg.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]');
    }
    filterArticle(req.apibody, dm.intercept(function (article) {
        article.date = Date.now();
        article.updateTime = article.date;
        if (article.display !== 1) {
            article.display = 0;
        }
        article.status = 0;
        article.author = req.session.Uid;
        delete article._id;
        articleDao.setNewArticle(article, dm.intercept(function (doc) {
            if (doc) {
                jsGen.dao.user.setArticle({
                    _id: article.author,
                    articlesList: doc._id
                });
                each(doc.tagsList, function (x) {
                    jsGen.dao.tag.setTag({
                        _id: x,
                        articlesList: doc._id
                    });
                });
                cache._update(doc);
                articleCache.put(doc._id, doc);
                jsGenConfig.articles += 1;
            }
            checkTimeInterval(req, 'Ad', true);
            articleCache.getP(doc._id, dm.intercept(function (doc) {
                return res.sendjson(resJson(null, doc));
            }));
        }));
    }));
}

function setArticle(req, res, dm) {
    var ID = req.path[2],
        date = Date.now();

    if (!req.session.Uid) {
        throw jsGen.Err(msg.userNeedLogin);
    }
    if (checkID(ID, 'A')) {
        ID = convertArticleID(ID);
    }
    if (typeof ID !== 'number' || !cache[ID] || cache[ID].display >= 2) {
        throw jsGen.Err(msg.articleNone);
    }
    if (req.path[3] === 'comment') {
        if (req.session.role < 1) {
            throw jsGen.Err(msg.userRoleErr);
        }
        if (checkTimeInterval(req, 'Ad')) {
            throw jsGen.Err(msg.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]');
        }
        filterArticle(req.apibody, dm.intercept(function (comment) {
            var referID;
            if (checkID(comment.refer, 'A')) {
                referID = convertArticleID(comment.refer);
            }
            if (!referID || !cache[referID]) {
                comment.refer = req.path[2];
            }
            if (comment.refer === req.path[2]) {
                referID = undefined;
            }
            comment.date = date;
            comment.updateTime = date;
            comment.display = 0;
            comment.status = -1;
            comment.author = req.session.Uid;
            delete comment._id;
            articleDao.setNewArticle(comment, dm.intercept(function (doc) {
                if (doc) {
                    articleDao.setComment({
                        _id: ID,
                        commentsList: doc._id
                    });
                    articleDao.setArticle({
                        _id: ID,
                        updateTime: date
                    });
                    if (referID) {
                        articleDao.setComment({
                            _id: referID,
                            commentsList: doc._id
                        });
                        articleDao.setArticle({
                            _id: referID,
                            updateTime: date
                        });
                    }
                    jsGen.dao.user.setArticle({
                        _id: req.session.Uid,
                        articlesList: doc._id
                    });
                    cache._update(doc);
                    commentCache.put(doc._id, doc);
                    jsGenConfig.comments += 1;
                    listCache.update(ID, function (value) {
                        value.comments += 1;
                        return value;
                    });
                    articleCache.getP(ID, function (err, value) {
                        if (!value) {
                            return;
                        }
                        value.commentsList.push(doc._id);
                        value.updateTime = date;
                        if (checkStatus(value)) {
                            articleDao.setArticle({
                                _id: ID,
                                status: value.status
                            });
                        }
                        cache._update(value);
                        articleCache.put(value._id, value);
                    }, false);
                    if (referID) {
                        commentCache.getP(referID, function (err, value) {
                            if (!value) {
                                return;
                            }
                            value.commentsList.push(doc._id);
                            value.updateTime = date;
                            if (checkStatus(value)) {
                                articleDao.setArticle({
                                    _id: referID,
                                    status: value.status
                                });
                            }
                            cache._update(value);
                            commentCache.put(value._id, value);
                        }, false);
                    }
                }
                checkTimeInterval(req, 'Ad', true);
                commentCache.getP(doc._id, dm.intercept(function (doc) {
                    return res.sendjson(resJson(null, doc));
                }));
            }));
        }));
    } else if (req.path[3] === 'edit') {
        if (checkTimeInterval(req, 'Ed')) {
            throw jsGen.Err(msg.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]');
        }
        articleCache.getP(ID, dm.intercept(function (article) {
            if (req.session.Uid !== article.author && req.session.role < 4) {
                throw jsGen.Err(msg.userRoleErr);
            }
            filterArticle(req.apibody, dm.intercept(function (article) {
                article._id = ID;
                article.updateTime = date;
                articleDao.setArticle(article, dm.intercept(function (doc) {
                    if (doc) {
                        cache._update(doc);
                        articleCache.put(doc._id, doc);
                        var doc2 = intersect(union(listArticleTpl), doc);
                        doc2.content = filterSummary(doc2.content);
                        doc2.comments = doc.commentsList.length;
                        listCache.put(doc._id, doc2);
                    }
                    checkTimeInterval(req, 'Ed', true);
                    articleCache.getP(doc._id, dm.intercept(function (doc) {
                        return res.sendjson(resJson(null, doc));
                    }));
                }));
            }));
        }), false);
    } else if (req.path[3] === 'mark') {
        if (checkTimeInterval(req, 'Ma')) {
            throw jsGen.Err(msg.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]');
        }
        var mark = !! req.apibody.mark;
        articleCache.getP(ID, dm.intercept(function (doc) {
            var index = doc.markList.indexOf(req.session.Uid);
            if (mark && index >= 0) {
                throw jsGen.Err(msg.userMarked);
            } else if (!mark && index < 0) {
                throw jsGen.Err(msg.userUnmarked);
            }
            articleDao.setMark({
                _id: ID,
                markList: mark ? req.session.Uid : -req.session.Uid
            });
            jsGen.dao.user.setMark({
                _id: req.session.Uid,
                markList: mark ? ID : -ID
            });
            if (mark) {
                doc.markList.push(req.session.Uid);
            } else if (index >= 0) {
                doc.markList.splice(index, 1);
            }
            calcuHots(doc);
            articleCache.put(ID, doc);
            listCache.update(ID, function (value) {
                value.markList = doc.markList;
                return value;
            });
            commentCache.update(ID, function (value) {
                value.markList = doc.markList;
                return value;
            });
            userCache.update(req.session.Uid, function (value) {
                var i = value.markList.indexOf(ID);
                if (mark) {
                    value.markList.push(ID);
                } else if (i >= 0) {
                    value.markList.splice(i, 1);
                }
                return value;
            });
            checkTimeInterval(req, 'Ma', true);
            return res.sendjson(resJson());
        }), false);
    } else if (req.path[3] === 'favor') {
        if (checkTimeInterval(req, 'Fa')) {
            throw jsGen.Err(msg.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]');
        }
        var favor = !! req.apibody.favor;
        articleCache.getP(ID, dm.intercept(function (doc) {
            var index = doc.favorsList.indexOf(req.session.Uid);
            if (favor && index >= 0) {
                throw jsGen.Err(msg.userFavor);
            } else if (!favor && index < 0) {
                throw jsGen.Err(msg.userUnfavor);
            }
            articleDao.setFavor({
                _id: ID,
                favorsList: favor ? req.session.Uid : -req.session.Uid
            });
            if (favor) {
                var index2 = doc.opposesList.indexOf(req.session.Uid);
                if (index2 >= 0) {
                    doc.opposesList.splice(index2, 1);
                    articleDao.setOppose({
                        _id: ID,
                        opposesList: -req.session.Uid
                    });
                }
                doc.favorsList.push(req.session.Uid);
            } else if (index >= 0) {
                doc.favorsList.splice(index, 1);
            }
            calcuHots(doc);
            articleCache.put(ID, doc);
            listCache.update(ID, function (value) {
                value.favorsList = doc.favorsList;
                return value;
            });
            commentCache.update(ID, function (value) {
                value.favorsList = doc.favorsList;
                return value;
            });
            checkTimeInterval(req, 'Fa', true);
            return res.sendjson(resJson());
        }), false);
    } else if (req.path[3] === 'oppose') {
        if (checkTimeInterval(req, 'Op')) {
            throw jsGen.Err(msg.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]');
        }
        var oppose = !! req.apibody.oppose;
        articleCache.getP(ID, dm.intercept(function (doc) {
            var index = doc.opposesList.indexOf(req.session.Uid);
            if (oppose && index >= 0) {
                throw jsGen.Err(msg.userOppose);
            } else if (!oppose && index < 0) {
                throw jsGen.Err(msg.userUnoppose);
            }
            articleDao.setOppose({
                _id: ID,
                opposesList: oppose ? req.session.Uid : -req.session.Uid
            });
            if (oppose) {
                var index2 = doc.favorsList.indexOf(req.session.Uid);
                if (index2 >= 0) {
                    doc.favorsList.splice(index2, 1);
                    articleDao.setFavor({
                        _id: ID,
                        favorsList: -req.session.Uid
                    });
                }
                doc.opposesList.push(req.session.Uid);
            } else if (index >= 0) {
                doc.opposesList.splice(index, 1);
            }
            calcuHots(doc);
            articleCache.put(ID, doc);
            listCache.update(ID, function (value) {
                value.opposesList = doc.opposesList;
                return value;
            });
            commentCache.update(ID, function (value) {
                value.opposesList = doc.opposesList;
                return value;
            });
            checkTimeInterval(req, 'Op', true);
            return res.sendjson(resJson());
        }), false);
    } else {
        throw jsGen.Err(msg.requestDataErr);
    }
}

function robot(req, res, dm) {
    var obj = {}, ID = req.path[0];
    obj.global = union(jsGenConfig);
    obj.articlesList = cache._index.slice(-200).reverse();
    if (checkID(ID, 'A')) {
        ID = convertArticleID(ID);
    }
    if (typeof ID !== 'number' || !cache[ID] || cache[ID].display > 0) {
        var keywords, list = obj.articlesList.slice(0, 50);
        keywords = tagAPI.convertTags(tagAPI.cache._index.slice(0, 20)).map(function (tag) {
            return tag.tag;
        });
        keywords = keywords.concat(obj.global.keywords.split(/[,，\s]/));
        keywords = jsGen.lib.tools.uniqueArray(keywords);
        obj.global.keywords = keywords.join();
        obj.global.title2 = obj.global.description;
        convertArticles(list, dm.intercept(function (doc) {
            obj.articlesList = convertArticleID(obj.articlesList);
            each(doc, function (article, i) {
                doc[i].content = jsGen.module.marked(article.content);
                doc[i].date = new Date(article.date).toString();
            });
            obj.data = doc;
            return res.render('/robot-index.ejs', obj);
        }));
    } else {
        articleCache.getP(ID, dm.intercept(function (doc) {
            doc.content = jsGen.module.marked(doc.content);
            obj.global.title2 = doc.title;
            obj.global.keywords = doc.tagsList.map(function (tag) {
                return tag.tag;
            }).join();
            obj.articlesList = convertArticleID(obj.articlesList);
            convertArticles(doc.commentsList, dm.intercept(function (commentsList) {
                each(commentsList, function (comment, i) {
                    commentsList[i].content = jsGen.module.marked(comment.content);
                });
                doc.commentsList = commentsList;
                obj.article = doc;
                return res.render('/robot-article.ejs', obj);
            }), 'comment');
        }));
    }
}

function deleteArticle(req, res, dm) {
    var ID = req.path[2];
    if (!req.session.Uid) throw jsGen.Err(msg.userNeedLogin);
    if (checkID(ID, 'A')) {
        ID = convertArticleID(ID);
    }
    if (typeof ID !== 'number' || !cache[ID] || cache[ID].display === 2) {
        throw jsGen.Err(msg.articleNone);
    }
    listCache.getP(ID, dm.intercept(function (article) {
        if (req.session.Uid !== article.author && req.session.role < 4) {
            throw jsGen.Err(msg.userRoleErr);
        }
        var setObj = {
            _id: ID,
            display: 3,
            updateTime: Date.now()
        };
        cache._update(setObj);
        articleDao.setArticle(setObj);
        if (checkID(article.refer, 'A')) {
            var referID = convertArticleID(article.refer);
            articleDao.setComment({
                _id: referID,
                commentsList: -article._id
            });
        }
        userCache.update(article.author, function (user) {
            removeItem(user.articlesList, ID);
            return user;
        });
        jsGen.dao.user.setArticle({
            _id: article.author,
            articlesList: -ID
        });
        return res.sendjson(resJson());
    }), false);
}

function getFn(req, res, dm) {
    switch (req.path[2]) {
    case undefined:
    case 'index':
    case 'latest':
        return getLatest(req, res, dm);
    case 'hots':
        return getHots(req, res, dm);
    case 'update':
        return getUpdate(req, res, dm);
    case 'comment':
        return getHotComments(req, res, dm);
    default:
        return getArticle(req, res, dm);
    }
}

function postFn(req, res, dm) {
    switch (req.path[2]) {
    case undefined:
    case 'index':
        return addArticle(req, res, dm);
    case 'comment':
        return getComments(req, res, dm);
    default:
        return setArticle(req, res, dm);
    }
}

function deleteFn(req, res, dm) {
    return deleteArticle(req, res, dm);
}

module.exports = {
    GET: getFn,
    POST: postFn,
    DELETE: deleteFn,
    convertArticles: convertArticles,
    cache: cache,
    robot: robot
};