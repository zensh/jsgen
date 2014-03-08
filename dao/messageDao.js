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
var noop = jsGen.lib.tools.noop,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    IDString = jsGen.lib.json.IDString,
    defautMessage = jsGen.lib.json.Message,
    callbackFn = jsGen.lib.tools.callbackFn,
    wrapCallback = jsGen.lib.tools.wrapCallback,
    converter = jsGen.lib.converter,
    messages = jsGen.dao.db.bind('messages');

messages.bind({

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

    getMessagesList: function (_idArray, callback) {
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
                content: 1
            }
        }).toArray(wrapCallback(callback));
    },

    getMessage: function (_id, callback) {
        this.findOne({
            _id: +_id
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
        }, wrapCallback(callback));
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

        this.update({
            _id: messageObj._id,
            'receiver._id': newObj.receiver._id
        }, {
            $set: {
                'receiver.$.read': true
            }
        });
    },

    setNewMessage: function (messageObj, callback) {
        var that = this,
            message = union(defautMessage),
            newMessage = union(defautMessage);
        callback = callback || callbackFn;

        newMessage = intersect(newMessage, messageObj);
        newMessage = union(message, newMessage);
        newMessage.date = Date.now();

        this.getLatestId(function (err, doc) {
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
                }, wrapCallback(callback));
        });
    },

    delMessage: function (_id, callback) {
        this.remove({
            _id: +_id
        }, {
            w: 1
        }, wrapCallback(callback));
    }
});

module.exports = {
    convertID: messages.convertID,
    getMessagesNum: messages.getMessagesNum,
    getLatestId: messages.getLatestId,
    getMessagesList: messages.getMessagesList,
    getMessage: messages.getMessage,
    setMessage: messages.setMessage,
    setNewMessage: messages.setNewMessage,
    delMessage: messages.delMessage
};