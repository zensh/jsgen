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
var union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    IDString = jsGen.lib.json.IDString,
    defautCollection = jsGen.lib.json.Collection;

var that = jsGen.dao.db.bind('collections', {

    convertID: function(id) {
        switch(typeof id) {
        case 'string':
            id = id.substring(1);
            id = jsGen.lib.converter(id, 62, IDString);
            return id;
        case 'number':
            id = jsGen.lib.converter(id, 62, IDString);
            while(id.length < 3) {
                id = '0' + id;
            }
            id = 'C' + id;
            return id;
        default:
            return null;
        }
    },

    getCollectionsNum: function(callback) {
        var callback = callback || jsGen.lib.tools.callbackFn;
        that.count(function(err, count) {
            return callback(err, count);
        });
    },

    getLatestId: function(callback) {
        var callback = callback || jsGen.lib.tools.callbackFn;
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
            return callback(err, doc);
        });
    },

    getCollectionsIndex: function(date, limit, callback) {
        var query = {};
        var callback = callback || jsGen.lib.tools.callbackFn;
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
            return callback(err, doc);
        });
    },

    getCollectionsList: function(_idArray, callback) {
        var callback = callback || jsGen.lib.tools.callbackFn;
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
            return callback(err, doc);
        });
    },

    getCollection: function(_id, callback) {
        var callback = callback || jsGen.lib.tools.callbackFn;
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
            return callback(err, doc);
        });
    },

    getCollectionInfo: function(_id, callback) {
        var callback = callback || jsGen.lib.tools.callbackFn;
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
        var callback = callback || jsGen.lib.tools.callbackFn;

        if(!Array.isArray(CollectionObjArray)) CollectionObjArray = [CollectionObjArray];

        function setCollectionInfoExec() {
            var setObj = {},
                newObj = union(defaultObj),
                collectionObj = CollectionObjArray.pop();

            if(!collectionObj) {
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
    },

    setNewCollection: function(collectionObj, callback) {
        var collection = union(defautCollection),
            newCollection = union(defautCollection);
        var callback = callback || jsGen.lib.tools.callbackFn;

        newCollection = intersect(newCollection, collectionObj);
        newCollection = union(collection, newCollection);
        newCollection.date = Date.now();

        that.getLatestId(function(err, doc) {
            if(err) {
                return callback(err, null);
            }
            if(!doc) newCollection._id = 1;
            else newCollection._id = doc._id + 1;
            that.insert(
            newCollection, {
                w: 1
            }, function(err, doc) {
                return callback(err, doc);
            });
        });
    },

    delCollection: function(_id, callback) {
        var callback = callback || jsGen.lib.tools.callbackFn;
        that.remove({
            _id: _id
        }, {
            w: 1
        }, function(err, doc) {
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
