/*
用户数据 mongodb 访问层
convertID(id); 用户显示Uid与MongoDB内部_id之间的转换;
getUsersNum(callback); 获取用户总数量;
getUsersIndex(callback); 获取所有用户的{_id:_id,name:name,email:email}，用于内存缓存以便快速索引;
getLatestId(callback); 获取最新注册用户的_id;
getAuth(_id, callback); 根据_id获取对应用户的认证数据;
getSocial(_id, callback); 根据_id获取对应用户的社交媒体认证数据（weibo\qq\google\baidu）;
getUsers(_idArray, callback); 根据_id数组批量获取对应用户基本信息;
getUserInfo(_id, callback); 根据_id获取对应用户详细信息;
setUserInfo(userObjArray, callback); 批量设置用户信息;
setLoginAttempt(userObj); 记录用户尝试登录的次数（未成功登录）;
setLogin(userObj); 记录用户成功登录的时间和IP;
setSocial(userObj, callback); 设置用户的社交媒体认证数据
setScore(userObj); 增加或减少用户积分;
setFans(userObj); 增加或减少用户粉丝;
setFollow(userObj, callback); 增加或减少用户关注对象;
setArticles(userObj, callback); 增加或减少用户主题;
setCollections(userObj, callback); 增加或减少用户合集;
setComments(userObj, callback); 增加或减少用户评论;
setCollect(userObj, callback); 增加或减少用户收藏;
setMessages(userObj); 增加或重置用户未读信息;
setReceive(userObj); 增加或减少用户接收的消息;
setSend(userObj); 增加或减少用户发送的消息;
setNewUser(userObj, callback); 注册新用户;
*/
var db = require('./mongoDao.js').db,
    merge = require('../lib/tools.js').merge,
    intersect = require('../lib/tools.js').intersect,
    converter = require('../lib/nodeAnyBaseConverter.js'),
    UIDString = require('./json.js').UIDString,
    defautUser = require('./json.js').User,
    preAllocate = require('./json.js').UserPre,
    globalConfig = require('./json.js').GlobalConfig;

var callbackFn = function(err, doc) {
    if(err) console.log(err);
    return doc;
};

var that = db.bind('users', {

    convertID: function(id) {
        switch(typeof id) {
        case 'string':
            id = id.substring(1);
            id = converter(id, 26, UIDString);
            return id;
        case 'number':
            id = converter(id, 26, UIDString);
            while(id.length < 5) {
                id = 'a' + id;
            }
            id = 'U' + id;
            return id;
        default:
            return null;
        }
    },

    getUsersNum: function(callback) {
        callback = callback || callbackFn;
        that.count({}, function(err, count) {
            //db.close();
            return callback(err, count);
        });
    },

    getUsersIndex: function(callback) {
        callback = callback || callbackFn;
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
        }).each(function(err, doc) {
            //db.close();
            return callback(err, doc);
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

    getAuth: function(_id, callback) {
        callback = callback || callbackFn;
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
                role: 1,
                avatar: 1
            }
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    getSocial: function(_id, callback) {
        callback = callback || callbackFn;
        that.findOne({
            _id: _id
        }, {
            fields: {
                name: 1,
                email: 1,
                social: 1
            }
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    getUsers: function(_idArray, callback) {
        callback = callback || callbackFn;
        if(!Array.isArray(_idArray)) _idArray = [_idArray];
        that.find({
            _id: {
                $in: _idArray
            }
        }, {
            fields: {
                name: 1,
                email: 1,
                sex: 1,
                role: 1,
                avatar: 1,
                date: 1,
                score: 1,
                lastLoginDate: 1,
                fans: 1,
                follow: 1,
                articles: 1,
                articlesList: 1,
                collections: 1,
                collectionsList: 1,
                comments: 1
            }
        }).each(function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    getUserInfo: function(_id, callback) {
        callback = callback || callbackFn;
        that.findOne({
            _id: _id
        }, {
            fields: {
                passwd: 0,
                resetKey: 0,
                resetDate: 0,
                loginAttempts: 0,
                locked: 0,
                login: 0
            }
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    setUserInfo: function(userObjArray, callback) {
        var result = 0,
            resulterr = null,
            defaultObj = {
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
                readtimestamp: 0,
                tagsList: []
            };

        for (var i = globalConfig.UserTagsMax - 1; i >= 0; i--) defaultObj.tagsList[i] = 0;
        callback = callback || callbackFn;

        if(!Array.isArray(userObjArray)) userObjArray = [userObjArray];

        function setUserInfoExec() {
            var setObj = {},
                newObj = merge(defaultObj),
                userObj = userObjArray.pop();;

            if(!userObj) {
                //db.close();
                return callback(resulterr, result);
            }

            newObj = intersect(newObj, userObj);
            setObj.$set = newObj;

            that.update({
                _id: userObj._id
            }, setObj, {
                w: 1
            }, function(err, doc) {
                if(err) {
                    //db.close();
                    resulterr = err;
                    return callback(resulterr, result);
                } else {
                    result += 1;
                    setUserInfoExec();
                }
            });
        }

        setUserInfoExec();
    },

    setLoginAttempt: function(userObj) {
        var setObj = {},
            newObj = {
                loginAttempts: 0,
            };

        newObj = intersect(newObj, userObj);

        if(newObj.loginAttempts === 0) setObj.$set = newObj;
        else setObj.$inc = {
            loginAttempts: 1
        };

        that.update({
            _id: userObj._id
        }, setObj);
        //db.close();
    },

    setLogin: function(userObj) {
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
        //db.close();
    },

    setSocial: function(userObj, callback) {
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
        callback = callback || callbackFn;

        newObj = intersect(newObj, userObj);
        if(newObj.social.weibo) setObj.$set['social.weibo'] = newObj.social.weibo;
        else delete setObj.$set['social.weibo'];
        if(newObj.social.qq) setObj.$set['social.qq'] = newObj.social.qq;
        else delete setObj.$set['social.qq'];
        if(newObj.social.google) setObj.$set['social.google'] = newObj.social.google;
        else delete setObj.$set['social.google'];
        if(newObj.social.baidu) setObj.$set['social.baidu'] = newObj.social.baidu;
        else delete setObj.$set['social.baidu'];

        that.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    setScore: function(userObj) {
        var setObj = {},
            newObj = {
                score: 0
            };

        newObj = intersect(newObj, userObj);
        setObj.$inc = {
            score: newObj.score,
        };

        that.update({
            _id: userObj._id
        }, setObj);
        //db.close();
    },

    setFans: function(userObj) {
        var setObj = {},
            newObj = {
                fansList: 0
            };

        newObj = intersect(newObj, userObj);
        if(newObj.fansList < 0) {
            newObj.fansList = Math.abs(newObj.fansList);
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
        //db.close();
    },

    setFollow: function(userObj, callback) {
        var setObj = {},
            newObj = {
                followList: 0
            };
        callback = callback || callbackFn;

        newObj = intersect(newObj, userObj);
        if(newObj.followList < 0) {
            newObj.followList = Math.abs(newObj.followList);
            setObj.$inc = {
                fans: -1
            };
            setObj.$pull = {
                followList: newObj.followList
            };
        } else {
            setObj.$inc = {
                fans: 1
            };
            setObj.$push = {
                followList: newObj.followList
            };
        }

        that.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    setArticles: function(userObj, callback) {
        var setObj = {},
            newObj = {
                articlesList: 0
            };
        callback = callback || callbackFn;

        newObj = intersect(newObj, userObj);
        if(newObj.articlesList < 0) {
            newObj.articlesList = Math.abs(newObj.articlesList);
            setObj.$inc = {
                fans: -1
            };
            setObj.$pull = {
                articlesList: newObj.articlesList
            };
        } else {
            setObj.$inc = {
                fans: 1
            };
            setObj.$push = {
                articlesList: newObj.articlesList
            };
        }

        that.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    setCollections: function(userObj, callback) {
        var setObj = {},
            newObj = {
                collectionsList: 0
            };
        callback = callback || callbackFn;

        newObj = intersect(newObj, userObj);
        if(newObj.collectionsList < 0) {
            newObj.collectionsList = Math.abs(newObj.collectionsList);
            setObj.$inc = {
                fans: -1
            };
            setObj.$pull = {
                collectionsList: newObj.collectionsList
            };
        } else {
            setObj.$inc = {
                fans: 1
            };
            setObj.$push = {
                collectionsList: newObj.collectionsList
            };
        }

        that.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    setComments: function(userObj, callback) {
        var setObj = {},
            newObj = {
                commentsList: 0
            };
        callback = callback || callbackFn;

        newObj = intersect(newObj, userObj);
        if(newObj.commentsList < 0) {
            newObj.commentsList = Math.abs(newObj.commentsList);
            setObj.$inc = {
                fans: -1
            };
            setObj.$pull = {
                commentsList: newObj.commentsList
            };
        } else {
            setObj.$inc = {
                fans: 1
            };
            setObj.$push = {
                commentsList: newObj.commentsList
            };
        }

        that.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    setCollect: function(userObj, callback) {
        var setObj = {},
            newObj = {
                collectList: 0
            };
        callback = callback || callbackFn;

        newObj = intersect(newObj, userObj);
        if(newObj.collectList < 0) {
            newObj.collectList = Math.abs(newObj.collectList);
            setObj.$inc = {
                fans: -1
            };
            setObj.$pull = {
                collectList: newObj.collectList
            };
        } else {
            setObj.$inc = {
                fans: 1
            };
            setObj.$push = {
                collectList: newObj.collectList
            };
        }

        that.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            //db.close();
            return callback(err, doc);
        });
    },

    setMessages: function(userObj) {
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
        callback = callback || callbackFn;

        newObj = intersect(newObj, userObj);
        if(newObj.messages.article === 0) setObj.$set['messages.article'] = [];
        else delete setObj.$set['messages.article'];
        if(newObj.messages.article > 0) setObj.$push['messages.article'] = newObj.messages.article;
        else delete setObj.$push['messages.article'];
        if(newObj.messages.collection === 0) setObj.$set['messages.collection'] = [];
        else delete setObj.$set['messages.collection'];
        if(newObj.messages.collection > 0) setObj.$push['messages.collection'] = newObj.messages.collection;
        else delete setObj.$push['messages.collection'];
        if(newObj.messages.comment === 0) setObj.$set['messages.comment'] = [];
        else delete setObj.$set['messages.comment'];
        if(newObj.messages.comment > 0) setObj.$push['messages.comment'] = newObj.messages.comment;
        else delete setObj.$push['messages.comment'];
        if(newObj.messages.fan === 0) setObj.$set['messages.fan'] = [];
        else delete setObj.$set['messages.fan'];
        if(newObj.messages.fan > 0) setObj.$push['messages.fan'] = newObj.messages.fan;
        else delete setObj.$push['messages.fan'];
        if(newObj.messages.receive === 0) setObj.$set['messages.receive'] = [];
        else delete setObj.$set['messages.receive'];
        if(newObj.messages.receive > 0) setObj.$push['messages.receive'] = newObj.messages.receive;
        else delete setObj.$push['messages.receive'];

        that.update({
            _id: userObj._id
        }, setObj);
        //db.close();
    },

    setReceive: function(userObj) {
        var setObj = {},
            newObj = {
                receiveList: 0
            };

        newObj = intersect(newObj, userObj);
        if(newObj.receiveList < 0) {
            newObj.receiveList = Math.abs(newObj.receiveList);
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
        //db.close();
    },

    setSend: function(userObj) {
        var setObj = {},
            newObj = {
                sendList: 0
            };

        newObj = intersect(newObj, userObj);
        if(newObj.sendList < 0) {
            newObj.sendList = Math.abs(newObj.sendList);
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
        //db.close();
    },

    setNewUser: function(userObj, callback) {
        var user = merge(defautUser),
            newUser = merge(defautUser);
        callback = callback || callbackFn;

        newUser = intersect(newUser, userObj);
        newUser = merge(user, newUser);
        newUser.date = Date.now();

        that.getLatestId(function(err, doc) {
            if(err) {
                //db.close();
                return callback(err, null);
            }
            if (!doc) preAllocate._id = newUser._id || 1;
            else preAllocate._id = doc._id + 1;
            delete newUser._id;
            that.insert(
            preAllocate, {
                w: 1
            }, function(err, doc) {
                if(err) {
                    //db.close();
                    return callback(err, doc);
                }
                that.findAndModify({
                    _id: preAllocate._id
                }, [], newUser, {
                    w: 1,
                    new: true
                }, function(err, doc) {
                    //db.close();
                    return callback(err, doc);
                });
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
    getUsers: that.getUsers,
    getUserInfo: that.getUserInfo,
    setUserInfo: that.setUserInfo,
    setLoginAttempt: that.setLoginAttempt,
    setLogin: that.setLogin,
    setSocial: that.setSocial,
    setScore: that.setScore,
    setFans: that.setFans,
    setFollow: that.setFollow,
    setArticles: that.setArticles,
    setCollections: that.setCollections,
    setComments: that.setComments,
    setCollect: that.setCollect,
    setMessages: that.setMessages,
    setReceive: that.setReceive,
    setSend: that.setSend,
    setNewUser: that.setNewUser
};
