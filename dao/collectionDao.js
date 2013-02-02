/*
    convertID(id);
    getCollectionsNum(callback);
    getCollectionsIndex(date, limit, callback);
    getLatestId(callback);
    getCollectionsList(_idArray, callback);
    getCollection(_id, callback);
    getCollectionInfo(_id, callback);
    setCollectionInfo(CollectionObjArray, callback);
    setUpdate(collectionObj);
    setComments(collectionObj);
    setNewCollection(collectionObj, callback);
    delCollection(_idArray, callback);
 */
var db = require('./mongoDao.js').db,
    merge = require('../lib/tools.js').merge,
    intersect = require('../lib/tools.js').intersect,
    converter = require('../lib/nodeAnyBaseConverter.js'),
    IDString = require('./json.js').IDString,
    defautCollection = require('./json.js').Collection;

var callbackFn = function(err, doc) {
    if(err) console.log(err);
    return doc;
};

var that = db.bind('collections', {

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
            id = 'O' + id;
            return id;
        default:
            return null;
        }
    },

    getCollectionsNum: function(callback) {
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

    getCollectionsIndex: function(date, limit, callback) {
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
                updateTime: 1
            }
        }).toArray(function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    getCollectionsList: function(_idArray, callback) {
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
                title: 1,
                summary: 1,
                cover: 1,
                articles: 1,
                updateTime: 1,
                collectors: 1
            }
        }).toArray(function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    getCollection: function(_id, callback) {
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
                title: 1,
                summary: 1,
                cover: 1,
                subsection: 1,
                articles: 1,
                updateTime: 1,
                comment: 1,
                comments: 1,
                commentsList: 1
            }
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    getCollectionInfo: function(_id, callback) {
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
                title: 1,
                summary: 1,
                cover: 1,
                subsection: 1,
                articles: 1,
                updateTime: 1,
                update: 1,
                comment: 1,
                comments: 1,
                commentsList: 1
            }
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    setCollectionInfo: function(CollectionObjArray, callback) {
        var result = 0,
            resulterr = null,
            defaultObj = {
                title: '',
                summary: '',
                cover: '',
                subsection: [{
                    title: '',
                    summary: '',
                    topics: []
                }],
                articles: 0,
                comment: true
            };
        callback = callback || callbackFn;

        if(!Array.isArray(CollectionObjArray)) CollectionObjArray = [CollectionObjArray];

        function setCollectionInfoExec() {
            var setObj = {},
                newObj = merge(defaultObj),
                collectionObj = CollectionObjArray.pop();

            if(!collectionObj) {
                //db.close();
                return callback(resulterr, result);
            }

            newObj = intersect(newObj, collectionObj);
            setObj.$set = newObj;

            that.update({
                _id: collectionObj._id
            }, setObj, {
                w: 1
            }, function(err, doc) {
                if(err) {
                    //db.close();
                    resulterr = err;
                    return callback(resulterr, result);
                } else {
                    result += 1;
                    setCollectionInfoExec();
                }
            });
        }

        setCollectionInfoExec();
    },

    setUpdate: function(collectionObj) {
        var setObj = {},
            newObj = {
                updateTime: 0,
                update: {
                    _id: 0,
                    date: 0
                }
            };

        newObj = intersect(newObj, collectionObj);
        setObj.$set = {
            updateTime: newObj.updateTime
        };
        setObj.$push = {
            update: newObj.update
        };
        that.update({
            _id: collectionObj._id
        }, setObj);
        //db.close();
    },

    setComments: function(collectionObj) {
        var setObj = {},
            newObj = {
                commentsList: 0
            };

        newObj = intersect(newObj, collectionObj);
        if(newObj.commentsList < 0) {
            newObj.commentsList = Math.abs(newObj.commentsList);
            setObj.$inc = {
                collectors: -1
            };
            setObj.$pull = {
                commentsList: newObj.commentsList
            };
        } else {
            setObj.$inc = {
                collectors: 1
            };
            setObj.$push = {
                commentsList: newObj.commentsList
            };
        }

        that.update({
            _id: collectionObj._id
        }, setObj);
        //db.close();
    },

    setNewCollection: function(collectionObj, callback) {
        var collection = merge(defautCollection),
            newCollection = merge(defautCollection);
        callback = callback || callbackFn;

        newCollection = intersect(newCollection, collectionObj);
        newCollection = merge(collection, newCollection);
        newCollection.date = Date.now();

        that.getLatestId(function(err, doc) {
            if(err) {
                //db.close();
                return callback(err, null);
            }
            if(!doc) newCollection._id = 1;
            else newCollection._id = doc._id + 1;
            that.insert(
            newCollection, {
                w: 1
            }, function(err, doc) {
                //db.close();
                return callback(err, doc);
            });
        });
    },

    delCollection: function(_id, callback) {
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
    getCollectionsNum: that.getCollectionsNum,
    getCollectionsIndex: that.getCollectionsIndex,
    getLatestId: that.getLatestId,
    getCollectionsList: that.getCollectionsList,
    getCollection: that.getCollection,
    getCollectionInfo: that.getCollectionInfo,
    setCollectionInfo: that.setCollectionInfo,
    setUpdate: that.setUpdate,
    setComments: that.setComments,
    setNewCollection: that.setNewCollection,
    delCollection: that.delCollection
};
