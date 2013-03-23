var listArticle = jsGen.lib.json.ListArticle,
    comment = jsGen.lib.json.Comment,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    checkID = jsGen.lib.tools.checkID,
    checkUrl = jsGen.lib.tools.checkUrl,
    articleCache = jsGen.cache.article,
    commentCache = jsGen.cache.comment,
    listCache = jsGen.cache.list,
    timeInterval = jsGen.cache.timeInterval,
    MD5 = jsGen.lib.tools.MD5,
    filterTitle = jsGen.lib.tools.filterTitle,
    filterSummary = jsGen.lib.tools.filterSummary,
    filterContent = jsGen.lib.tools.filterContent,
    pagination = jsGen.lib.tools.pagination,
    checkTimeInterval = jsGen.lib.tools.checkTimeInterval;

articleCache.getP = function (ID, callback, convert) {
    var that = this,
        doc = this.get(ID),
        _id = jsGen.dao.article.convertID(ID);

    function getConvert(doc) {
        doc.visitors += 1;
        calcuHots(doc);
        union(doc, cache[ID]);
        that.put(ID, doc);
        listCache.update(ID, function (value) {
            value.visitors += 1;
            return value;
        });
        jsGen.dao.article.setArticle({
            _id: _id,
            visitors: doc.visitors,
            hots: cache[ID].hots
        });
        doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
        doc.author = jsGen.api.user.convertUsers(doc.author)[0];
        doc.favorsList = jsGen.api.user.convertUsers(doc.favorsList);
        doc.opposesList = jsGen.api.user.convertUsers(doc.opposesList);
        doc.markList = jsGen.api.user.convertUsers(doc.markList);
        doc.refer = convertRefer(doc.refer);
        convertArticles(doc.commentsList.reverse(), function (err, commentsList) {
            if (commentsList) {
                doc.commentsList = commentsList;
            }
            return callback(err, doc);
        }, 'id');
    };

    callback = callback || jsGen.lib.tools.callbackFn;
    if (convert === undefined) {
        convert = true;
    }
    if (doc) {
        if (convert) {
            getConvert(doc);
        } else {
            return callback(null, doc);
        }
    } else {
        jsGen.dao.article.getArticle(_id, function (err, doc) {
            if (doc) {
                doc._id = ID;
                if (convert) {
                    getConvert(doc);
                } else {
                    return callback(null, doc);
                }
            } else {
                return callback(err, null);
            }
        });
    }
};

commentCache.getP = function (ID, callback, convert) {
    var that = this,
        doc = this.get(ID),
        _id = jsGen.dao.article.convertID(ID);

    function getConvert(doc) {
        calcuHots(doc);
        union(doc, cache[ID]);
        that.put(ID, doc);
        jsGen.dao.article.setArticle({
            _id: _id,
            hots: cache[ID].hots
        });
        doc.author = jsGen.api.user.convertUsers(doc.author)[0];
        doc.favorsList = jsGen.api.user.convertUsers(doc.favorsList);
        doc.opposesList = jsGen.api.user.convertUsers(doc.opposesList);
        doc.markList = jsGen.api.user.convertUsers(doc.markList);
        doc.refer = convertRefer(doc.refer);
        convertArticles(doc.commentsList, function (err, commentsList) {
            if (commentsList) {
                doc.commentsList = commentsList;
            }
            return callback(err, doc);
        }, 'id');
    };

    callback = callback || jsGen.lib.tools.callbackFn;
    if (convert === undefined) {
        convert = true;
    }
    if (doc) {
        if (convert) {
            getConvert(doc);
        } else {
            return callback(null, doc);
        }
    } else {
        jsGen.dao.article.getArticle(_id, function (err, doc) {
            if (doc) {
                doc._id = ID;
                doc = intersect(union(comment), doc);
                that.put(ID, doc);
                if (convert) {
                    getConvert(doc);
                } else {
                    return callback(null, doc);
                }
            } else {
                return callback(err, null);
            }
        });
    }
};

listCache.getP = function (ID, callback, convert) {
    var that = this,
        doc = this.get(ID),
        _id = jsGen.dao.article.convertID(ID);

    function getConvert(doc) {
        union(doc, cache[ID]);
        doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
        doc.author = jsGen.api.user.convertUsers(doc.author)[0];
        doc.refer = convertRefer(doc.refer);
    };

    callback = callback || jsGen.lib.tools.callbackFn;
    if (convert === undefined) {
        convert = true;
    }
    if (doc) {
        if (convert) {
            getConvert(doc);
        }
        return callback(null, doc);
    } else {
        jsGen.dao.article.getArticle(_id, function (err, doc) {
            if (doc) {
                doc._id = ID;
                doc.content = filterSummary(jsGen.module.marked(doc.content));
                doc = intersect(union(listArticle), doc);
                that.put(ID, doc);
                if (convert) {
                    getConvert(doc);
                }
                return callback(null, doc);
            } else {
                return callback(err, null);
            }
        });
    }
};

var cache = {
    _initTime: 0,
    _index: []
};
cache._update = function (obj) {
    var i = null;
    if (!this[obj._id]) {
        this[obj._id] = {
            status: -1,
            updateTime: 0,
            hots: -1
        };
    }
    if (obj.display < 2) {
        if (obj.status > -1) {
            if (this[obj._id].status === -1) {
                this._index.push(obj._id);
                this._initTime = Date.now();
            }
            if (obj.updateTime > this[obj._id].updateTime) {
                updateList(obj);
            }
            if (obj.hots > this[obj._id].hots) {
                hotsList(obj);
            }
        } else if (obj.hots > this[obj._id].hots) {
            hotCommentsList(obj);
        }
    } else {
        this._index.splice(i = this._index.lastIndexOf(obj._id), i >= 0 ? 1 : 0);
    }
    if (obj.display > 2) {
        jsGen.cache.updateList.splice(i = jsGen.cache.updateList.lastIndexOf(obj._id), i >= 0 ? 1 : 0);
        if (i >= 0) {
            this._initTime = Date.now();
        }
        jsGen.cache.hotsList.splice(i = jsGen.cache.hotsList.lastIndexOf(obj._id), i >= 0 ? 1 : 0);
        jsGen.cache.hotCommentsList.splice(i = jsGen.cache.hotCommentsList.lastIndexOf(obj._id), i >= 0 ? 1 : 0);
    }
    this[obj._id].display = obj.display;
    this[obj._id].status = obj.status;
    this[obj._id].updateTime = obj.updateTime;
    this[obj._id].hots = obj.hots;
    if (obj.status === 2) {
        this._index.splice(i = this._index.lastIndexOf(obj._id), i >= 0 ? 1 : 0);
        this._index.push(obj._id);
    }
    return this;
};
cache._remove = function (ID) {
    var i;
    delete this[ID];
    this._index.splice(i = this._index.indexOf(ID), i >= 0 ? 1 : 0);
    this._initTime = Date.now();
    return this;
};
(function () {
    var that = this;
    jsGen.config.comments = 0;
    jsGen.config.articles = 0;
    jsGen.dao.article.getArticlesIndex(function (err, doc) {
        if (err) {
            throw err;
        }
        if (doc) {
            doc._id = jsGen.dao.article.convertID(doc._id);
            that._update(doc);
            if (doc.status === -1) {
                jsGen.config.comments += 1;
            } else {
                jsGen.config.articles += 1;
            }
        }
    });
}).call(cache);

function updateList(article) {
    var x = 0;
    for (var i = jsGen.cache.updateList.length - 1; i >= 0; i--) {
        if (jsGen.cache.updateList[i] === article._id) {
            jsGen.cache.updateList.splice(i, 1);
            continue;
        }
        if (x === 0 && jsGen.cache.updateList[i] && article.updateTime < cache[jsGen.cache.updateList[i]].updateTime) {
            x = i + 1;
            jsGen.cache.updateList.splice(x, 0, article._id);
        }
    }
    if (x === 0) {
        jsGen.cache.updateList.unshift(article._id);
    }
    if (jsGen.cache.updateList.length > 500) {
        jsGen.cache.updateList.length = 500;
    }
};

function hotsList(article) {
    var x = 0,
        now = Date.now();
    if (now - article.updateTime > 604800000) {
        return;
    }
    for (var i = jsGen.cache.hotsList.length - 1; i >= 0; i--) {
        if (now - cache[jsGen.cache.hotsList[i]].updateTime > 604800000 || jsGen.cache.hotsList[i] === article._id) {
            jsGen.cache.hotsList.splice(i, 1);
            continue;
        }
        if (x === 0 && jsGen.cache.hotsList[i] && article.hots < cache[jsGen.cache.hotsList[i]].hots) {
            x = i + 1;
            jsGen.cache.hotsList.splice(x, 0, article._id);
        }
    }
    if (x === 0) {
        jsGen.cache.hotsList.unshift(article._id);
    }
    if (jsGen.cache.hotsList.length > 100) {
        jsGen.cache.hotsList.length = 100;
    }
};

function hotCommentsList(article) {
    var x = 0,
        now = Date.now();
    if (now - article.updateTime > 604800000) {
        return;
    }
    for (var i = jsGen.cache.hotCommentsList.length - 1; i >= 0; i--) {
        if (now - cache[jsGen.cache.hotCommentsList[i]].updateTime > 604800000 || jsGen.cache.hotCommentsList[i] === article._id) {
            jsGen.cache.hotCommentsList.splice(i, 1);
            continue;
        }
        if (x === 0 && jsGen.cache.hotCommentsList[i] && article.hots < cache[jsGen.cache.hotCommentsList[i]].hots) {
            x = i + 1;
            jsGen.cache.hotCommentsList.splice(x, 0, article._id);
        }
    }
    if (x === 0) {
        jsGen.cache.hotCommentsList.unshift(article._id);
    }
    if (jsGen.cache.hotCommentsList.length > 50) {
        jsGen.cache.hotCommentsList.length = 50;
    }
};

function convertArticles(_idArray, callback, mode) {
    var result = [];
    callback = callback || jsGen.lib.tools.callbackFn;
    if (!Array.isArray(_idArray)) {
        _idArray = [_idArray];
    }
    if (_idArray.length === 0) {
        return callback(null, result);
    }
    if (typeof _idArray[0] === 'number') {
        for (var i = 0, len = _idArray.length; i < len; i++) {
            if (_idArray[i] > 0) {
                _idArray[i] = jsGen.dao.article.convertID(_idArray[i]);
            }
        }
    }
    if (mode === 'id') {
        result = _idArray.slice(0);
        return callback(null, result);
    } else {
        _idArray.reverse();
        next();
    }

    function next() {
        var ID = _idArray.pop();
        if (!ID) {
            return callback(null, result);
        }
        if (mode === 'comment') {
            commentCache.getP(ID, function (err, doc) {
                if (err) {
                    return callback(err, result);
                }
                if (doc) {
                    result.push(doc);
                }
                return next();
            });
        } else {
            listCache.getP(ID, function (err, doc) {
                if (err) {
                    return callback(err, result);
                }
                if (doc) {
                    result.push(doc);
                }
                return next();
            });
        }
    }
};

function convertRefer(refer) {
    if (!refer) {
        return;
    }
    if (checkID(refer, 'A') && cache[refer]) {
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
};

function calcuHots(doc) {
    doc.hots = jsGen.config.ArticleHots[0] * (doc.visitors ? doc.visitors : 0);
    doc.hots += jsGen.config.ArticleHots[1] * (doc.favorsList ? doc.favorsList.length : 0);
    doc.hots -= jsGen.config.ArticleHots[1] * (doc.opposesList ? doc.opposesList.length : 0);
    doc.hots += jsGen.config.ArticleHots[2] * (doc.commentsList ? doc.commentsList.length : 0);
    doc.hots += jsGen.config.ArticleHots[3] * (doc.markList ? doc.markList.length : 0);
    doc.hots += jsGen.config.ArticleHots[4] * (doc.status === 2 ? 1 : 0);
    cache._update(doc);
};

function checkStatus(article) {
    if (jsGen.config.ArticleStatus[0] > 0 && article.status === -1 && article.commentsList.length >= jsGen.config.ArticleStatus[0]) {
        article.status = 0;
        return true;
    }
    if (jsGen.config.ArticleStatus[1] > 0 && article.status === 0 && article.commentsList.length >= jsGen.config.ArticleStatus[1]) {
        article.status = 1;
        return true;
    }
    return false;
};

function filterArticle(articleObj, callback) {
    var newObj = {
        display: 0,
        refer: '',
        title: '',
        cover: '',
        content: '',
        tagsList: [''],
        comment: true,
    };
    callback = callback || jsGen.lib.tools.callbackFn;
    intersect(newObj, articleObj);
    newObj.title = filterTitle(newObj.title);
    if (!newObj.title) {
        return callback(jsGen.lib.msg.titleMinErr, null);
    }
    newObj.content = filterContent(newObj.content);
    if (!newObj.content) {
        return callback(jsGen.lib.msg.articleMinErr, null);
    }
    if (newObj.cover && !checkUrl(newObj.cover)) {
        delete newObj.cover;
    }
    if (newObj.refer && !checkUrl(newObj.refer) && !checkID(newObj.refer, 'A')) {
        delete newObj.refer;
    }
    if (newObj.tagsList && newObj.tagsList.length > 0) {
        jsGen.api.tag.filterTags(newObj.tagsList.slice(0, jsGen.config.ArticleTagsMax), function (err, tagsList) {
            if (err) {
                return callback(err, null);
            }
            if (tagsList) {
                newObj.tagsList = tagsList;
            }
            if (!articleObj._id) {
                return callback(null, newObj);
            }
            articleCache.getP(articleObj._id, function (err, doc) {
                articleObj._id = jsGen.dao.article.convertID(articleObj._id);
                if (err) {
                    return callback(err, null);
                }
                var tagList = {},
                setTagList = [];
                if (doc) {
                    doc.tagsList.forEach(function (x) {
                        tagList[x] = -articleObj._id;
                    });
                }
                newObj.tagsList.forEach(function (x) {
                    if (tagList[x]) {
                        delete tagList[x];
                    } else {
                        tagList[x] = articleObj._id;
                    }
                });
                for (var key in tagList) {
                    setTagList.push({
                        _id: Number(key),
                        articlesList: tagList[key]
                    });
                }
                setTagList.forEach(function (x) {
                    jsGen.api.tag.setTag(x);
                });
                return callback(null, newObj);
            }, false);
        });
    } else {
        return callback(null, newObj);
    }
};

function getArticle(req, res, dm) {
    var ID = req.path[2],
        p = req.getparam.p || req.getparam.page || 1;

    if (!checkID(ID, 'A') || !cache[ID]) {
        throw jsGen.Err(jsGen.lib.msg.articleNone);
    }
    if (cache[ID].display > 0 && !req.session.Uid) {
        throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    }
    if (cache[ID].display > 2 && req.session.role !== 'admin') {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    articleCache.getP(ID, dm.intercept(function (doc) {
        if (req.session.Uid !== doc.author._id) {
            if (cache[ID].display === 1) {
                jsGen.cache.user.getUser(doc.author._id, dm.intercept(function (user) {
                    if (user.fansList.indexOf(jsGen.dao.user.convertID(req.session.Uid)) < 0) {
                        throw jsGen.Err(jsGen.lib.msg.articleDisplay1);
                    }
                }), false);
            } else if (cache[ID].display === 2) {
                if (req.session.role !== 'admin' && req.session.role !== 'editor') {
                    throw jsGen.Err(jsGen.lib.msg.articleDisplay2);
                }
            }
        }
        doc.comments = doc.commentsList.length;
        var list = null;
        if (req.path[3] === 'comment') {
            if (!req.session.commentPagination) {
                return res.sendjson({
                    data: null
                });
            }
            list = jsGen.cache.pagination.get(req.session.commentPagination.key);
            if (!list || (p === 1 && req.session.commentPagination.key !== doc._id + doc.updateTime)) {
                req.session.commentPagination.key = doc._id + doc.updateTime;
                list = doc.commentsList;
                jsGen.cache.pagination.put(req.session.commentPagination.key, list);
            }
            pagination(req, list, commentCache, dm.intercept(function (commentsList) {
                union(req.session.commentPagination, commentsList.pagination);
                return res.sendjson(commentsList);
            }));
        } else {
            list = doc.commentsList;
            pagination(req, list, commentCache, dm.intercept(function (commentsList) {
                doc.commentsList = commentsList.data;
                if (commentsList.pagination) {
                    doc.pagination = commentsList.pagination;
                    req.session.commentPagination = union(doc.pagination);
                    req.session.commentPagination.key = doc._id + doc.updateTime;
                    jsGen.cache.pagination.put(req.session.commentPagination.key, list);
                }
                return res.sendjson(doc);
            }));
        }
    }));
};

function getComments(req, res, dm) {
    var result = {
        err: null,
        data: []
    };

    if (!Array.isArray(req.apibody.data)) {
        req.apibody.data = [req.apibody.data];
    }
    if (req.apibody.data.length === 0) {
        return res.sendjson(result);
    }
    req.apibody.data.reverse();
    next();

    function next() {
        var ID = req.apibody.data.pop();
        if (!ID) {
            return res.sendjson(result);
        }
        if (!checkID(ID, 'A') || !cache[ID] || cache[ID].status > -1 || cache[ID].display > 0) {
            return next();
        }
        commentCache.getP(ID, dm.intercept(function (doc) {
            if (doc) {
                result.data.push(doc);
            }
            return next();
        }));
    };
};

function getLatest(req, res, dm) {
    var list,
    p = req.getparam.p || req.getparam.page || 1,
        n = Number(req.path[3]);

    p = Number(p);
    if (req.path[2] === 'latest' && n > 0) {
        if (n > 20) {
            n = 20;
        }
        req.getparam = req.getparam || {};
        req.getparam.p = 1;
        req.getparam.n = n;
        list = cache._index.slice(-n).reverse();
    } else {
        n = 0;
        if (!req.session.listPagination) {
            req.session.listPagination = {
                key: cache._initTime
            };
        }
        list = jsGen.cache.pagination.get(req.session.listPagination.key);
        if (!list || (p === 1 && req.session.listPagination.key !== cache._initTime)) {
            req.session.listPagination.key = cache._initTime;
            list = cache._index.slice(0).reverse();
            jsGen.cache.pagination.put(req.session.listPagination.key, list);
        }
    }
    pagination(req, list, listCache, dm.intercept(function (articlesList) {
        if (articlesList.pagination) {
            union(req.session.listPagination, articlesList.pagination);
        }
        return res.sendjson(articlesList);
    }));
};

function getUpdate(req, res, dm) {
    var list,
    p = req.getparam.p || req.getparam.page || 1,
        n = Number(req.path[3]),
        key = MD5(JSON.stringify(jsGen.cache.updateList), 'base64');

    p = Number(p);
    if (n > 0) {
        if (n > 20) {
            n = 20;
        }
        req.getparam = req.getparam || {};
        req.getparam.p = 1;
        req.getparam.n = n;
        list = jsGen.cache.updateList.slice(0, n);
    } else {
        n = 0;
        if (!req.session.listPagination) {
            req.session.listPagination = {
                key: key
            };
        }
        list = jsGen.cache.pagination.get(req.session.listPagination.key);
        if (!list || (p === 1 && req.session.listPagination.key !== key)) {
            req.session.listPagination.key = key;
            list = jsGen.cache.updateList.slice(0);
            jsGen.cache.pagination.put(req.session.listPagination.key, list);
        }
    }
    pagination(req, list, listCache, dm.intercept(function (articlesList) {
        if (articlesList.pagination) {
            union(req.session.listPagination, articlesList.pagination);
        }
        return res.sendjson(articlesList);
    }));
};

function getHots(req, res, dm) {
    var list,
    p = req.getparam.p || req.getparam.page || 1,
        n = Number(req.path[3]),
        key = MD5(JSON.stringify(jsGen.cache.hotsList), 'base64');

    p = Number(p);
    if (n > 0) {
        if (n > 20) {
            n = 20;
        }
        req.getparam = req.getparam || {};
        req.getparam.p = 1;
        req.getparam.n = n;
        list = jsGen.cache.hotsList.slice(0, n);
    } else {
        n = 0;
        if (!req.session.listPagination) {
            req.session.listPagination = {
                key: key
            };
        }
        list = jsGen.cache.pagination.get(req.session.listPagination.key);
        if (!list || (p === 1 && req.session.listPagination.key !== key)) {
            req.session.listPagination.key = key;
            list = jsGen.cache.hotsList.slice(0);
            jsGen.cache.pagination.put(req.session.listPagination.key, list);
        }
    }
    pagination(req, list, listCache, dm.intercept(function (articlesList) {
        if (articlesList.pagination) {
            union(req.session.listPagination, articlesList.pagination);
        }
        return res.sendjson(articlesList);
    }));
};

function getHotComments(req, res, dm) {
    var list, n = Number(req.path[3]) || 5;

    if (n < 3) {
        n = 3;
    }
    list = jsGen.cache.hotCommentsList.slice(0, n);
    convertArticles(list, dm.intercept(function (doc) {
        return res.sendjson({
            data: doc
        });
    }));
};

function addArticle(req, res, dm) {
    if (!req.session.Uid) {
        throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    }
    if (req.session.role === 'guest') {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    if (checkTimeInterval(req, 'Ad')) {
        throw jsGen.Err(jsGen.lib.msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]');
    }
    filterArticle(req.apibody, dm.intercept(function (article) {
        article.date = Date.now();
        article.updateTime = article.date;
        if (article.display !== 1) {
            article.display = 0;
        }
        article.status = 0;
        article.author = jsGen.dao.user.convertID(req.session.Uid);
        delete article._id;
        jsGen.dao.article.setNewArticle(article, dm.intercept(function (doc) {
            if (doc) {
                jsGen.dao.user.setArticle({
                    _id: article.author,
                    articlesList: doc._id
                });
                doc._id = jsGen.dao.article.convertID(doc._id);
                cache._update(doc);
                articleCache.put(doc._id, doc);
                jsGen.config.articles += 1;
            }
            checkTimeInterval(req, 'Ad', dm);
            articleCache.getP(doc._id, dm.intercept(function (doc) {
                return res.sendjson(doc);
            }));
        }));
    }));
};

function setArticle(req, res, dm) {
    var articleID = req.path[2];
    if (!req.session.Uid) {
        throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    }
    if (!checkID(articleID, 'A') || !cache[articleID] || cache[articleID].display >= 2) {
        throw jsGen.Err(jsGen.lib.msg.articleNone);
    }

    var article_id = jsGen.dao.article.convertID(articleID);
    var user_id = jsGen.dao.user.convertID(req.session.Uid);
    var date = Date.now();
    if (req.path[3] === 'comment') {
        if (req.session.role === 'guest') {
            throw jsGen.Err(jsGen.lib.msg.userRoleErr);
        }
        if (checkTimeInterval(req, 'Ad')) {
            throw jsGen.Err(jsGen.lib.msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]');
        }
        filterArticle(req.apibody, dm.intercept(function (comment) {
            var refer_id = 0;
            if (!checkID(comment.refer, 'A') || !cache[comment.refer]) {
                comment.refer = articleID;
            }
            if (comment.refer !== articleID) {
                refer_id = jsGen.dao.article.convertID(comment.refer);
            }
            comment.date = date;
            comment.updateTime = date;
            comment.display = 0;
            comment.status = -1;
            comment.author = user_id;
            delete comment._id;
            jsGen.dao.article.setNewArticle(comment, dm.intercept(function (doc) {
                if (doc) {
                    jsGen.dao.article.setComment({
                        _id: article_id,
                        commentsList: doc._id
                    });
                    jsGen.dao.article.setArticle({
                        _id: article_id,
                        updateTime: date
                    });
                    if (refer_id) {
                        jsGen.dao.article.setComment({
                            _id: refer_id,
                            commentsList: doc._id
                        });
                        jsGen.dao.article.setArticle({
                            _id: refer_id,
                            updateTime: date
                        });
                    }
                    jsGen.dao.user.setArticle({
                        _id: user_id,
                        articlesList: doc._id
                    });
                    var new_id = doc._id;
                    doc._id = jsGen.dao.article.convertID(new_id);
                    cache._update(doc);
                    commentCache.put(doc._id, doc);
                    jsGen.config.comments += 1;
                    articleCache.getP(articleID, function (err, value) {
                        if (!value) {
                            return;
                        }
                        value.commentsList.push(new_id);
                        value.updateTime = date;
                        if (checkStatus(value)) {
                            jsGen.dao.article.setArticle({
                                _id: article_id,
                                status: value.status
                            });
                        }
                        cache._update(value);
                        articleCache.put(value._id, value);
                    }, false);
                    if (refer_id) {
                        commentCache.getP(comment.refer, function (err, value) {
                            if (!value) {
                                return;
                            }
                            value.commentsList.push(new_id);
                            value.updateTime = date;
                            if (checkStatus(value)) {
                                jsGen.dao.article.setArticle({
                                    _id: refer_id,
                                    status: value.status
                                });
                            }
                            cache._update(value);
                            commentCache.put(value._id, value);
                        }, false);
                    }
                }
                checkTimeInterval(req, 'Ad', dm);
                commentCache.getP(doc._id, dm.intercept(function (doc) {
                    return res.sendjson(doc);
                }));
            }));
        }));
    } else if (req.path[3] === 'edit') {
        if (checkTimeInterval(req, 'Ed')) {
            throw jsGen.Err(jsGen.lib.msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]');
        }
        articleCache.getP(articleID, dm.intercept(function (doc) {
            if (user_id !== doc.author) {
                throw jsGen.Err(jsGen.lib.msg.userRoleErr);
            }
            filterArticle(req.apibody, dm.intercept(function (article) {
                article._id = article_id;
                article.updateTime = date;
                jsGen.dao.article.setArticle(article, dm.intercept(function (doc) {
                    if (doc) {
                        doc._id = articleID;
                        cache._update(doc);
                        articleCache.put(doc._id, doc);
                    }
                    checkTimeInterval(req, 'Ed', dm);
                    articleCache.getP(doc._id, dm.intercept(function (doc) {
                        return res.sendjson(doc);
                    }));
                }));
            }));
        }), false);
    } else if (req.path[3] === 'mark') {
        if (checkTimeInterval(req, 'Ma')) {
            throw jsGen.Err(jsGen.lib.msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]');
        }
        var mark = !! req.apibody.mark;
        articleCache.getP(articleID, dm.intercept(function (doc) {
            var index = doc.markList.indexOf(user_id);
            if (mark && index >= 0) {
                throw jsGen.Err(jsGen.lib.msg.userMarked);
            } else if (!mark && index < 0) {
                throw jsGen.Err(jsGen.lib.msg.userUnmarked);
            }
            jsGen.dao.article.setMark({
                _id: article_id,
                markList: mark ? user_id : -user_id
            });
            jsGen.dao.user.setMark({
                _id: user_id,
                markList: mark ? article_id : -article_id
            });
            if (mark) {
                doc.markList.push(user_id);
            } else {
                doc.markList.splice(index, index >= 0 ? 1 : 0);
            }
            articleCache.put(articleID, doc);
            jsGen.cache.user.update(req.session.Uid, function (value) {
                var i;
                if (mark) {
                    value.markList.push(article_id);
                } else {
                    value.markList.splice(i = value.markList.indexOf(article_id), i >= 0 ? 1 : 0);
                }
                return value;
            });
            checkTimeInterval(req, 'Ma', dm);
            return res.sendjson({
                save: 'Ok!'
            });
        }), false);
    } else if (req.path[3] === 'favor') {
        if (checkTimeInterval(req, 'Fa')) {
            throw jsGen.Err(jsGen.lib.msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]');
        }
        var favor = !! req.apibody.favor;
        articleCache.getP(articleID, dm.intercept(function (doc) {
            var index = doc.favorsList.indexOf(user_id);
            if (favor && index >= 0) {
                throw jsGen.Err(jsGen.lib.msg.userFavor);
            } else if (!favor && index < 0) {
                throw jsGen.Err(jsGen.lib.msg.userUnfavor);
            }
            jsGen.dao.article.setFavor({
                _id: article_id,
                favorsList: favor ? user_id : -user_id
            });
            if (favor) {
                var index2 = doc.opposesList.indexOf(user_id);
                if (index2 >= 0) {
                    doc.opposesList.splice(index2, 1);
                    jsGen.dao.article.setOppose({
                        _id: article_id,
                        opposesList: -user_id
                    });
                }
                doc.favorsList.push(user_id);
            } else {
                doc.favorsList.splice(index, index >= 0 ? 1 : 0);
            }
            articleCache.put(articleID, doc);
            checkTimeInterval(req, 'Fa', dm);
            return res.sendjson({
                save: 'Ok!'
            });
        }), false);
    } else if (req.path[3] === 'oppose') {
        if (checkTimeInterval(req, 'Op')) {
            throw jsGen.Err(jsGen.lib.msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]');
        }
        var oppose = !! req.apibody.oppose;
        articleCache.getP(articleID, dm.intercept(function (doc) {
            var index = doc.opposesList.indexOf(user_id);
            if (oppose && index >= 0) {
                throw jsGen.Err(jsGen.lib.msg.userOppose);
            } else if (!oppose && index < 0) {
                throw jsGen.Err(jsGen.lib.msg.userUnoppose);
            }
            jsGen.dao.article.setOppose({
                _id: article_id,
                opposesList: oppose ? user_id : -user_id
            });
            if (oppose) {
                var index2 = doc.favorsList.indexOf(user_id);
                if (index2 >= 0) {
                    doc.favorsList.splice(index2, 1);
                    jsGen.dao.article.setFavor({
                        _id: article_id,
                        favorsList: -user_id
                    });
                }
                doc.opposesList.push(user_id);
            } else {
                doc.opposesList.splice(index, index >= 0 ? 1 : 0);
            }
            articleCache.put(articleID, doc);
            checkTimeInterval(req, 'Op', dm);
            return res.sendjson({
                save: 'Ok!'
            });
        }), false);
    } else {
        throw jsGen.Err(jsGen.lib.msg.requestDataErr);
    }
};

function robot(req, res, dm) {
    var obj = {}, ID = req.path[0];
    obj.global = union(jsGen.config);
    if (!ID || ID === 'index') {
        var list = cache._index.slice(-100);
        convertArticles(list, function () {}, 'id');
    }
    if (!checkID(ID, 'A') || !cache[ID] || cache[ID].display > 0) {
        throw jsGen.Err(jsGen.lib.msg.articleNone);
    }
    articleCache.getP(ID, dm.intercept(function (doc) {
        doc.content = jsGen.module.marked(doc.content);
        doc.comments = doc.commentsList.length;
        convertArticles(doc.commentsList, dm.intercept(function (commentsList) {
            commentsList.forEach(function (comment, i) {
                commentsList[i].content = jsGen.module.marked(comment.content);
            });
            doc.commentsList = commentsList;
            obj.article = doc;
            res.render('/robot.ejs', obj);
        }), 'comment');
    }));
};

function deleteFn(req, res, dm) {
    var articleID = req.path[2];
    if (!req.session.Uid) throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    if (!checkID(articleID, 'A') || !cache[articleID] || cache[articleID].display === 3) {
        throw jsGen.Err(jsGen.lib.msg.articleNone);
    }

    listCache.getP(articleID, dm.intercept(function (article) {
        if (req.session.Uid !== jsGen.dao.user.convertID(article.author)) {
            throw jsGen.Err(jsGen.lib.msg.userRoleErr);
        }
        var setObj = {
            _id: articleID,
            display: 3,
            updateTime: Date.now()
        };
        cache._update(setObj);
        setObj._id = jsGen.dao.article.convertID(setObj._id);
        jsGen.dao.article.setArticle(setObj);
        jsGen.cache.user.update(req.session.Uid, function (user) {
            var i;
            user.articlesList.splice(i = user.articlesList.lastIndexOf(setObj._id), i >= 0 ? 1 : 0);
            return user;
        });
        jsGen.dao.user.setArticle({
            _id: article.author,
            articlesList: -setObj._id
        });
        return res.sendjson({
            remove: 'Ok'
        });
    }), false);
};

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
};

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
};

module.exports = {
    GET: getFn,
    POST: postFn,
    DELETE: deleteFn,
    convertArticles: convertArticles,
    cache: cache,
    robot: robot
};
