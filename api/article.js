var listArticle = jsGen.lib.json.ListArticle,
    comment = jsGen.lib.json.Comment,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    checkID = jsGen.lib.tools.checkID,
    checkUrl = jsGen.lib.tools.checkUrl,
    articleCache = jsGen.cache.article,
    commentCache = jsGen.cache.comment,
    listCache = jsGen.cache.list,
    filterSummary = jsGen.lib.tools.filterSummary;

articleCache.getArticle = function(ID, callback, convert) {
    var that = this,
        doc = this.get(ID);

    function getConvert(doc) {
        doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
        doc.author = jsGen.api.user.convertUsers(doc.author);
        doc.favorsList = jsGen.api.user.convertUsers(doc.favorsList);
        doc.opposesList = jsGen.api.user.convertUsers(doc.opposesList);
        doc.collectorsList = jsGen.api.user.convertUsers(doc.collectorsList);
    };
    callback = callback || jsGen.lib.tools.callbackFn;
    if (convert === undefined) convert = true;
    if (doc) {
        doc.hots = cache[ID].hots;
        doc.visitors = cache[ID].visitors;
        if (convert) {
            getConvert(doc);
            convertArticles(doc.commentsList, callback, 'comment');
        } else return callback(null, doc);
    } else jsGen.dao.article.getArticle(jsGen.dao.article.convertID(ID), function(err, doc) {
        if (doc) {
            doc._id = ID;
            that.put(ID, doc);
            if (convert) {
                getConvert(doc);
                convertArticles(doc.commentsList, callback, 'comment');
            }
        }
        return callback(err, doc);
    });
};

commentCache.getArticle = function(ID, callback, convert) {
    var that = this,
        doc = this.get(ID);

    function getConvert(doc) {
        doc.author = jsGen.api.user.convertUsers(doc.author);
        doc.favorsList = jsGen.api.user.convertUsers(doc.favorsList);
        doc.opposesList = jsGen.api.user.convertUsers(doc.opposesList);
    };
    callback = callback || jsGen.lib.tools.callbackFn;
    if (convert === undefined) convert = true;
    if (doc) {
        if (convert) {
            getConvert(doc);
            convertArticles(doc.commentsList, callback, 'comment');
        } else return callback(null, doc);
    } else jsGen.dao.article.getArticle(jsGen.dao.article.convertID(ID), function(err, doc) {
        if (doc) {
            doc._id = ID;
            doc = intersect(union(comment), doc);
            that.put(ID, doc);
            if (convert) {
                getConvert(doc);
                convertArticles(doc.commentsList, callback, 'comment');
            }
        }
        return callback(err, doc);
    });
};

listCache.getArticle = function(ID, callback, convert) {
    var that = this,
        doc = this.get(ID);

    function getConvert() {
        doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
        doc.author = jsGen.api.user.convertUsers(doc.author);
    };
    callback = callback || jsGen.lib.tools.callbackFn;
    if (convert === undefined) convert = true;
    if (doc) {
        if (convert) getConvert(doc);
        doc.hots = cache[ID].hots;
        doc.visitors = cache[ID].visitors;
        return callback(null, doc);
    } else jsGen.dao.article.getArticle(jsGen.dao.article.convertID(ID), function(err, doc) {
        if (doc) {
            doc._id = ID;
            doc.content = filterSummary(doc.content);
            doc = intersect(union(listArticle), doc);
            that.put(ID, doc);
            if (convert) getConvert(doc);
        }
        return callback(err, doc);
    });
};

var cache = {
    _initTime: 0,
    _index: []
};
cache._update = function(obj) {
    if (!this[obj._id]) {
        this[obj._id] = {};
        this._index.push(obj._id);
        this._initTime = Date.now();
    }
    this[obj._id].display = obj.display;
    this[obj._id].status = obj.status;
    this[obj._id].updateTime = obj.updateTime;
    this[obj._id].hots = obj.hots;
    this[obj._id].visitors = obj.visitors;
    if (obj.display === 2) {
        this._index.splice(this._index.lastIndexOf(obj._id), 1);
        this._index.push(obj._id);
    }
    return this;
};
cache._remove = function(ID) {
    delete this[ID];
    this._index.splice(this._index.indexOf(ID), 1);
    this._initTime = Date.now();
    return this;
};
(function() {
    var that = this;
    jsGen.dao.article.getArticlesIndex(function(err, doc) {
        if (err) throw err;
        if (doc) {
            doc._id = jsGen.dao.article.convertID(doc._id);
            that._update(doc);
        }
    });
}).call(cache);

function convertArticles(_idArray, callback, mode) {
    var result = [];
    if (!Array.isArray(_idArray)) _idArray = [_idArray];
    if (_idArray.length === 0) return callback(null, result);
    _idArray.reverse();
    next();

    function next() {
        var ID = _idArray.pop();
        if (!ID) return callback(null, tags);
        if (mode === 'comment') {
            commentCache.getArticle(ID, function(err, doc) {
                if (err) return callback(err, result);
                if (doc) result.push(doc);
                next();
            });
        } else listCache.getArticle(ID, function(err, doc) {
            if (err) return callback(err, result);
            if (doc) result.push(doc);
            next();
        });
    }
};

function getArticle(req, res, dm) {
    var ID = req.path[2];
    if (!checkID(ID) || !cache[ID]) throw jsGen.Err(jsGen.lib.msg.articleNone);
    if (cache[ID].display > 0 && !req.session.Uid) throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    articleCache.getArticle(ID, dm.intercept(function(doc) {
        if (req.session.Uid === doc.author._id) return res.sendjson(doc);
        if (cache[ID].display === 1) {
            jsGen.cache.user.getUser(doc.author._id, dm.intercept(function(user) {
                if (user.fansList.indexOf(jsGen.dao.user.convertID(req.session.Uid)) >= 0) return res.sendjson(doc);
                else throw jsGen.Err(jsGen.lib.msg.articleDisplay1);
            }), false);
        } else if (cache[ID].display === 2) {
            if (req.session.role === 'admin' || req.session.role === 'editor') return res.sendjson(doc);
            else throw jsGen.Err(jsGen.lib.msg.articleDisplay2);
        } else return res.sendjson(doc);
    }));
};

function getLatest(req, res, dm) {
    var array = [],
        p = req.getparam.p || req.getparam.page,
        n = req.getparam.n || req.getparam.num,
        body = {
            pagination: {},
            data: []
        };

    if (!req.session.pagination) {
        req.session.pagination = {
            pagID: 'a' + cache._initTime,
            total: cache._index.length,
            num: 20,
            now: 1
        };
        jsGen.cache.pagination.put(req.session.pagination.pagID, cache._index);
    }
    if (n && n >= 1 && n <= 100) req.session.pagination.num = Math.floor(n);
    if (p && p >= 1) req.session.pagination.now = Math.floor(p);
    p = req.session.pagination.now;
    n = req.session.pagination.num;
    array = jsGen.cache.pagination.get(req.session.pagination.pagID);
    if (!array || (p === 1 && req.session.pagination.pagID !== 'a' + cache._initTime)) {
        req.session.pagination.pagID = 'a' + cache._initTime;
        req.session.pagination.total = cache._index.length;
        jsGen.cache.pagination.put(req.session.pagination.pagID, cache._index);
        array = cache._index;
    }
    array = array.slice((p - 1) * n, p * n);
    body.pagination.total = req.session.pagination.total;
    body.pagination.now = p;
    body.pagination.num = n;
    next();

    function next() {
        var ID = array.pop();
        if (!ID) return res.sendjson(body);
        listCache.getArticle(ID, dm.intercept(function(doc) {
            if (doc) body.data.push(doc);
            next();
        }));
    };
};

function getFn(req, res, dm) {
    switch (req.path[2]) {
        case undefined:
        case 'index':
            return getLatest(req, res, dm);
        case 'hot':
            return getHot(req, res, dm);
        case 'update':
            return getUpdate(req, res, dm);
        default:
            return getArticle(req, res, dm);
    }
};

function postFn(req, res, dm) {
    switch (req.path[2]) {
        case undefined:
        case 'index':
            return editArticle(req, res, dm);
    }
};

function deleteFn(req, res) {};

module.exports = {
    GET: getFn,
    POST: postFn,
    DELETE: deleteFn,
    convertArticles: convertArticles
};
