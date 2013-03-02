var globalConfig = jsGen.lib.json.GlobalConfig,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    checkID = jsGen.lib.tools.checkID,
    checkUrl = jsGen.lib.tools.checkUrl,
    CacheLRU = jsGen.lib.CacheLRU,
    filterSummary = jsGen.lib.tools.filterSummary;

var articleCache = new CacheLRU(20);
var listCache = new CacheLRU(200);
var paginationCache = new CacheLRU(10);
articleCache.getArticle = function(ID, callback, convert) {
    var that = this,
        doc = this.get(ID);

    function getConvert() {
        doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
        doc.author = jsGen.api.user.convertUsers(doc.author);
        doc.favorsList = jsGen.api.user.convertUsers(doc.favorsList);
        doc.opposesList = jsGen.api.user.convertUsers(doc.opposesList);
        doc.collectorsList = jsGen.api.user.convertUsers(doc.collectorsList);
    };
    callback = callback || jsGen.lib.tools.callbackFn;
    if(convert === undefined) convert = true;
    if(doc) {
        if(convert) getConvert();
        return callback(null, doc);
    } else jsGen.dao.article.getArticle(jsGen.dao.article.convertID(ID), function(err, doc) {
        if(doc) {
            doc._id = ID;
            that.put(ID, doc);
            if(convert) getConvert();
        }
        return callback(err, doc);
    });
};

var cache = {
    _initTime: 0,
    _index: []
};
cache._init = function() {
    var that = this;
    jsGen.dao.article.getArticlesIndex(function(err, doc) {
        if(doc) {
            doc._id = jsGen.dao.article.convertID(doc._id);
            that._update(doc);
        }
    });
    return this;
};
cache._update = function(obj) {
    if(!this[obj._id]) {
        this[obj._id] = {};
        this._index.push(obj._id);
    }
    this[obj._id].display = obj.display;
    this[obj._id].status = obj.status;
    this[obj._id].updateTime = obj.updateTime;
    this[obj._id].hots = obj.hots;
    this._initTime = Date.now();
    return this;
};
cache._remove = function(ID) {
    delete this[ID];
    this._index.splice(this._index.indexOf(ID), 1);
    this._initTime = Date.now();
    return this;
};

function convertArticles() {};

function getFn(req, res, dm) {
    switch(req.path[2]) {
    case undefined:
    case 'index':
        return getArticleList(req, res, dm);
    default:
        return getArticle(req, res, dm);
    }
};

function postFn(req, res, dm) {
    switch(req.path[2]) {
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
    cache: cache,
    articleCache: articleCache,
    convertArticles: convertArticles
};
