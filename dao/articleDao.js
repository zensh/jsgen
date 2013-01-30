/*
    convertID(id);
    getArticlesNum(callback);
    getArticlesIndex(date, limit, callback);
    getLatestId(callback);
    getArticlesList(_idArray, callback);
    getArticle(_id, callback);
    getArticleInfo(_id, callback);
    setArticleInfo(ArticleObjArray, callback);
    setDraft(articleObj);
    setHots(articleObj);
    setUpdate(articleObj);
    setVisitors(articleObj);
    setFavors(articleObj);
    setCollectors(articleObj);
    setComments(articleObj);
    setNewArticle(articleObj, callback);
    delArticle(_idArray, callback);
 */
var db = require('./mongoDao.js').db,
    merge = require('../lib/tools.js').merge,
    intersect = require('../lib/tools.js').intersect,
    converter = require('../lib/nodeAnyBaseConverter.js'),
    IDString = require('./json.js').IDString,
    defautArticle = require('./json.js').Article,
    globalConfig = require('./json.js').GlobalConfig;

var callbackFn = function(err, doc) {
    if (err) console.log(err);
    return doc;
};

var that = db.bind('articles', {

    convertID: function(id) {
        switch(typeof id) {
        case 'string':
            id = id.substring(1);
            id = converter(id, 62, IDString);
            return id;
        case 'number':
            id = converter(id, 62, IDString);
            while(id.length < 3) {
                id = '0' + id;
            }
            id = 'A' + id;
            return id;
        default:
            return null;
        }
    },

    getArticlesNum: function(callback) {
        callback = callback || callbackFn;
        that.count({}, function(err, count) {
            //db.close();
            return callback(err, count);
        });
    },

    getLatestId: function(callback) {
        callback = callback || callbackFn;
        that.findOne({}, {
            sort: {
                _id: -1
            },
            hint: {
                _id: 1
            },
            fields: {
                _id: 1
            }
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    getArticlesIndex: function(date, limit, callback) {
        var query = {};
        callback = callback || callbackFn;
        if(date > 0) query = {
            date: {
                $gt: date
            }
        }
        that.find(query, {
            sort: {
                _id: -1
            },
            limit: limit,
            hint: {
                _id: 1
            },
            fields: {
                _id: 1,
                display: 1,
                commend: 1,
                updateTime: 1,
                hots: 1
            }
        }).toArray(function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    getArticlesList: function(_idArray, callback) {
        callback = callback || callbackFn;
        if(!Array.isArray(_idArray)) _idArray = [_idArray];
        that.find({
            _id: {
                $in: _idArray
            }
        }, {
            fields: {
                author: 1,
                date: 1,
                display: 1,
                commend: 1,
                title: 1,
                summary: 1,
                cover: 1,
                updateTime: 1,
                hots: 1,
                visitors: 1,
                collection: 1,
                tagsList: 1
            }
        }).toArray(function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    getArticle: function(_id, callback) {
        callback = callback || callbackFn;
        that.findOne({
            _id: _id
        }, {
            sort: {
                _id: -1
            },
            fields: {
                author: 1,
                date: 1,
                display: 1,
                commend: 1,
                title: 1,
                summary: 1,
                cover: 1,
                content: 1,
                updateTime: 1,
                hots: 1,
                visitors: 1,
                collection: 1,
                tagsList: 1,
                favors: 1,
                collectors: 1,
                comment: 1,
                comments: 1,
                commentsList: 1
            }
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    getArticleInfo: function(_id, callback) {
        callback = callback || callbackFn;
        that.findOne({
            _id: _id
        }, {
            sort: {
                _id: -1
            },
            fields: {
                author: 1,
                date: 1,
                display: 1,
                commend: 1,
                title: 1,
                summary: 1,
                cover: 1,
                content: 1,
                draft: 1,
                updateTime: 1,
                hots: 1,
                visitors: 1,
                update: 1,
                collection: 1,
                tagsList: 1,
                favors: 1,
                favorsList: 1,
                collectors: 1,
                collectorsList: 1,
                comment: 1,
                comments: 1,
                commentsList: 1
            }
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    setArticleInfo: function(ArticleObjArray, callback) {
        var result = 0,
            resulterr = null,
            defaultObj = {
                display: 0,
                commend: 0,
                title: '',
                summary: '',
                cover: '',
                content: '',
                comment: true,
                collection: 0,
                tagsList: []
            };

        for (var i = globalConfig.ArticleTagsMax - 1; i >= 0; i--) defaultObj.tagsList[i] = 0;
        callback = callback || callbackFn;

        if(!Array.isArray(ArticleObjArray)) ArticleObjArray = [ArticleObjArray];

        function setArticleInfoExec() {
            var setObj = {},
                newObj = merge(defaultObj),
                articleObj = ArticleObjArray.pop();

            if(!articleObj) {
                //db.close();
                return callback(resulterr, result);
            }

            newObj = intersect(newObj, articleObj);
            setObj.$set = newObj;

            that.update({
                _id: articleObj._id
            }, setObj, {
                w: 1
            }, function(err, doc) {
                if(err) {
                    //db.close();
                    resulterr = err;
                    return callback(resulterr, result);
                } else {
                    result += 1;
                    setArticleInfoExec();
                }
            });
        }

        setArticleInfoExec();
    },

    setDraft: function(articleObj) {
        var setObj = {},
            newObj = {
                draft: ''
            };

        newObj = intersect(newObj, articleObj);
        setObj.$set = newObj;

        that.update({
            _id: articleObj._id
        }, setObj);
        //db.close();
    },

    setHots: function(articleObj) {
        var setObj = {},
            newObj = {
                hots: 0
            };

        newObj = intersect(newObj, articleObj);
        setObj.$inc = {
            hots: newObj.hots,
        };

        that.update({
            _id: articleObj._id
        }, setObj);
        //db.close();
    },

    setUpdate: function(articleObj) {
        var setObj = {},
            newObj = {
                updateTime: 0,
                update: {
                    _id: 0,
                    date: 0
                }
            };

        newObj = intersect(newObj, articleObj);
        setObj.$set = {
            updateTime: newObj.updateTime
        };
        setObj.$push = {
            update: newObj.update
        };
        that.update({
            _id: articleObj._id
        }, setObj);
        //db.close();
    },

    setVisitors: function(articleObj) {
        var setObj = {},
            newObj = {
                visitors: 0
            };

        newObj = intersect(newObj, articleObj);
        setObj.$inc = {
            visitors: 1,
        };

        that.update({
            _id: articleObj._id
        }, setObj);
        //db.close();
    },

    setFavors: function(articleObj) {
        var setObj = {},
            newObj = {
                favorsList: 0
            };

        newObj = intersect(newObj, articleObj);
        if(newObj.favorsList < 0) {
            newObj.favorsList = Math.abs(newObj.favorsList);
            setObj.$inc = {
                favors: -1
            };
            setObj.$pull = {
                favorsList: newObj.favorsList
            };
        } else {
            setObj.$inc = {
                favors: 1
            };
            setObj.$push = {
                favorsList: newObj.favorsList
            };
        }

        that.update({
            _id: articleObj._id
        }, setObj);
        //db.close();
    },

    setCollectors: function(articleObj) {
        var setObj = {},
            newObj = {
                collectorsList: 0
            };

        newObj = intersect(newObj, articleObj);
        if(newObj.collectorsList < 0) {
            newObj.collectorsList = Math.abs(newObj.collectorsList);
            setObj.$inc = {
                collectors: -1
            };
            setObj.$pull = {
                collectorsList: newObj.collectorsList
            };
        } else {
            setObj.$inc = {
                collectors: 1
            };
            setObj.$push = {
                collectorsList: newObj.collectorsList
            };
        }

        that.update({
            _id: articleObj._id
        }, setObj);
        //db.close();
    },

    setComments: function(articleObj) {
        var setObj = {},
            newObj = {
                commentsList: 0
            };

        newObj = intersect(newObj, articleObj);
        if(newObj.commentsList < 0) {
            newObj.commentsList = Math.abs(newObj.commentsList);
            setObj.$inc = {
                comments: -1
            };
            setObj.$pull = {
                commentsList: newObj.commentsList
            };
        } else {
            setObj.$inc = {
                comments: 1
            };
            setObj.$push = {
                commentsList: newObj.commentsList
            };
        }

        that.update({
            _id: articleObj._id
        }, setObj);
        //db.close();
    },

    setNewArticle: function(articleObj, callback) {
        var article = merge(defautArticle),
            newArticle = merge(defautArticle);
        callback = callback || callbackFn;

        for (var i = globalConfig.ArticleTagsMax - 1; i >= 0; i--) newArticle.tagsList[i] = 0;
        newArticle = intersect(newArticle, articleObj);
        newArticle = merge(article, newArticle);

        that.getLatestId(function(err, doc) {
            if(err) {
                //db.close();
                return callback(err, null);
            }
            if (!doc) newArticle._id = 1;
            else newArticle._id = doc._id + 1;
            that.insert(
            newArticle, {
                w: 1
            }, function(err, doc) {
                //db.close();
                return callback(err, doc);
            });
        });
    },

    delArticle: function(_id, callback) {
        callback = callback || callbackFn;
        that.remove({
            _id: _id
        }, {
            w: 1
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    }
});

module.exports = {
    convertID: that.convertID,
    getArticlesNum: that.getArticlesNum,
    getArticlesIndex: that.getArticlesIndex,
    getLatestId: that.getLatestId,
    getArticlesList: that.getArticlesList,
    getArticle: that.getArticle,
    getArticleInfo: that.getArticleInfo,
    setArticleInfo: that.setArticleInfo,
    setDraft: that.setDraft,
    setHots: that.setHots,
    setUpdate: that.setUpdate,
    setVisitors: that.setVisitors,
    setFavors: that.setFavors,
    setCollectors: that.setCollectors,
    setComments: that.setComments,
    setNewArticle: that.setComments,
    delArticle: that.delArticle
};
