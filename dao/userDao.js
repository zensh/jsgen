/*
用户数据 mongodb 访问层
convertID(id); 用户显示Uid与MongoDB内部_id之间的转换;
getUsersNum(callback); 获取用户总数量;
getUsersIndex(callback); 获取所有用户的{_id:_id,name:name,email:email}，用于内存缓存以便快速索引;
getLatestId(callback); 获取最新注册用户的_id;
getAuth(_id, callback); 根据_id获取对应用户的认证数据;
getSocial(_id, callback); 根据_id获取对应用户的社交媒体认证数据（weibo\qq\google\baidu）;
getUserInfo(_id, callback); 根据_id获取对应用户详细信息;
setUserInfo(userObj, callback); 批量设置用户信息;
setLoginAttempt(userObj); 记录用户尝试登录的次数（未成功登录）;
setLogin(userObj); 记录用户成功登录的时间和IP;
setSocial(userObj, callback); 设置用户的社交媒体认证数据
setFans(userObj); 增加或减少用户粉丝;
setFollow(userObj, callback); 增加或减少用户关注对象;
setArticle(userObj, callback); 增加或减少用户主题;
setCollection(userObj, callback); 增加或减少用户合集;
setMark(userObj, callback); 增加或减少用户收藏;
setMessages(userObj); 增加或重置用户未读信息;
setReceive(userObj); 增加或减少用户接收的消息;
setSend(userObj); 增加或减少用户发送的消息;
setNewUser(userObj, callback); 注册新用户;
*/
var union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    UIDString = jsGen.lib.json.UIDString,
    defautUser = jsGen.lib.json.User,
    preAllocate = jsGen.lib.json.UserPre;

var that = jsGen.dao.db.bind('users', {

    convertID: function (id) {
        switch (typeof id) {
            case 'string':
                id = id.substring(1);
                id = jsGen.lib.converter(id, 26, UIDString);
                return id;
            case 'number':
                id = jsGen.lib.converter(id, 26, UIDString);
                while (id.length < 5) {
                    id = 'a' + id;
                }
                id = 'U' + id;
                return id;
            default:
                return null;
        }
    },

    getUsersNum: function (callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
        that.count(callback);
    },

    getUsersIndex: function (callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
        that.find({}, {
            sort: {
                _id: -1
            },
            hint: {
                _id: 1
            },
            fields: {
                _id: 1,
                name: 1,
                email: 1,
                avatar: 1
            }
        }).each(callback);
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

    getAuth: function (_id, callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
        that.findOne({
            _id: _id
        }, {
            fields: {
                name: 1,
                email: 1,
                passwd: 1,
                resetKey: 1,
                resetDate: 1,
                loginAttempts: 1,
                locked: 1,
                role: 1
            }
        }, callback);
    },

    getSocial: function (_id, callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
        that.findOne({
            _id: _id
        }, {
            fields: {
                name: 1,
                email: 1,
                social: 1
            }
        }, callback);
    },

    getUserInfo: function (_id, callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
        that.findOne({
            _id: _id
        }, {
            fields: {
                passwd: 0,
                resetKey: 0,
                resetDate: 0,
                loginAttempts: 0,
                login: 0
            }
        }, callback);
    },

    setUserInfo: function (userObj, callback) {
        var setObj = {},
        newObj = {
            name: '',
            email: '',
            passwd: '',
            resetKey: '',
            resetDate: 0,
            locked: false,
            sex: '',
            role: '',
            avatar: '',
            desc: '',
            score: 0,
            readtimestamp: 0,
            tagsList: [0]
        };

        newObj = intersect(newObj, userObj);
        setObj.$set = newObj;
        if (callback) {
            that.findAndModify({
                _id: userObj._id
            }, [], setObj, {
                w: 1,
                new: true
            }, callback);
        } else that.update({
            _id: userObj._id
        }, setObj);
    },

    setLoginAttempt: function (userObj) {
        var setObj = {},
        newObj = {
            loginAttempts: 0,
        };

        newObj = intersect(newObj, userObj);
        if (newObj.loginAttempts === 0) setObj.$set = newObj;
        else setObj.$inc = {
            loginAttempts: 1
        };

        that.update({
            _id: userObj._id
        }, setObj);
    },

    setLogin: function (userObj) {
        var setObj = {},
        newObj = {
            lastLoginDate: 0,
            login: {
                date: 0,
                ip: ''
            }
        };

        newObj = intersect(newObj, userObj);
        setObj.$set = {
            lastLoginDate: newObj.lastLoginDate
        };
        setObj.$push = {
            login: newObj.login
        };
        that.update({
            _id: userObj._id
        }, setObj);
    },

    setSocial: function (userObj, callback) {
        var setObj = {
            $set: {
                'social.weibo': {},
                'social.qq': {},
                'social.google': {},
                'social.baidu': {}
            }
        },
        newObj = {
            social: {
                weibo: {
                    id: '',
                    name: ''
                },
                qq: {
                    id: '',
                    name: ''
                },
                google: {
                    id: '',
                    name: ''
                },
                baidu: {
                    id: '',
                    name: ''
                }
            }
        };
        callback = callback || jsGen.lib.tools.callbackFn;

        newObj = intersect(newObj, userObj);
        if (newObj.social.weibo) setObj.$set['social.weibo'] = newObj.social.weibo;
        else delete setObj.$set['social.weibo'];
        if (newObj.social.qq) setObj.$set['social.qq'] = newObj.social.qq;
        else delete setObj.$set['social.qq'];
        if (newObj.social.google) setObj.$set['social.google'] = newObj.social.google;
        else delete setObj.$set['social.google'];
        if (newObj.social.baidu) setObj.$set['social.baidu'] = newObj.social.baidu;
        else delete setObj.$set['social.baidu'];

        that.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, callback);
    },

    setFans: function (userObj) {
        var setObj = {},
        newObj = {
            fansList: 0
        };

        newObj = intersect(newObj, userObj);
        if (newObj.fansList < 0) {
            newObj.fansList = -newObj.fansList;
            setObj.$inc = {
                fans: -1
            };
            setObj.$pull = {
                fansList: newObj.fansList
            };
        } else {
            setObj.$inc = {
                fans: 1
            };
            setObj.$push = {
                fansList: newObj.fansList
            };
        }

        that.update({
            _id: userObj._id
        }, setObj);
    },

    setFollow: function (userObj, callback) {
        var setObj = {},
        newObj = {
            followList: 0
        };
        callback = callback || jsGen.lib.tools.callbackFn;

        newObj = intersect(newObj, userObj);
        if (newObj.followList < 0) {
            newObj.followList = -newObj.followList;
            setObj.$inc = {
                follow: -1
            };
            setObj.$pull = {
                followList: newObj.followList
            };
        } else {
            setObj.$inc = {
                follow: 1
            };
            setObj.$push = {
                followList: newObj.followList
            };
        }

        that.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, callback);
    },

    setArticle: function (userObj, callback) {
        var setObj = {},
        newObj = {
            articlesList: 0
        };
        callback = callback || jsGen.lib.tools.callbackFn;

        newObj = intersect(newObj, userObj);
        if (newObj.articlesList < 0) {
            newObj.articlesList = -newObj.articlesList;
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
            _id: userObj._id
        }, setObj, {
            w: 1
        }, callback);
    },

    setCollection: function (userObj, callback) {
        var setObj = {},
        newObj = {
            collectionsList: 0
        };
        callback = callback || jsGen.lib.tools.callbackFn;

        newObj = intersect(newObj, userObj);
        if (newObj.collectionsList < 0) {
            newObj.collectionsList = -newObj.collectionsList;
            setObj.$inc = {
                collections: -1
            };
            setObj.$pull = {
                collectionsList: newObj.collectionsList
            };
        } else {
            setObj.$inc = {
                collections: 1
            };
            setObj.$push = {
                collectionsList: newObj.collectionsList
            };
        }

        that.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, callback);
    },

    setMark: function (userObj) {
        var setObj = {},
        newObj = {
            markList: 0
        };

        newObj = intersect(newObj, userObj);
        if (newObj.markList < 0) {
            newObj.markList = -newObj.markList;
            setObj.$pull = {
                markList: newObj.markList
            };
        } else setObj.$push = {
            markList: newObj.markList
        };

        that.update({
            _id: userObj._id
        }, setObj);
    },

    setMessages: function (userObj) {
        var setObj = {
            $set: {
                'messages.article': 0,
                'messages.collection': 0,
                'messages.comment': 0,
                'messages.fan': 0,
                'messages.receive': 0
            },
            $push: {
                'messages.article': 0,
                'messages.collection': 0,
                'messages.comment': 0,
                'messages.fan': 0,
                'messages.receive': 0
            }
        },
        newObj = {
            messages: {
                article: 0,
                collection: 0,
                comment: 0,
                fan: 0,
                receive: 0
            }
        };
        callback = callback || jsGen.lib.tools.callbackFn;

        newObj = intersect(newObj, userObj);
        if (newObj.messages.article === 0) setObj.$set['messages.article'] = [];
        else delete setObj.$set['messages.article'];
        if (newObj.messages.article > 0) setObj.$push['messages.article'] = newObj.messages.article;
        else delete setObj.$push['messages.article'];
        if (newObj.messages.collection === 0) setObj.$set['messages.collection'] = [];
        else delete setObj.$set['messages.collection'];
        if (newObj.messages.collection > 0) setObj.$push['messages.collection'] = newObj.messages.collection;
        else delete setObj.$push['messages.collection'];
        if (newObj.messages.comment === 0) setObj.$set['messages.comment'] = [];
        else delete setObj.$set['messages.comment'];
        if (newObj.messages.comment > 0) setObj.$push['messages.comment'] = newObj.messages.comment;
        else delete setObj.$push['messages.comment'];
        if (newObj.messages.fan === 0) setObj.$set['messages.fan'] = [];
        else delete setObj.$set['messages.fan'];
        if (newObj.messages.fan > 0) setObj.$push['messages.fan'] = newObj.messages.fan;
        else delete setObj.$push['messages.fan'];
        if (newObj.messages.receive === 0) setObj.$set['messages.receive'] = [];
        else delete setObj.$set['messages.receive'];
        if (newObj.messages.receive > 0) setObj.$push['messages.receive'] = newObj.messages.receive;
        else delete setObj.$push['messages.receive'];

        that.update({
            _id: userObj._id
        }, setObj);
    },

    setReceive: function (userObj) {
        var setObj = {},
        newObj = {
            receiveList: 0
        };

        newObj = intersect(newObj, userObj);
        if (newObj.receiveList < 0) {
            newObj.receiveList = -newObj.receiveList;
            setObj.$pull = {
                receiveList: newObj.receiveList
            };
        } else {
            setObj.$push = {
                receiveList: newObj.receiveList
            };
        }

        that.update({
            _id: userObj._id
        }, setObj);
    },

    setSend: function (userObj) {
        var setObj = {},
        newObj = {
            sendList: 0
        };

        newObj = intersect(newObj, userObj);
        if (newObj.sendList < 0) {
            newObj.sendList = -newObj.sendList;
            setObj.$pull = {
                sendList: newObj.sendList
            };
        } else {
            setObj.$push = {
                sendList: newObj.sendList
            };
        }

        that.update({
            _id: userObj._id
        }, setObj);
    },

    setNewUser: function (userObj, callback) {
        var user = union(defautUser),
            newUser = union(defautUser);
        callback = callback || jsGen.lib.tools.callbackFn;

        newUser = intersect(newUser, userObj);
        newUser = union(user, newUser);
        newUser.date = Date.now();

        that.getLatestId(function (err, doc) {
            if (err) return callback(err, null);
            if (!doc) preAllocate._id = newUser._id || 1;
            else preAllocate._id = doc._id + 1;
            delete newUser._id;
            that.insert(
            preAllocate, {
                w: 1
            }, function (err, doc) {
                if (err) return callback(err, doc);
                that.findAndModify({
                    _id: preAllocate._id
                }, [], newUser, {
                    w: 1,
                    new: true
                }, callback);
            });
        });
    }
});

module.exports = {
    convertID: that.convertID,
    getUsersNum: that.getUsersNum,
    getUsersIndex: that.getUsersIndex,
    getLatestId: that.getLatestId,
    getAuth: that.getAuth,
    getSocial: that.getSocial,
    getUserInfo: that.getUserInfo,
    setUserInfo: that.setUserInfo,
    setLoginAttempt: that.setLoginAttempt,
    setLogin: that.setLogin,
    setSocial: that.setSocial,
    setFans: that.setFans,
    setFollow: that.setFollow,
    setArticle: that.setArticle,
    setCollection: that.setCollection,
    setMark: that.setMark,
    setMessages: that.setMessages,
    setReceive: that.setReceive,
    setSend: that.setSend,
    setNewUser: that.setNewUser
};
