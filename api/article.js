'use strict';
/*global require, module, Buffer, jsGen, setImmediate*/

var msg = jsGen.lib.msg,
    then = jsGen.module.then,
    commentTpl = jsGen.lib.json.Comment,
    listArticleTpl = jsGen.lib.json.ListArticle,
    configPublicTpl = jsGen.lib.json.ConfigPublicTpl,
    MD5 = jsGen.lib.tools.MD5,
    each = jsGen.lib.tools.each,
    union = jsGen.lib.tools.union,
    resJson = jsGen.lib.tools.resJson,
    toArray = jsGen.lib.tools.toArray,
    checkID = jsGen.lib.tools.checkID,
    checkUrl = jsGen.lib.tools.checkUrl,
    removeItem = jsGen.lib.tools.remove,
    intersect = jsGen.lib.tools.intersect,
    digestArray = jsGen.lib.tools.digestArray,
    filterTitle = jsGen.lib.tools.filterTitle,
    errorHandler = jsGen.lib.tools.errorHandler,
    filterSummary = jsGen.lib.tools.filterSummary,
    filterContent = jsGen.lib.tools.filterContent,
    paginationList = jsGen.lib.tools.paginationList,
    checkTimeInterval = jsGen.lib.tools.checkTimeInterval,
    jsGenCache = jsGen.cache,
    jsGenConfig = jsGen.config,
    tagAPI = jsGen.api.tag,
    redis = jsGen.lib.redis,
    userAPI = jsGen.api.user,
    cache = redis.articleCache,
    userCache = jsGen.cache.user,
    listCache = jsGen.cache.list,
    articleDao = jsGen.dao.article,
    articleCache = jsGen.cache.article,
    commentCache = jsGen.cache.comment,
    convertArticleID = articleDao.convertID,
    paginationCache = jsGen.cache.pagination;

articleCache.getP = function (ID, convert) {
    var that = this,
        inCache = false;

    return then(function (defer) {
        if (ID >= 0) {
            var article = that.get(ID);
            if (article) {
                inCache = true;
                defer(null, article);
            } else {
                articleDao.getArticle(ID, defer);
            }
        } else {
            defer(jsGen.Err(msg.ARTICLE.articleNone));
        }
    }).then(function (defer, article) {
        if (!inCache) {
            that.put(ID, article);
        }
        if (convert !== false) {
            article.visitors += 1;
            calcuHots(article);
            that.put(ID, article);
            listCache.update(ID, function (value) {
                value.visitors = article.visitors;
                value.hots = article.hots;
                return value;
            });
            articleDao.setArticle({
                _id: ID,
                visitors: article.visitors,
                hots: article.hots
            });
            userAPI.convertUsers(article.author).then(function (defer2, userList) {
                article.author = userList[0];
                userAPI.convertUsers(article.favorsList).all(defer2);
            }).then(function (defer2, userList) {
                article.favorsList = userList;
                userAPI.convertUsers(article.opposesList).all(defer2);
            }).then(function (defer2, userList) {
                article.opposesList = userList;
                userAPI.convertUsers(article.markList).all(defer2);
            }).then(function (defer2, userList) {
                article.markList = userList;
                tagAPI.convertTags(article.tagsList).all(defer2);
            }).then(function (defer2, tagsList) {
                article.tagsList = tagsList;
                convertRefer(article.refer).all(defer2);
            }).then(function (defer2, refer) {
                article.refer = refer;
                article.comments = article.commentsList.length;
                article._id = convertArticleID(article._id);
                defer(null, article);
            }).fail(defer);
        } else {
            defer(null, article);
        }
    }).fail(errorHandler);
};

commentCache.getP = function (ID, convert) {
    var that = this,
        inCache = false;

    return then(function (defer) {
        cache(ID, defer);
    }).then(function (defer, article) {
        if (article.display === 0) {
            article = that.get(ID);
            if (article) {
                inCache = true;
                defer(null, article);
            } else {
                articleDao.getArticle(ID, defer);
            }
        } else {
            defer(jsGen.Err(msg.ARTICLE.articleNone));
        }
    }).then(function (defer, article) {
        if (!inCache) {
            article = intersect(union(commentTpl), article);
            that.put(ID, article);
        }
        if (convert !== false) {
            calcuHots(article);
            that.put(ID, article);
            articleDao.setArticle({
                _id: ID,
                hots: article.hots
            });
            userAPI.convertUsers(article.author).then(function (defer2, userList) {
                article.author = userList[0];
                userAPI.convertUsers(article.favorsList).all(defer2);
            }).then(function (defer2, userList) {
                article.favorsList = userList;
                userAPI.convertUsers(article.opposesList).all(defer2);
            }).then(function (defer2, userList) {
                article.opposesList = userList;
                userAPI.convertUsers(article.markList).all(defer2);
            }).then(function (defer2, userList) {
                article.markList = userList;
                convertRefer(article.refer).all(defer2);
            }).then(function (defer2, refer) {
                article.refer = refer;
                article.comments = article.commentsList.length;
                article.commentsList = convertArticlesID(article.commentsList);
                article._id = convertArticleID(article._id);
                defer(null, article);
            }).fail(defer);
        } else {
            defer(null, article);
        }
    }).fail(errorHandler);
};

listCache.getP = function (ID, convert) {
    var that = this,
        inCache = false;

    return then(function (defer) {
        if (ID >= 0) {
            var article = that.get(ID);
            if (article) {
                inCache = true;
                defer(null, article);
            } else {
                articleDao.getArticle(ID, defer);
            }
        } else {
            defer(jsGen.Err(msg.ARTICLE.articleNone));
        }
    }).then(function (defer, article) {
        if (!inCache) {
            article.content = filterSummary(article.content);
            article.comments = article.commentsList.length;
            article = intersect(union(listArticleTpl), article);
            that.put(ID, article);
        }
        if (convert !== false) {
            userAPI.convertUsers(article.author).then(function (defer2, userList) {
                article.author = userList[0];
                tagAPI.convertTags(article.tagsList, ID).all(defer2);
            }).then(function (defer2, tagsList) {
                article.tagsList = tagsList;
                convertRefer(article.refer).all(defer2);
            }).then(function (defer2, refer) {
                article.refer = refer;
                article._id = convertArticleID(article._id);
                defer(null, article);
            }).fail(defer);
        } else {
            defer(null, article);
        }
    }).fail(errorHandler);
};

function convertArticlesID(IDArray) {
    var result = [];
    IDArray = toArray(IDArray);
    each(IDArray, function (x) {
        result.push(convertArticleID(x));
    });
    return result;
}

function convertArticles(IDArray, mode) {
    var dataCache = mode === 'comment' ? commentCache : listCache;

    return then.each(toArray(IDArray), function (defer, ID) {
        dataCache.getP(ID).all(function (defer2, err, article) {
            defer(null, article || null);
        });
    }).then(function (defer, list) {
        defer(null, digestArray(list, null));
    });
}

function convertRefer(refer) {
    return then(function (defer) {
        if (checkID(refer, 'A')) {
            cache(convertArticleID(refer), defer);
        } else {
            defer(true);
        }
    }).then(function (defer, article) {
        defer(null, {
            _id: refer,
            url: '/' + refer
        });
    }, function (defer, err) {
        defer(null, {
            _id: null,
            url: refer
        });
    });
}

function calcuHots(article) {
    var hots = jsGenConfig.ArticleHots;
    article.hots = hots[0] * (article.visitors ? article.visitors : 0);
    article.hots += hots[1] * (article.favorsList ? article.favorsList.length : 0);
    article.hots -= hots[1] * (article.opposesList ? article.opposesList.length : 0);
    article.hots += hots[2] * (article.commentsList ? article.commentsList.length : 0);
    article.hots += hots[3] * (article.markList ? article.markList.length : 0);
    article.hots += hots[4] * (article.status === 2 ? 1 : 0);
    article.hots = Math.round(article.hots);
    return then(function (defer) {
        cache.update(article, defer);
    }).then(function (defer) {
        cache.clearup(defer);
    }).fail(errorHandler);
}

function checkStatus(article) {
    var status = jsGenConfig.ArticleStatus,
        len = article.commentsList.length;
    if (status[0] > 0 && article.status === -1 && len >= status[0]) {
        article.status = 0;
        return true;
    } else if (status[1] > 0 && article.status === 0 && len >= status[1]) {
        article.status = 1;
        return true;
    } else {
        return false;
    }
}

function filterArticle(articleObj) {
    return then(function (defer) {
        var newObj = {
            display: 0,
            refer: '',
            title: '',
            cover: '',
            content: '',
            tagsList: [''],
            comment: true
        };

        intersect(newObj, articleObj);
        if (!(newObj.title = filterTitle(newObj.title))) {
            return defer(jsGen.Err(msg.ARTICLE.titleMinErr));
        }
        if (!(newObj.content = filterContent(newObj.content))) {
            return defer(jsGen.Err(msg.ARTICLE.articleMinErr));
        }
        if (newObj.cover && !checkUrl(newObj.cover)) {
            delete newObj.cover;
        }
        if (newObj.refer && !checkUrl(newObj.refer) && !checkID(newObj.refer, 'A')) {
            delete newObj.refer;
        }
        if (newObj.tagsList && newObj.tagsList.length > 0) {
            tagAPI.filterTags(newObj.tagsList.slice(0, jsGenConfig.ArticleTagsMax)).then(function (defer2, tagsList) {
                if (tagsList) {
                    newObj.tagsList = tagsList;
                }
                if (!articleObj._id) {
                    defer(null, newObj);
                } else {
                    articleCache.getP(articleObj._id, false).all(defer2);
                }
            }).then(function (defer2, article) {
                var tagList = {}, setTagList = [];
                each(article.tagsList, function (x) {
                    tagList[x] = -articleObj._id;
                });
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
                defer(null, newObj);
            }).fail(defer);
        } else {
            defer(null, newObj);
        }
    });
}

function getArticleID(req) {
    return then(function (defer) {
        var ID = req.path[2];

        if (checkID(ID, 'A')) {
            ID = convertArticleID(ID);
        }
        cache(ID, defer);
    }).fail(function (defer) {
        defer(jsGen.Err(msg.ARTICLE.articleNone));
    });
}

function addComment(req, ID) {
    var referID, date = Date.now();
    return then(function (defer) {
        checkTimeInterval(req, 'AddComment').all(function (defer2, err, value) {
            if (value) {
                defer(jsGen.Err(msg.MAIN.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]'));
            } else {
                filterArticle(req.apibody).all(defer);
            }
        });
    }).then(function (defer, comment) {
        referID = checkID(comment.refer, 'A') && convertArticleID(comment.refer);
        cache(referID, function (err, article) {
            if (err) {
                comment.refer = req.path[2];
            }
            referID = comment.refer === req.path[2] ? null : referID;
            comment.date = date;
            comment.updateTime = date;
            comment.display = 0;
            comment.status = -1;
            comment.author = req.session.Uid;
            delete comment._id;
            articleDao.setNewArticle(comment, defer);
        });
    }).then(function (defer, comment) {
        articleDao.setComment({
            _id: ID,
            commentsList: comment._id
        });
        articleDao.setArticle({
            _id: ID,
            updateTime: date
        });
        jsGen.dao.user.setArticle({
            _id: req.session.Uid,
            articlesList: comment._id
        });
        cache.update(comment);
        commentCache.put(comment._id, comment);
        jsGenConfig.comments = 1;
        articleCache.getP(ID, false).then(function (defer2, article) {
            article.commentsList.push(comment._id);
            article.updateTime = date;
            if (checkStatus(article)) {
                articleDao.setArticle({
                    _id: ID,
                    status: article.status
                });
            }
            cache.update(article);
            articleCache.put(article._id, article);
            listCache.update(ID, function (value) {
                value.comments += 1;
                value.status = article.status;
                return value;
            });
        });
        if (referID) {
            articleDao.setComment({
                _id: referID,
                commentsList: comment._id
            });
            articleDao.setArticle({
                _id: referID,
                updateTime: date
            });
            commentCache.getP(referID, false).then(function (defer2, article) {
                article.commentsList.push(comment._id);
                article.updateTime = date;
                if (checkStatus(article)) {
                    articleDao.setArticle({
                        _id: referID,
                        status: article.status
                    });
                }
                cache.update(article);
                commentCache.put(article._id, article);
            });
        }
        checkTimeInterval(req, 'AddComment', true);
        commentCache.getP(comment._id).all(defer);
    }).fail(errorHandler);
}

function editArticle(req, ID) {
    return then(function (defer) {
        checkTimeInterval(req, 'EditArticle').all(function (defer2, err, value) {
            if (value) {
                defer(jsGen.Err(msg.MAIN.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]'));
            } else {
                articleCache.getP(ID, false).all(defer);
            }
        });
    }).then(function (defer, article) {
        if (req.session.Uid !== article.author && req.session.role < 4) {
            defer(jsGen.Err(msg.USER.userRoleErr));
        } else {
            filterArticle(req.apibody).all(defer);
        }
    }).then(function (defer, article) {
        article._id = ID;
        article.updateTime = Date.now();
        articleDao.setArticle(article, defer);
    }).then(function (defer, article) {
        cache.update(article);
        articleCache.put(article._id, article);
        listCache.remove(article._id);
        checkTimeInterval(req, 'EditArticle', true);
        articleCache.getP(article._id).all(defer);
    }).fail(errorHandler);
}

function setMark(req, ID) {
    var mark = !! req.apibody.mark;

    return then(function (defer) {
        checkTimeInterval(req, 'SetMark').all(function (defer2, err, value) {
            if (value) {
                defer(jsGen.Err(msg.MAIN.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]'));
            } else {
                articleCache.getP(ID, false).all(defer);
            }
        });
    }).then(function (defer, article) {
        var index = article.markList.indexOf(req.session.Uid);
        if (mark && index >= 0) {
            defer(jsGen.Err(msg.USER.userMarked));
        } else if (!mark && index < 0) {
            defer(jsGen.Err(msg.USER.userUnmarked));
        } else {
            articleDao.setMark({
                _id: ID,
                markList: mark ? req.session.Uid : -req.session.Uid
            });
            jsGen.dao.user.setMark({
                _id: req.session.Uid,
                markList: mark ? ID : -ID
            });
            if (mark) {
                article.markList.push(req.session.Uid);
            } else {
                removeItem(article.markList, req.session.Uid);
            }
            calcuHots(article);
            articleCache.put(ID, article);
            listCache.update(ID, function (value) {
                value.hots = article.hots;
                return value;
            });
            commentCache.remove(ID);
            userCache.update(req.session.Uid, function (value) {
                if (mark) {
                    value.markList.push(ID);
                } else {
                    removeItem(value.markList, ID);
                }
                return value;
            });
            checkTimeInterval(req, 'SetMark', true);
            defer(null, mark);
        }
    }).fail(errorHandler);
}

function setFavor(req, ID) {
    var favor = !! req.apibody.favor;

    return then(function (defer) {
        checkTimeInterval(req, 'SetFavor').all(function (defer2, err, value) {
            if (value) {
                defer(jsGen.Err(msg.MAIN.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]'));
            } else {
                articleCache.getP(ID, false).all(defer);
            }
        });
    }).then(function (defer, article) {
        var index = article.favorsList.indexOf(req.session.Uid);
        if (favor && index >= 0) {
            defer(jsGen.Err(msg.USER.userFavor));
        } else if (!favor && index < 0) {
            defer(jsGen.Err(msg.USER.userUnoppose));
        } else {
            articleDao.setFavor({
                _id: ID,
                favorsList: favor ? req.session.Uid : -req.session.Uid
            });
            if (favor) {
                if (removeItem(article.opposesList, req.session.Uid)) {
                    articleDao.setOppose({
                        _id: ID,
                        opposesList: -req.session.Uid
                    });
                }
                article.favorsList.push(req.session.Uid);
            } else {
                removeItem(article.favorsList, req.session.Uid);
            }
            calcuHots(article);
            articleCache.put(ID, article);
            listCache.update(ID, function (value) {
                value.hots = article.hots;
                return value;
            });
            commentCache.remove(ID);
            checkTimeInterval(req, 'SetFavor', true);
            defer(null, favor);
        }
    }).fail(errorHandler);
}

function setOppose(req, ID) {
    var oppose = !! req.apibody.oppose;

    return then(function (defer) {
        checkTimeInterval(req, 'SetOppose').all(function (defer2, err, value) {
            if (value) {
                defer(jsGen.Err(msg.MAIN.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]'));
            } else {
                articleCache.getP(ID, false).all(defer);
            }
        });
    }).then(function (defer, article) {
        var index = article.opposesList.indexOf(req.session.Uid);
        if (oppose && index >= 0) {
            defer(jsGen.Err(msg.USER.userOppose));
        } else if (!oppose && index < 0) {
            defer(jsGen.Err(msg.USER.userUnfavor));
        } else {
            articleDao.setOppose({
                _id: ID,
                opposesList: oppose ? req.session.Uid : -req.session.Uid
            });
            if (oppose) {
                if (removeItem(article.favorsList, req.session.Uid)) {
                    articleDao.setFavor({
                        _id: ID,
                        favorsList: -req.session.Uid
                    });
                }
                article.opposesList.push(req.session.Uid);
            } else {
                removeItem(article.opposesList, req.session.Uid);
            }
            calcuHots(article);
            articleCache.put(ID, article);
            listCache.update(ID, function (value) {
                value.hots = article.hots;
                return value;
            });
            commentCache.remove(ID);
            checkTimeInterval(req, 'SetOppose', true);
            defer(null, oppose);
        }
    }).fail(errorHandler);
}

function getArticle(req, res) {
    getArticleID(req).then(function (defer, article) {
        if (article.display > 0 && !req.session.Uid) {
            defer(jsGen.Err(msg.USER.userNeedLogin));
        } else if (article.display === 1 && (article.author !== req.session.Uid || req.session.role < 4)) {
            defer(jsGen.Err(msg.ARTICLE.articleDisplay1));
        } else if (article.display === 2 && req.session.role !== 5) {
            defer(jsGen.Err(msg.ARTICLE.articleDisplay2));
        } else {
            articleCache.getP(article._id).all(defer);
        }
    }).then(function (defer, article) {
        paginationList(req, article.commentsList.reverse(), commentCache, function (err, data, pagination) {
            defer(err, data, pagination, article);
        }, function (err, ID) {
            articleDao.setComment({
                _id: article._id,
                commentsList: -ID
            });
            articleCache.remove(article._id);
            listCache.remove(article._id);
        });
    }).then(function (defer, data, pagination, article) {
        if (req.path[3] === 'comment') {
            return res.sendjson(resJson(null, data, pagination));
        } else {
            article.commentsList = data;
            return res.sendjson(resJson(null, article, pagination));
        }
    }).fail(res.throwError);
}

function getComments(req, res) {
    then.each(toArray(req.apibody.data), function (defer, ID) {
        if (checkID(ID, 'A')) {
            cache(convertArticleID(ID), function (err, article) {
                defer(null, article && article.status === -1 && article.display === 0 ? article._id : null);
            });
        } else {
            defer(null, null);
        }
    }).then(function (defer, IDArray) {
        defer(null, digestArray(IDArray, null));
    }).each(null, function (defer, ID) {
        commentCache.getP(ID).all(function (defer2, err, article) {
            defer(null, article || null);
        });
    }).then(function (defer, comments) {
        digestArray(comments, null);
        res.sendjson(resJson(null, comments));
    }).fail(res.throwError);
}

function getList(req, res, type) {
    var list,
        p = +req.getparam.p || +req.getparam.pageIndex || 1;

    req.session.paginationKey = req.session.paginationKey || {};
    then(function (defer) {
        var list = paginationCache.get(req.session.paginationKey[type]);
        if (!list || p === 1) {
            then(function (defer2) {
                cache[type](0, -1, defer2);
            }).then(function (defer2, list) {
                req.session.paginationKey[type] = MD5(JSON.stringify(list.slice(0, 100)), 'base64');
                paginationCache.put(req.session.paginationKey[type], list);
                defer(null, list);
            }).fail(defer);
        } else {
            defer(null, list);
        }
    }).then(function (defer, list) {
        paginationList(req, list, listCache, defer);
    }).then(function (defer, data, pagination) {
        return res.sendjson(resJson(null, data, pagination));
    }).fail(res.throwError);
}

function addArticle(req, res) {
    then(function (defer) {
        if (!req.session.Uid) {
            defer(jsGen.Err(msg.USER.userNeedLogin));
        } else if (req.session.role < 2) {
            defer(jsGen.Err(msg.USER.userRoleErr));
        } else {
            checkTimeInterval(req, 'AddArticle').all(function (defer2, err, value) {
                if (value) {
                    defer(jsGen.Err(msg.MAIN.timeIntervalErr + '[' + jsGenConfig.TimeInterval + 's]'));
                } else {
                    defer();
                }
            });
        }
    }).then(function (defer) {
        filterArticle(req.apibody).all(defer);
    }).then(function (defer, article) {
        article.date = Date.now();
        article.updateTime = article.date;
        article.display = 0;
        article.status = 0;
        article.author = req.session.Uid;
        delete article._id;
        articleDao.setNewArticle(article, defer);
    }).then(function (defer, article) {
        jsGen.dao.user.setArticle({
            _id: req.session.Uid,
            articlesList: article._id
        });
        each(article.tagsList, function (x) {
            jsGen.dao.tag.setTag({
                _id: x,
                articlesList: article._id
            });
        });
        cache.update(article);
        articleCache.put(article._id, article);
        jsGenConfig.articles = 1;
        checkTimeInterval(req, 'AddArticle', true);
        articleCache.getP(article._id).all(defer);
    }).then(function (defer, article) {
        return res.sendjson(resJson(null, article));
    }).fail(res.throwError);
}

function setArticle(req, res) {
    var date = Date.now();

    getArticleID(req).then(function (defer, article) {
        if (req.session.role < 1) {
            defer(jsGen.Err(msg.USER.userRole0));
        } else if (article.display > 0 && !req.session.Uid) {
            defer(jsGen.Err(msg.USER.userNeedLogin));
        } else if (article.display === 1 && (article.author !== req.session.Uid || req.session.role < 4)) {
            defer(jsGen.Err(msg.ARTICLE.articleDisplay1));
        } else if (article.display === 2 && req.session.role !== 5) {
            defer(jsGen.Err(msg.ARTICLE.articleDisplay2));
        } else {
            defer(null, article);
        }
    }).then(function (defer, article) {
        if (req.path[3] === 'comment') {
            addComment(req, article._id).then(function (defer, comment) {
                return res.sendjson(resJson(null, comment));
            }).fail(defer);
        } else if (req.path[3] === 'edit') {
            editArticle(req, article._id).then(function (defer, comment) {
                return res.sendjson(resJson(null, comment));
            }).fail(defer);
        } else if (req.path[3] === 'mark') {
            setMark(req, article._id).then(function (defer, mark) {
                return res.sendjson(resJson(null, mark));
            }).fail(defer);
        } else if (req.path[3] === 'favor') {
            setFavor(req, article._id).then(function (defer, favor) {
                return res.sendjson(resJson(null, favor));
            }).fail(defer);
        } else if (req.path[3] === 'oppose') {
            setOppose(req, article._id).then(function (defer, oppose) {
                return res.sendjson(resJson(null, oppose));
            }).fail(defer);
        } else {
            defer(jsGen.Err(msg.MAIN.requestDataErr));
        }
    }).fail(res.throwError);
}

function robot(req, res) {
    var obj = {}, ID = req.path[0];

    then(function (defer) {
        obj.global = intersect(union(configPublicTpl), jsGenConfig);
        cache.index(0, 200, defer);
    }).then(function (defer, list) {
        obj.articlesList = convertArticlesID(list.slice(0, 20));
        if (checkID(ID, 'A')) {
            ID = convertArticleID(ID);
            then(function (defer2) {
                cache(ID, defer2);
            }).then(function (defer2, article) {
                if (article.display === 0) {
                    articleCache.getP(ID).all(defer2);
                } else {
                    defer2(true);
                }
            }).then(function (defer2, article) {
                article.content = jsGen.module.marked(article.content);
                obj.global.title2 = article.title;
                obj.global.keywords = article.tagsList.map(function (tag) {
                    return tag.tag;
                }).join();
                obj.article = article;
                convertArticles(article.commentsList, 'comment').all(defer2);
            }).then(function (defer2, commentsList) {
                each(commentsList, function (comment, i, list) {
                    list[i].content = jsGen.module.marked(comment.content);
                });
                obj.article.commentsList = commentsList;
                return res.render('/robot-article.ejs', obj);
            }).fail(function () {
                defer(null, list);
            });
        } else {
            defer(null, list);
        }
    }).then(function (defer, list) {
        then(function (defer2) {
            redis.tagCache.index(0, 20, defer2);
        }).then(function (defer2, tags) {
            tagAPI.convertTags(tags).all(defer2);
        }).then(function (defer2, tags) {
            var keywords = tags.map(function (tag) {
                return tag.tag;
            });
            keywords = keywords.concat(obj.global.keywords.split(/[,，\s]/));
            keywords = jsGen.lib.tools.uniqueArray(keywords);
            obj.global.keywords = keywords.join();
            obj.global.title2 = obj.global.description;
            convertArticles(list).all(defer2);
        }).then(function (defer2, list) {
            each(list, function (article, i) {
                list[i].content = jsGen.module.marked(article.content);
                list[i].date = new Date(article.date).toString();
            });
            obj.data = list;
            return res.render('/robot-index.ejs', obj);
        }).fail(defer);
    }).fail(res.throwError);
}

function sitemap(req, res) {

    function toSiteMap(article) {
        return {
            url: jsGenConfig.url + '/' + convertArticleID(article._id),
            date: new Date(article.updateTime).toISOString(),
            freq: 'daily', // always hourly daily weekly monthly yearly never
            priority: 0.8
        };
    }

    then(function (defer) {
        cache.index(0, -1, defer);
    }).each(null, function (defer, ID) {
        then(function (defer2) {
            cache(ID, defer2);
        }).all(function (defer2, err, article) {
            defer(null, article && article.display <= 1 ? toSiteMap(article) : null);
        });
    }).then(function (defer, list) {
        list.unshift({
            url: jsGenConfig.url,
            date: new Date().toISOString(),
            freq: 'hourly', // always hourly daily weekly monthly yearly never
            priority: 1
        });
        res.compiletemp('/sitemap.ejs', {
            sitemap: list
        }, defer);
    }).then(function (defer, html) {
        res.setHeader('Content-Type', 'application/xml');
        res.send(html);
    }).fail(res.throwError);
}

function deleteArticle(req, res) {
    getArticleID(req).then(function (defer, article) {
        if (!req.session.Uid) {
            defer(jsGen.Err(msg.USER.userNeedLogin));
        } else if (article.display > 1 && req.session.role !== 5) {
            defer(jsGen.Err(msg.ARTICLE.articleDisplay2));
        } else {
            listCache.getP(article._id, false).all(defer);
        }
    }, function (defer, err) {
        defer(jsGen.Err(msg.ARTICLE.articleNone));
    }).then(function (defer, article) {
        if (req.session.Uid === article.author || req.session.role >= 4) {
            article.display = 2;
            article.updateTime = Date.now();
            cache.update(article);
            articleDao.setArticle(article);
            if (checkID(article.refer, 'A')) {
                var referID = convertArticleID(article.refer);
                articleDao.setComment({
                    _id: referID,
                    commentsList: -article._id
                });
                articleCache.remove(referID);
                commentCache.remove(referID);
                listCache.remove(referID);
            }
            jsGen.dao.user.setArticle({
                _id: article.author,
                articlesList: -article._id
            });
            userCache.remove(article.author);
            return res.sendjson(resJson());
        } else {
            defer(jsGen.Err(msg.USER.userRoleErr));
        }
    }).fail(res.throwError);
}


module.exports = {
    GET: function (req, res) {
        switch (req.path[2]) {
        case undefined:
        case 'latest':
        case 'index':
            return getList(req, res, 'index');
        case 'hots':
            return getList(req, res, 'hotsList');
        case 'update':
            return getList(req, res, 'updateList');
        case 'comment':
            return getList(req, res, 'hotCommentsList');
        default:
            return getArticle(req, res);
        }
    },
    POST: function (req, res) {
        switch (req.path[2]) {
        case undefined:
        case 'index':
            return addArticle(req, res);
        case 'comment':
            return getComments(req, res);
        default:
            return setArticle(req, res);
        }
    },
    DELETE: function (req, res) {
        return deleteArticle(req, res);
    },
    convertArticles: convertArticles,
    sitemap: sitemap,
    robot: robot
};