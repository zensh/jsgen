/*
    convertID(id);
    getTagsNum(callback);
    getLatestId(callback);
    getTagsList(_idArray, callback);
    getTag(_id, callback);
    setTag(tagObj, callback);
    setNewTag(tagObj, callback);
    delTag(_idArray, callback);
 */
var union = jsGen.tools.union,
    intersect = jsGen.tools.intersect,
    IDString = jsGen.json.IDString,
    defautTag = jsGen.json.Tag;

var that = jsGen.db.bind('tags', {

    convertID: function(id) {
        switch(typeof id) {
        case 'string':
            id = id.substring(1);
            id = jsGen.converter(id, 62, IDString);
            return id;
        case 'number':
            id = jsGen.converter(id, 62, IDString);
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
        var callback = callback || jsGen.tools.callbackFn;
        that.count({}, function(err, count) {
            return callback(err, count);
        });
    },

    getLatestId: function(callback) {
        var callback = callback || jsGen.tools.callbackFn;
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

    getTagsIndex: function(callback) {
        var callback = callback || jsGen.tools.callbackFn;
        that.find({}, {
            sort: {
                _id: 1
            },
            hint: {
                _id: 1
            },
            fields: {
                _id: 1,
                tag: 1,
                articles: 1,
                users: 1
            }
        }).each(function(err, doc) {
            return callback(err, doc);
        });
    },

    getTag: function(_id, callback) {
        var callback = callback || jsGen.tools.callbackFn;
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
            return callback(err, doc);
        });
    },

    setTag: function(tagObj, callback) {
        var callback = callback || jsGen.tools.callbackFn;
        var setObj = {},
            newObj = {
                tag: '',
                articlesList: 0,
                usersList: 0
            };

        newObj = intersect(newObj, tagObj);
        if(newObj.tag) {
            setObj.$set = {tag: newObj.tag};
        } else if(newObj.articlesList) {
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
        } else if(newObj.usersList) {
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
        }

        that.findAndModify({
            _id: tagObj._id
        }, [], setObj, {
            w: 1,
            new: true
        }, function(err, doc) {
            return callback(err, doc);
        });
    },

    setNewTag: function(tagObj, callback) {
        var tag = union(defautTag),
            newTag = union(defautTag);
        var callback = callback || jsGen.tools.callbackFn;

        newTag = intersect(newTag, tagObj);
        newTag = union(tag, newTag);

        that.getLatestId(function(err, doc) {
            if(err) {
                return callback(err, null);
            }
            if(!doc) newTag._id = 1;
            else newTag._id = doc._id + 1;
            that.findAndModify({
                _id: newTag._id
            }, [], newTag, {
                w: 1,
                new: true,
                upsert: true
            }, function(err, doc) {
                return callback(err, doc);
            });
        });
    },

    delTag: function(_id, callback) {
        var callback = callback || jsGen.tools.callbackFn;
        that.remove({
            _id: _id
        }, {
            w: 1
        }, function(err, doc) {
            return callback(err, doc);
        });
    },
});

module.exports = {
    convertID: that.convertID,
    getTagsNum: that.getTagsNum,
    getLatestId: that.getLatestId,
    getTagsIndex: that.getTagsIndex,
    getTag: that.getTag,
    setTag: that.setTag,
    setNewTag: that.setNewTag,
    delTag: that.delTag
};
