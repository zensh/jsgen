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
    }
    this[obj._id].display = obj.display;
    this[obj._id].status = obj.status;
    this[obj._id].updateTime = obj.updateTime;
    this[obj._id].hots = obj.hots;
    this[obj._id].visitors = obj.visitors;
    this._initTime = Date.now();
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
