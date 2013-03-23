/*
    convertID(id);
    getArticlesIndex(date, limit, callback);
    getLatestId(callback);
    getArticle(_id, callback);
    setArticle(articleObj, callback);
    setFavor(articleObj);
    setOppose(articleObj);
    setMark(articleObj);
    setComment(articleObj, callback);
    setNewArticle(articleObj, callback);
    delArticle(_idArray, callback);
 */
var union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    IDString = jsGen.lib.json.IDString,
    defautArticle = jsGen.lib.json.Article,
    globalConfig = jsGen.lib.json.GlobalConfig;

var that = jsGen.dao.db.bind('articles', {

    convertID: function (id) {
        switch (typeof id) {
            case 'string':
                id = id.substring(1);
                id = jsGen.lib.converter(id, 62, IDString);
                return id;
            case 'number':
                id = jsGen.lib.converter(id, 62, IDString);
                while (id.length < 3) {
                    id = '0' + id;
                }
                id = 'A' + id;
                return id;
            default:
                return null;
        }
    },

    getLatestId: function (callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
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
        }, callback);
    },

    getArticlesIndex: function (callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
        that.find({}, {
            sort: {
                _id: 1
            },
            hint: {
                _id: 1
            },
            fields: {
                _id: 1,
                display: 1,
                status: 1,
                updateTime: 1,
                hots: 1,
                visitors: 1
            }
        }).each(callback);
    },

    getArticle: function (_id, callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
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
                status: 1,
                refer: 1,
                title: 1,
                cover: 1,
                content: 1,
                hots: 1,
                visitors: 1,
                updateTime: 1,
                collection: 1,
                tagsList: 1,
                favorsList: 1,
                opposesList: 1,
                markList: 1,
                comment: 1,
                commentsList: 1
            }
        }, callback);
    },

    setArticle: function (articleObj, callback) {
        var setObj = {},
        newObj = {
            author: 0,
            date: 0,
            display: 0,
            status: 0,
            refer: '',
            title: '',
            cover: '',
            content: '',
            hots: 0,
            visitors: 0,
            updateTime: 0,
            collection: 0,
            tagsList: [0],
            comment: true
        };

        intersect(newObj, articleObj);
        setObj.$set = newObj;
        if (callback) {
            that.findAndModify({
                _id: articleObj._id
            }, [], setObj, {
                w: 1,
                new: true
            }, callback);
        } else {
            that.update({
                _id: articleObj._id
            }, setObj);
        }
    },

    setFavor: function (articleObj) {
        var setObj = {},
        newObj = {
            favorsList: 0
        };

        intersect(newObj, articleObj);
        if (newObj.favorsList < 0) {
            newObj.favorsList = -newObj.favorsList;
            setObj.$pull = {
                favorsList: newObj.favorsList
            };
        } else {
            setObj.$push = {
                favorsList: newObj.favorsList
            };
        }

        that.update({
            _id: articleObj._id
        }, setObj);
    },

    setOppose: function (articleObj) {
        var setObj = {},
        newObj = {
            opposesList: 0
        };

        intersect(newObj, articleObj);
        if (newObj.opposesList < 0) {
            newObj.opposesList = -newObj.opposesList;
            setObj.$pull = {
                opposesList: newObj.opposesList
            };
        } else {
            setObj.$push = {
                opposesList: newObj.opposesList
            };
        }

        that.update({
            _id: articleObj._id
        }, setObj);
    },

    setMark: function (articleObj) {
        var setObj = {},
        newObj = {
            markList: 0
        };

        intersect(newObj, articleObj);
        if (newObj.markList < 0) {
            newObj.markList = -newObj.markList;
            setObj.$pull = {
                markList: newObj.markList
            };
        } else {
            setObj.$push = {
                markList: newObj.markList
            };
        }

        that.update({
            _id: articleObj._id
        }, setObj);
    },

    setComment: function (articleObj, callback) {
        var setObj = {},
        newObj = {
            commentsList: 0
        };
        callback = callback || jsGen.lib.tools.callbackFn;
        intersect(newObj, articleObj);
        if (newObj.commentsList < 0) {
            newObj.commentsList = -newObj.commentsList;
            setObj.$pull = {
                commentsList: newObj.commentsList
            };
        } else {
            setObj.$push = {
                commentsList: newObj.commentsList
            };
        }

        that.update({
            _id: articleObj._id
        }, setObj, {
            w: 1
        }, callback);
    },

    setNewArticle: function (articleObj, callback) {
        var article = union(defautArticle),
            newArticle = union(defautArticle);
        callback = callback || jsGen.lib.tools.callbackFn;
        intersect(article, articleObj);
        union(newArticle, article);

        that.getLatestId(function (err, doc) {
            if (err) {
                return callback(err, null);
            }
            if (!doc) {
                newArticle._id = 1;
            } else {
                newArticle._id = doc._id + 1;
            }

            that.findAndModify({
                _id: newArticle._id
            }, [], newArticle, {
                w: 1,
                upsert: true,
                new: true
            }, callback);
        });
    },

    delArticle: function (_id, callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
        that.remove({
            _id: _id
        }, {
            w: 1
        }, callback);
    }
});

module.exports = {
    convertID: that.convertID,
    getArticlesIndex: that.getArticlesIndex,
    getLatestId: that.getLatestId,
    getArticle: that.getArticle,
    setArticle: that.setArticle,
    setFavor: that.setFavor,
    setOppose: that.setOppose,
    setMark: that.setMark,
    setComment: that.setComment,
    setNewArticle: that.setNewArticle,
    delArticle: that.delArticle
};
