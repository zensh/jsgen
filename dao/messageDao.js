'use strict';
/*global require, module, Buffer, jsGen*/

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
var union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    IDString = jsGen.lib.json.IDString,
    defautMessage = jsGen.lib.json.Message,
    callbackFn = jsGen.lib.tools.callbackFn,
    converter = jsGen.lib.converter;

var that = jsGen.dao.db.bind('messages', {

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
            return 'M' + id;
        default:
            return null;
        }
    },

    getMessagesNum: function (callback) {
        callback = callback || callbackFn;
        that.count(callback);
    },

    getLatestId: function (callback) {
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
        }, callback);
    },

    getMessagesList: function (_idArray, callback) {
        callback = callback || callbackFn;
        if (!Array.isArray(_idArray)) {
            _idArray = [_idArray];
        }
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
        }).toArray(callback);
    },

    getMessage: function (_id, callback) {
        callback = callback || callbackFn;
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
        }, callback);
    },

    setMessage: function (messageObj) {
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
    },

    setNewMessage: function (messageObj, callback) {
        var message = union(defautMessage),
            newMessage = union(defautMessage);
        callback = callback || callbackFn;

        newMessage = intersect(newMessage, messageObj);
        newMessage = union(message, newMessage);
        newMessage.date = Date.now();

        that.getLatestId(function (err, doc) {
            if (err) {
                return callback(err, null);
            }
            if (!doc) {
                newMessage._id = 1;
            } else {
                newMessage._id = doc._id + 1;
            }
            that.insert(
                newMessage, {
                    w: 1
                }, callback);
        });
    },

    delMessage: function (_id, callback) {
        callback = callback || callbackFn;
        that.remove({
            _id: _id
        }, {
            w: 1
        }, callback);
    }
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