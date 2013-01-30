/*
    convertID(id);
    getTagsNum(callback);
    getLatestId(callback);
    getTagsList(_idArray, callback);
    getTag(_id, callback);
    setArticles(tagObj);
    setUsers(tagObj);
    setNewTag(tagObj, callback);
    delTag(_idArray, callback);
 */
var db = require('./mongoDao.js').db,
    merge = require('../lib/tools.js').merge,
    intersect = require('../lib/tools.js').intersect,
    converter = require('../lib/nodeAnyBaseConverter.js'),
    IDString = require('./json.js').IDString,
    defautTag = require('./json.js').Tag;

var callbackFn = function(err, doc) {
    if (err) console.log(err);
    return doc;
};

var that = db.bind('tags', {

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
            id = 'T' + id;
            return id;
        default:
            return null;
        }
    },

    getTagsNum: function(callback) {
        callback = callback || callbackFn;
        that.count({}, function(err, count) {
            // db.close();
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
            // db.close();
            return callback(err, doc);
        });
    },

    getTagsList: function(_idArray, callback) {
        callback = callback || callbackFn;
        if(!Array.isArray(_idArray)) _idArray = [_idArray];
        that.find({
            _id: {
                $in: _idArray
            }
        }, {
            fields: {
                tag: 1,
                articles: 1,
                users: 1
            }
        }).toArray(function(err, doc) {
            // db.close();
            return callback(err, doc);
        });
    },

    getTag: function(_id, callback) {
        callback = callback || callbackFn;
        that.findOne({
            _id: _id
        }, {
            sort: {
                _id: -1
            },
            fields: {
                tag: 1,
                articles: 1,
                articlesList: 1,
                users: 1,
                usersList: 1
            }
        }, function(err, doc) {
            // db.close();
            return callback(err, doc);
        });
    },

    setArticles: function(tagObj) {
        var setObj = {},
            newObj = {
                articlesList: 0
            };

        newObj = intersect(newObj, tagObj);
        if(newObj.articlesList < 0) {
            newObj.articlesList = Math.abs(newObj.articlesList);
            setObj.$inc = {
                articles: -1
            };
            setObj.$pull = {
                articlesList: newObj.articlesList
            };
        } else {
            setObj.$inc = {
                articles: 1
            };
            setObj.$push = {
                articlesList: newObj.articlesList
            };
        }

        that.update({
            _id: tagObj._id
        }, setObj);
        // db.close();
    },

    setUsers: function(tagObj) {
        var setObj = {},
            newObj = {
                usersList: 0
            };

        newObj = intersect(newObj, tagObj);
        if(newObj.usersList < 0) {
            newObj.usersList = Math.abs(newObj.usersList);
            setObj.$inc = {
                users: -1
            };
            setObj.$pull = {
                usersList: newObj.usersList
            };
        } else {
            setObj.$inc = {
                users: 1
            };
            setObj.$push = {
                usersList: newObj.usersList
            };
        }

        that.update({
            _id: tagObj._id
        }, setObj);
        // db.close();
    },

    setNewTag: function(tagObj, callback) {
        var tag = merge(defautTag),
            newTag = merge(defautTag);
        callback = callback || callbackFn;

        newTag = intersect(newTag, tagObj);
        newTag = merge(tag, newTag);

        that.getLatestId(function(err, doc) {
            if(err) {
                // db.close();
                return callback(err, null);
            }
            if (!doc) newTag._id = 1;
            else newTag._id = doc._id + 1;
            that.insert(
            newTag, {
                w: 1
            }, function(err, doc) {
                // db.close();
                return callback(err, doc);
            });
        });
    },

    delTag: function(_id, callback) {
        callback = callback || callbackFn;
        that.remove({
            _id: _id
        }, {
            w: 1
        }, function(err, doc) {
            // db.close();
            return callback(err, doc);
        });
    },
});

module.exports = {
    convertID: that.convertID,
    getTagsNum: that.getTagsNum,
    getLatestId: that.getLatestId,
    getTagsList: that.getTagsList,
    getTag: that.getTag,
    setArticles: that.setArticles,
    setUsers: that.setUsers,
    setNewTag: that.setNewTag,
    delTag: that.delTag
};
