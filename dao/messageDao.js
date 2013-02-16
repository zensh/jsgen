/*
    convertID(id);
    getMessagesNum(callback);
    getLatestId(callback);
    getMessagesList(_idArray, callback);
    getMessage(_id, callback);
    setMessage(messageObj);
    setNewMessage(messageObj, callback);
    delMessage(_idArray, callback);
 */
var db = require('./mongoDao.js').db,
    union = require('../lib/tools.js').union,
    intersect = require('../lib/tools.js').intersect,
    callbackFn = require('../lib/tools.js').callbackFn,
    converter = require('../lib/nodeAnyBaseConverter.js'),
    IDString = require('./json.js').IDString,
    defautMessage = require('./json.js').Message;

var that = db.bind('messages', {

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
            id = 'M' + id;
            return id;
        default:
            return null;
        }
    },

    getMessagesNum: function(callback) {
        var callback = callback || callbackFn;
        that.count({}, function(err, count) {
            //db.close();
            return callback(err, count);
        });
    },

    getLatestId: function(callback) {
        var callback = callback || callbackFn;
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

    getMessagesList: function(_idArray, callback) {
        var callback = callback || callbackFn;
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
                content: 1
            }
        }).toArray(function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    getMessage: function(_id, callback) {
        var callback = callback || callbackFn;
        that.findOne({
            _id: _id
        }, {
            sort: {
                _id: -1
            },
            fields: {
                author: 1,
                receiver: 1,
                date: 1,
                title: 1,
                content: 1
            }
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    setMessage: function(messageObj) {
        var query = {},
            setObj = {},
            newObj = {
                receiver: {
                    _id: 0,
                    read: false
                }
            };

        newObj = intersect(newObj, messageObj);

        that.update({
                _id: messageObj._id,
                'receiver._id': newObj.receiver._id
        }, {
            $set: {
                'receiver.$.read': true
            }
        });
        //db.close();
    },

    setNewMessage: function(messageObj, callback) {
        var message = union(defautMessage),
            newMessage = union(defautMessage);
        var callback = callback || callbackFn;

        newMessage = intersect(newMessage, messageObj);
        newMessage = union(message, newMessage);
        newMessage.date = Date.now();

        that.getLatestId(function(err, doc) {
            if(err) {
                //db.close();
                return callback(err, null);
            }
            if (!doc) newMessage._id = 1;
            else newMessage._id = doc._id + 1;
            that.insert(
            newMessage, {
                w: 1
            }, function(err, doc) {
                //db.close();
                return callback(err, doc);
            });
        });
    },

    delMessage: function(_id, callback) {
        var callback = callback || callbackFn;
        that.remove({
            _id: _id
        }, {
            w: 1
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },
});

module.exports = {
    convertID: that.convertID,
    getMessagesNum: that.getMessagesNum,
    getLatestId: that.getLatestId,
    getMessagesList: that.getMessagesList,
    getMessage: that.getMessage,
    setMessage: that.setMessage,
    setNewMessage: that.setNewMessage,
    delMessage: that.delMessage
};
