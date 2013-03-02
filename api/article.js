// var globalConfig = jsGen.lib.json.GlobalConfig,
//     union = jsGen.lib.tools.union,
//     intersect = jsGen.lib.tools.intersect,
//     checkID = jsGen.lib.tools.checkID,
//     checkUrl = jsGen.lib.tools.checkUrl,
//     CacheLRU = jsGen.lib.CacheLRU,
//     filterSummary = jsGen.lib.tools.filterSummary;

// var articleCache = new CacheLRU(50);
// var paginationCache = new CacheLRU(10);
// articleCache.getArticle = function(ID, callback, convert) {
//     var that = this,
//         doc = this.get(ID);

//     callback = callback || jsGen.lib.tools.callbackFn;
//     if(convert === undefined) convert = true;
//     if(doc) {
//         if(convert) {
//             doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
//             doc.author = jsGen.api.user.convertUsers(doc.author);
//             doc.favorsList = jsGen.api.user.convertUsers(doc.favorsList);
//             doc.opposesList = jsGen.api.user.convertUsers(doc.opposesList);
//             doc.collectorsList = jsGen.api.user.convertUsers(doc.collectorsList);
//         }
//         return callback(null, doc);
//     } else jsGen.dao.article.getArticleInfo(jsGen.dao.article.convertID(ID), function(err, doc) {
//         if(doc) {
//             doc._id = ID;
//             that.put(ID, doc);
//             if(convert) {
//                 doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
//                 doc.author = jsGen.api.user.convertUsers(doc.author);
//                 doc.favorsList = jsGen.api.user.convertUsers(doc.favorsList);
//                 doc.opposesList = jsGen.api.user.convertUsers(doc.opposesList);
//                 doc.collectorsList = jsGen.api.user.convertUsers(doc.collectorsList);
//             }
//         }
//         return callback(err, doc);
//     });
// };

// var cache = {
//     _initTime: 0,
//     _index: []
// };
// cache._init = function(callback) {
//     var that = this,
//         callback = callback || jsGen.lib.tools.callbackFn;
//     jsGen.dao.user.getArticlesIndex(function(err, doc) {
//         if(doc) {
//             doc._id = jsGen.dao.article.convertID(doc._id);
//             that._update(doc);
//         }
//         if(callback) callback(err, doc);
//     });
//     return this;
// };
// cache._update = function(obj) {
//     if(!this[obj._id]) {
//         this[obj._id] = {};
//         this._index.push(obj._id);
//     }
//     this[obj._id]._id = obj._id;
//     this[obj._id].name = obj.name;
//     this[obj._id].email = obj.email;
//     this[obj._id].avatar = obj.avatar;
//     this[obj.name] = this[obj._id];
//     this[obj.email] = this[obj._id];
//     this._initTime = Date.now();
//     return this;
// };
// cache._remove = function(Uid) {
//     var that = this;
//     if(this[Uid]) {
//         delete this[this[Uid].name];
//         delete this[this[Uid].email];
//         delete this[Uid];
//         this._index.splice(this._index.indexOf(Uid), 1);
//         this._initTime = Date.now();
//     }
//     return this;
// };


// function getFn(req, res, dm) {
//     switch(req.path[2]) {
//     case undefined:
//     case 'index':
//         return getUserInfo(req, res, dm);
//     case 'logout':
//         return logout(req, res, dm);
//     case 'admin':
//         return getUsers(req, res, dm);
//     case 'reset':
//         return resetUser(req, res, dm);
//     default:
//         return getUser(req, res, dm);
//     }
// };

// function postFn(req, res, dm) {
//     switch(req.path[2]) {
//     case undefined:
//     case 'index':
//         return editUser(req, res, dm);
//     }
// };

// function deleteFn(req, res) {};

// module.exports = {
//     GET: getFn,
//     POST: postFn,
//     DELETE: deleteFn,
//     cache: cache,
//     userCache: userCache,
//     convertUsers: convertUsers
// };
