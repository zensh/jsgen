var listArticleTpl = jsGen.lib.json.ListArticle,
    commentTpl = jsGen.lib.json.Comment,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    checkID = jsGen.lib.tools.checkID,
    checkUrl = jsGen.lib.tools.checkUrl,
    articleCache = jsGen.cache.article,
    commentCache = jsGen.cache.comment,
    listCache = jsGen.cache.list,
    MD5 = jsGen.lib.tools.MD5,
    filterTitle = jsGen.lib.tools.filterTitle,
    filterSummary = jsGen.lib.tools.filterSummary,
    filterContent = jsGen.lib.tools.filterContent,
    pagination = jsGen.lib.tools.pagination,
    checkTimeInterval = jsGen.lib.tools.checkTimeInterval;

articleCache.getP = function (ID, callback, convert) {
    var that = this,
        doc = this.get(ID);

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
            _id: ID,
            visitors: doc.visitors,
            hots: cache[ID].hots
        });
        doc._id = jsGen.dao.article.convertID(doc._id);
        doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
        doc.author = jsGen.api.user.convertUsers(doc.author)[0];
        doc.favorsList = jsGen.api.user.convertUsers(doc.favorsList);
        doc.opposesList = jsGen.api.user.convertUsers(doc.opposesList);
        doc.markList = jsGen.api.user.convertUsers(doc.markList);
        doc.refer = convertRefer(doc.refer);
        doc.comments = doc.commentsList.length;
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
        jsGen.dao.article.getArticle(ID, function (err, doc) {
            if (doc) {
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

commentCache.getP = function (ID, callback, convert) {
    var that = this,
        doc = this.get(ID);

    function getConvert(doc) {
        calcuHots(doc);
        union(doc, cache[ID]);
        that.put(ID, doc);
        jsGen.dao.article.setArticle({
            _id: ID,
            hots: cache[ID].hots
        });
        doc._id = jsGen.dao.article.convertID(doc._id);
        doc.author = jsGen.api.user.convertUsers(doc.author)[0];
        doc.favorsList = jsGen.api.user.convertUsers(doc.favorsList);
        doc.opposesList = jsGen.api.user.convertUsers(doc.opposesList);
        doc.markList = jsGen.api.user.convertUsers(doc.markList);
        doc.refer = convertRefer(doc.refer);
        doc.comments = doc.commentsList.length;
        doc.commentsList = convertArticleID(doc.commentsList);
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
        jsGen.dao.article.getArticle(ID, function (err, doc) {
            if (doc) {
                doc = intersect(union(commentTpl), doc);
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

listCache.getP = function (ID, callback, convert) {
    var that = this,
        doc = this.get(ID);

    function getConvert(doc) {
        union(doc, cache[ID]);
        doc._id = jsGen.dao.article.convertID(doc._id);
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
        jsGen.dao.article.getArticle(ID, function (err, doc) {
            if (doc) {
                doc.content = filterSummary(doc.content);
                doc.comments = doc.commentsList.length;
                doc = intersect(union(listArticleTpl), doc);
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
    this[obj._id].date = obj.date;
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

function convertArticleID(IDArray) {
    var result = [];
    if (!Array.isArray(IDArray)) {
        IDArray = [IDArray];
    }
    if (IDArray.length === 0) {
        return result;
    }
    for (var i = 0, len = IDArray.length; i < len; i++) {
        result[i] = jsGen.dao.article.convertID(IDArray[i]);
    }
    return result;
};

function convertArticles(IDArray, callback, mode) {
    var result = [];
    callback = callback || jsGen.lib.tools.callbackFn;
    if (!Array.isArray(IDArray)) {
        IDArray = [IDArray];
    }
    if (IDArray.length === 0) {
        return callback(null, result);
    }
    IDArray.reverse();
    next();

    function next() {
        var ID;
        if (IDArray.length === 0) {
            return callback(null, result);
        }
        ID = IDArray.pop();
        if (!ID) {
            return next();
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
    if (checkID(refer, 'A') && cache[jsGen.dao.article.convertID(refer)]) {
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
    doc.hots = Math.round(doc.hots);
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
        return callback(jsGen.Err(jsGen.lib.msg.titleMinErr), null);
    }
    newObj.content = filterContent(newObj.content);
    if (!newObj.content) {
        return callback(jsGen.Err(jsGen.lib.msg.articleMinErr), null);
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
                var tagList = {}, setTagList = [];
                if (err) {
                    return callback(err, null);
                }
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
                        _id: +key,
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

    if (checkID(ID, 'A')) {
        ID = jsGen.dao.article.convertID(ID);
    }
    if (typeof ID !== 'number' || !cache[ID]) {
        throw jsGen.Err(jsGen.lib.msg.articleNone);
    }
    if (cache[ID].display > 0 && !req.session.Uid) {
        throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    }
    if (cache[ID].display > 2 && req.session.role < 4) {
        throw jsGen.Err(jsGen.lib.msg.articleDisplay2);
    }
    articleCache.getP(ID, dm.intercept(function (article) {
        authorUid = jsGen.dao.user.convertID(article.author._id);
        if (req.session.Uid !== authorUid && cache[ID].display === 1) {
            jsGen.cache.user.getP(authorUid, dm.intercept(function (user) {
                if (user.fansList.indexOf(req.session.Uid) < 0) {
                    throw jsGen.Err(jsGen.lib.msg.articleDisplay1);
                } else {
                    get();
                }
            }), false);
        } else {
            get();
        }
        function get() {
            var list = null;
            if (req.path[3] === 'comment') {
                if (!req.session.commentPagination) {
                    return res.sendjson({
                        data: null
                    });
                }
                list = jsGen.cache.pagination.get(req.session.commentPagination.key);
                if (!list || (p === 1 && req.session.commentPagination.key !== article._id + article.updateTime)) {
                    req.session.commentPagination.key = article._id + article.updateTime;
                    list = article.commentsList.reverse();
                    jsGen.cache.pagination.put(req.session.commentPagination.key, list);
                }
                pagination(req, list, commentCache, dm.intercept(function (commentsList) {
                    union(req.session.commentPagination, commentsList.pagination);
                    return res.sendjson(commentsList);
                }));
            } else {
                list = article.commentsList.reverse();
                pagination(req, list, commentCache, dm.intercept(function (commentsList) {
                    article.commentsList = commentsList.data;
                    if (commentsList.pagination) {
                        article.pagination = commentsList.pagination;
                        req.session.commentPagination = commentsList.pagination;
                        req.session.commentPagination.key = article._id + article.updateTime;
                        jsGen.cache.pagination.put(req.session.commentPagination.key, list);
                    }
                    return res.sendjson(article);
                }));
            }
        };
    }));
};

function getComments(req, res, dm) {
    var result = {
        err: null,
        data: []
    },
    IDArray = req.apibody.data;

    if (!IDArray) {
        throw jsGen.Err(jsGen.lib.msg.requestDataErr);
    }
    if (!Array.isArray(IDArray)) {
        IDArray = [IDArray];
    }
    for (var i = 0, len = IDArray.length; i < len; i++) {
        if (checkID(IDArray[i], 'A')) {
            IDArray[i] = jsGen.dao.article.convertID(IDArray[i]);
        } else {
            IDArray[i] = null;
        }
    }
    IDArray.reverse();
    next();

    function next() {
        var ID;
        if (IDArray.length === 0) {
            return res.sendjson(result);
        }
        ID = IDArray.pop();
        if (!ID) {
            return next();
        }
        if (!cache[ID] || cache[ID].status > -1 || cache[ID].display > 0) {
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
        n = +req.path[3];

    p = +p;
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
        n = +req.path[3],
        key = MD5(JSON.stringify(jsGen.cache.updateList), 'base64');

    p = +p;
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
        n = +req.path[3],
        key = MD5(JSON.stringify(jsGen.cache.hotsList), 'base64');

    p = +p;
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
    var list, n = +req.path[3] || 5;

    if (typeof n !== 'number') {
        throw jsGen.Err(jsGen.lib.msg.requestDataErr);
    }
    if (n < 3) {
        n = 3;
    } else if (n > 50) {
        n = 50;
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
    if (req.session.role < 2) {
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
        article.author = req.session.Uid;
        delete article._id;
        jsGen.dao.article.setNewArticle(article, dm.intercept(function (doc) {
            if (doc) {
                jsGen.dao.user.setArticle({
                    _id: article.author,
                    articlesList: doc._id
                });
                doc.tagsList.forEach(function (x) {
                    jsGen.dao.tag.setTag({
                        _id: x,
                        articlesList: doc._id
                    });
                });
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
    var ID = req.path[2], date = Date.now();

    if (!req.session.Uid) {
        throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    }
    if (checkID(ID, 'A')) {
        ID = jsGen.dao.article.convertID(ID);
    }
    if (typeof ID !== 'number' || !cache[ID] || cache[ID].display >= 2) {
        throw jsGen.Err(jsGen.lib.msg.articleNone);
    }
    if (req.path[3] === 'comment') {
        if (req.session.role < 1) {
            throw jsGen.Err(jsGen.lib.msg.userRoleErr);
        }
        if (checkTimeInterval(req, 'Ad')) {
            throw jsGen.Err(jsGen.lib.msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]');
        }
        filterArticle(req.apibody, dm.intercept(function (comment) {
            var referID;
            if (checkID(comment.refer, 'A')) {
                referID = jsGen.dao.article.convertID(comment.refer);
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
            jsGen.dao.article.setNewArticle(comment, dm.intercept(function (doc) {
                if (doc) {
                    jsGen.dao.article.setComment({
                        _id: ID,
                        commentsList: doc._id
                    });
                    jsGen.dao.article.setArticle({
                        _id: ID,
                        updateTime: date
                    });
                    if (referID) {
                        jsGen.dao.article.setComment({
                            _id: referID,
                            commentsList: doc._id
                        });
                        jsGen.dao.article.setArticle({
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
                    jsGen.config.comments += 1;
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
                            jsGen.dao.article.setArticle({
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
                                jsGen.dao.article.setArticle({
                                    _id: referID,
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
        articleCache.getP(ID, dm.intercept(function (article) {
            if (req.session.Uid !== article.author && req.session.role < 4) {
                throw jsGen.Err(jsGen.lib.msg.userRoleErr);
            }
            filterArticle(req.apibody, dm.intercept(function (article) {
                article._id = ID;
                article.updateTime = date;
                jsGen.dao.article.setArticle(article, dm.intercept(function (doc) {
                    if (doc) {
                        cache._update(doc);
                        articleCache.put(doc._id, doc);
                        var doc2 = intersect(union(listArticleTpl), doc);
                        doc2.content = filterSummary(doc2.content);
                        doc2.comments = doc.commentsList.length;
                        listCache.put(doc._id, doc2);
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
        articleCache.getP(ID, dm.intercept(function (doc) {
            var index = doc.markList.indexOf(req.session.Uid);
            if (mark && index >= 0) {
                throw jsGen.Err(jsGen.lib.msg.userMarked);
            } else if (!mark && index < 0) {
                throw jsGen.Err(jsGen.lib.msg.userUnmarked);
            }
            jsGen.dao.article.setMark({
                _id: ID,
                markList: mark ? req.session.Uid : -req.session.Uid
            });
            jsGen.dao.user.setMark({
                _id: req.session.Uid,
                markList: mark ? ID : -ID
            });
            if (mark) {
                doc.markList.push(req.session.Uid);
            } else {
                doc.markList.splice(index, index >= 0 ? 1 : 0);
            }
            articleCache.put(ID, doc);
            listCache.update(ID, function (value) {
                value.markList = doc.markList;
                return value;
            });
            commentCache.update(ID, function (value) {
                value.markList = doc.markList;
                return value;
            });
            jsGen.cache.user.update(req.session.Uid, function (value) {
                var i;
                if (mark) {
                    value.markList.push(ID);
                } else {
                    value.markList.splice(i = value.markList.indexOf(ID), i >= 0 ? 1 : 0);
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
        articleCache.getP(ID, dm.intercept(function (doc) {
            var index = doc.favorsList.indexOf(req.session.Uid);
            if (favor && index >= 0) {
                throw jsGen.Err(jsGen.lib.msg.userFavor);
            } else if (!favor && index < 0) {
                throw jsGen.Err(jsGen.lib.msg.userUnfavor);
            }
            jsGen.dao.article.setFavor({
                _id: ID,
                favorsList: favor ? req.session.Uid : -req.session.Uid
            });
            if (favor) {
                var index2 = doc.opposesList.indexOf(req.session.Uid);
                if (index2 >= 0) {
                    doc.opposesList.splice(index2, 1);
                    jsGen.dao.article.setOppose({
                        _id: ID,
                        opposesList: -req.session.Uid
                    });
                }
                doc.favorsList.push(req.session.Uid);
            } else {
                doc.favorsList.splice(index, index >= 0 ? 1 : 0);
            }
            articleCache.put(ID, doc);
            listCache.update(ID, function (value) {
                value.favorsList = doc.favorsList;
                return value;
            });
            commentCache.update(ID, function (value) {
                value.favorsList = doc.favorsList;
                return value;
            });
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
        articleCache.getP(ID, dm.intercept(function (doc) {
            var index = doc.opposesList.indexOf(req.session.Uid);
            if (oppose && index >= 0) {
                throw jsGen.Err(jsGen.lib.msg.userOppose);
            } else if (!oppose && index < 0) {
                throw jsGen.Err(jsGen.lib.msg.userUnoppose);
            }
            jsGen.dao.article.setOppose({
                _id: ID,
                opposesList: oppose ? req.session.Uid : -req.session.Uid
            });
            if (oppose) {
                var index2 = doc.favorsList.indexOf(req.session.Uid);
                if (index2 >= 0) {
                    doc.favorsList.splice(index2, 1);
                    jsGen.dao.article.setFavor({
                        _id: ID,
                        favorsList: -req.session.Uid
                    });
                }
                doc.opposesList.push(req.session.Uid);
            } else {
                doc.opposesList.splice(index, index >= 0 ? 1 : 0);
            }
            articleCache.put(ID, doc);
            listCache.update(ID, function (value) {
                value.opposesList = doc.opposesList;
                return value;
            });
            commentCache.update(ID, function (value) {
                value.opposesList = doc.opposesList;
                return value;
            });
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
    obj.articlesList = cache._index.slice(-200).reverse();
    if (checkID(ID, 'A')) {
        ID = jsGen.dao.article.convertID(ID);
    }
    if (typeof ID !== 'number' || !cache[ID] || cache[ID].display > 0) {
        var keywords, list = obj.articlesList.slice(0, 50);
        keywords = jsGen.api.tag.convertTags(jsGen.api.tag.cache._index.slice(0, 20)).map(function (tag) {
            return tag.tag;
        });
        keywords = keywords.concat(obj.global.keywords.split(/[,，\s]/));
        keywords = jsGen.lib.tools.uniqueArray(keywords);
        obj.global.keywords = keywords.join();
        obj.global.title2 = obj.global.description;
        convertArticles(list, dm.intercept(function (doc) {
            obj.articlesList = convertArticleID(obj.articlesList);
            doc.forEach(function (article, i) {
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
                commentsList.forEach(function (comment, i) {
                    commentsList[i].content = jsGen.module.marked(comment.content);
                });
                doc.commentsList = commentsList;
                obj.article = doc;
                return res.render('/robot-article.ejs', obj);
            }), 'comment');
        }));
    }
};

function deleteArticle(req, res, dm) {
    var ID = req.path[2];
    if (!req.session.Uid) throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    if (checkID(ID, 'A')) {
        ID = jsGen.dao.article.convertID(ID);
    }
    if (typeof ID !== 'number' || !cache[ID] || cache[ID].display === 2) {
        throw jsGen.Err(jsGen.lib.msg.articleNone);
    }
    listCache.getP(ID, dm.intercept(function (article) {
        if (req.session.Uid !== article.author && req.session.role < 4) {
            throw jsGen.Err(jsGen.lib.msg.userRoleErr);
        }
        var setObj = {
            _id: ID,
            display: 3,
            updateTime: Date.now()
        };
        cache._update(setObj);
        jsGen.dao.article.setArticle(setObj);
        jsGen.cache.user.update(req.session.Uid, function (user) {
            var i;
            user.articlesList.splice(i = user.articlesList.lastIndexOf(ID), i >= 0 ? 1 : 0);
            return user;
        });
        jsGen.dao.user.setArticle({
            _id: article.author,
            articlesList: -ID
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

function deleteFn(req, res, dm) {
    return deleteArticle(req, res, dm);
};

module.exports = {
    GET: getFn,
    POST: postFn,
    DELETE: deleteFn,
    convertArticles: convertArticles,
    cache: cache,
    robot: robot
};
