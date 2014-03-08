'use strict';
/*global require, module, Buffer, jsGen*/

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
var noop = jsGen.lib.tools.noop,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    IDString = jsGen.lib.json.IDString,
    defautCollection = jsGen.lib.json.Collection,
    callbackFn = jsGen.lib.tools.callbackFn,
    wrapCallback = jsGen.lib.tools.wrapCallback,
    converter = jsGen.lib.converter,
    collections = jsGen.dao.db.bind('collections');

collections.bind({

    convertID: function (id) {
        switch (typeof id) {
        case 'string':
            id = id.substring(1);
            return converter(id, 62, IDString);
        case 'number':
            id = converter(id, 62, IDString);
            while (id.length < 3) {
                id = '0' + id;
            }
            return 'C' + id;
        default:
            return null;
        }
    },

    getCollectionsNum: function (callback) {
        this.count(wrapCallback(callback));
    },

    getLatestId: function (callback) {
        callback = callback || callbackFn;
        this.findOne({}, {
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

    getCollectionsIndex: function (date, limit, callback) {
        var query = {};
        if (date > 0) {
            query = {
                date: {
                    $gt: date
                }
            };
        }
        this.find(query, {
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
        }).toArray(wrapCallback(callback));
    },

    getCollectionsList: function (_idArray, callback) {
        if (!Array.isArray(_idArray)) {
            _idArray = [_idArray];
        }
        this.find({
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
        }).toArray(wrapCallback(callback));
    },

    getCollection: function (_id, callback) {
        this.findOne({
            _id: +_id
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
        }, wrapCallback(callback));
    },

    getCollectionInfo: function (_id, callback) {
        this.findOne({
            _id: +_id
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
        }, wrapCallback(callback));
    },

    setCollectionInfo: function (CollectionObjArray, callback) {
        var that = this,
            result = 0,
            resulterr = null,
            defaultObj = {
                title: '',
                summary: '',
                cover: '',
                subsection: [{
                    title: '',
                    summary: '',
                    articles: []
                }],
                articles: 0,
                comment: true
            };
        callback = callback || callbackFn;

        if (!Array.isArray(CollectionObjArray)) {
            CollectionObjArray = [CollectionObjArray];
        }

        function setCollectionInfoExec() {
            var setObj = {},
                newObj = union(defaultObj),
                collectionObj = CollectionObjArray.pop();

            if (!collectionObj) {
                return callback(resulterr, result);
            }

            newObj = intersect(newObj, collectionObj);
            setObj.$set = newObj;

            that.update({
                _id: collectionObj._id
            }, setObj, {
                w: 1
            }, function (err, doc) {
                if (err) {
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

    setUpdate: function (collectionObj) {
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
        this.update({
            _id: collectionObj._id
        }, setObj, noop);
    },

    setComments: function (collectionObj) {
        var setObj = {},
            newObj = {
                commentsList: 0
            };

        newObj = intersect(newObj, collectionObj);
        if (newObj.commentsList < 0) {
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

        this.update({
            _id: collectionObj._id
        }, setObj, noop);
    },

    setNewCollection: function (collectionObj, callback) {
        var that = this,
            collection = union(defautCollection),
            newCollection = union(defautCollection);

        newCollection = intersect(newCollection, collectionObj);
        newCollection = union(collection, newCollection);
        newCollection.date = Date.now();

        this.getLatestId(function (err, doc) {
            if (err) {
                return callback(err, null);
            }
            if (!doc) {
                newCollection._id = 1;
            } else {
                newCollection._id = doc._id + 1;
            }
            that.insert(
                newCollection, {
                    w: 1
                }, wrapCallback(callback));
        });
    },

    delCollection: function (_id, callback) {
        this.remove({
            _id: +_id
        }, {
            w: 1
        }, wrapCallback(callback));
    }
});

module.exports = {
    convertID: collections.convertID,
    getCollectionsNum: collections.getCollectionsNum,
    getCollectionsIndex: collections.getCollectionsIndex,
    getLatestId: collections.getLatestId,
    getCollectionsList: collections.getCollectionsList,
    getCollection: collections.getCollection,
    getCollectionInfo: collections.getCollectionInfo,
    setCollectionInfo: collections.setCollectionInfo,
    setUpdate: collections.setUpdate,
    setComments: collections.setComments,
    setNewCollection: collections.setNewCollection,
    delCollection: collections.delCollection
};