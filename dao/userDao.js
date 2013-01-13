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
setScore(userObj, callback); 增加或减少用户积分;
setFans(userObj, callback); 增加或减少用户粉丝;
setFollow(userObj, callback); 增加或减少用户关注对象;
setTags(userObj, callback); 增加或减少用户标签;
setTopics(userObj, callback); 增加或减少用户主题;
setCollections(userObj, callback); 增加或减少用户合集;
setComments(userObj, callback); 增加或减少用户评论;
setCollect(userObj, callback); 增加或减少用户收藏;
setMessages(userObj, callback); 增加或重置用户未读信息;
setReceive(userObj, callback); 增加或减少用户接收的消息;
setSend(userObj, callback); 增加或减少用户发送的消息;
setNewUser(userObj, callback); 注册新用户;
*/
var mongo = require('./mongoDao.js'),
    merge = require('../lib/tools.js').merge,
    intersect = require('../lib/tools.js').intersect,
    converter = require('../lib/nodeAnyBaseConverter.js'),
    UIDString = require('./json.js').UIDString,
    defautUser = require('./json.js').User,
    preAllocate = require('./json.js').UserPre,
    db = mongo.db;

db.bind('users', {

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
        this.count({}, function(err, count) {
            db.close();
            return callback(err, count);
        });
    },

    getUsersIndex: function(callback) {
        this.find({}, {
            sort: {
                _id: -1
            },
            hint: {
                _id: 1
            },
            fields: {
                _id: 1,
                name: 1,
                email: 1
            }
        }).toArray(function(err, doc) {
            db.close();
            return callback(err, doc);
        });
    },

    getLatestId: function(callback) {
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
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });
    },

    getAuth: function(_id, callback) {
        this.findOne({
            _id: _id
        }, {
            fields: {
                name: 1,
                email: 1,
                passwd: 1,
                resetpwdKey: 1,
                resetDate: 1,
                loginAttempts: 1,
                locked: 1
            }
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });
    },

    getSocial: function(_id, callback) {
        this.findOne({
            _id: _id
        }, {
            fields: {
                name: 1,
                email: 1,
                social: 1
            }
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });
    },

    getUsers: function(_idArray, callback) {
        this.find({
            _id: {
                $in: _idArray
            }
        }, {
            fields: {
                name: 1,
                email: 1,
                sex: 1,
                role: 1,
                date: 1,
                score: 1,
                lastLoginDate: 1,
                fans: 1,
                follow: 1,
                topics: 1,
                collections: 1,
                comments: 1
            }
        }).toArray(function(err, doc) {
            db.close();
            return callback(err, doc);
        });
    },

    getUserInfo: function(_id, callback) {
        this.findOne({
            _id: _id
        }, {
            fields: {
                passwd: 0,
                resetpwdKey: 0,
                resetDate: 0,
                loginAttempts: 0,
                locked: 0,
                login: 0
            }
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });
    },

    setUserInfo: function(userObjArray, callback) {
        var result = 0,
            resulterr = null,
            that = this,
            defaultObj = {
                name: null,
                email: null,
                passwd: null,
                resetpwdKey: null,
                resetDate: null,
                locked: false,
                sex: null,
                role: null,
                avatar: null,
                desc: null
            };

        if(!(userObjArray instanceof Array)) userObjArray = [userObjArray];

        function setUserInfoExec() {
            var newObj = {},
                setObj = {},
                userObj = {};

            userObj = userObjArray.pop();
            if(!userObj) {
                db.close();
                return callback(resulterr, result);
            }

            newObj = merge(newObj, defaultObj);
            newObj = intersect(newObj, userObj);
            setObj.$set = newObj;

            that.update({
                _id: userObj._id
            }, setObj, {
                w: 1
            }, function(err, doc) {
                if(err) {
                    db.close();
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

        this.update({
            _id: userObj._id
        }, setObj);
        db.close();
    },

    setLogin: function(userObj) {
        var setObj = {},
            newObj = {
                lastLoginDate: 0,
                login: {
                    date: 0,
                    ip: null
                }
            };

        newObj = intersect(newObj, userObj);
        setObj.$set = {
            lastLoginDate: newObj.lastLoginDate
        };
        setObj.$push = {
            login: newObj.login
        };
        this.update({
            _id: userObj._id
        }, setObj);
        db.close();
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
                        id: null,
                        name: null
                    },
                    qq: {
                        id: null,
                        name: null
                    },
                    google: {
                        id: null,
                        name: null
                    },
                    baidu: {
                        id: null,
                        name: null
                    }
                }
            };

        newObj = intersect(newObj, userObj);
        if(newObj.social.weibo) setObj.$set['social.weibo'] = newObj.social.weibo;
        else delete setObj.$set['social.weibo'];
        if(newObj.social.qq) setObj.$set['social.qq'] = newObj.social.qq;
        else delete setObj.$set['social.qq'];
        if(newObj.social.google) setObj.$set['social.google'] = newObj.social.google;
        else delete setObj.$set['social.google'];
        if(newObj.social.baidu) setObj.$set['social.baidu'] = newObj.social.baidu;
        else delete setObj.$set['social.baidu'];

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });
    },

    setScore: function(userObj, callback) {
        var setObj = {},
            newObj = {
                score: 0
            };

        newObj = intersect(newObj, userObj);
        setObj.$inc = newObj;

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });

    },

    setFans: function(userObj, callback) {
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

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });

    },

    setFollow: function(userObj, callback) {
        var setObj = {},
            newObj = {
                followList: 0
            };

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

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });

    },

    setTags: function(userObj, callback) {
        var setObj = {},
            newObj = {
                tagsList: 0
            };

        newObj = intersect(newObj, userObj);
        if(newObj.tagsList < 0) {
            newObj.tagsList = Math.abs(newObj.tagsList);
            setObj.$pull = {
                tagsList: newObj.tagsList
            };
        } else {
            setObj.$push = {
                tagsList: newObj.tagsList
            };
        }

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });

    },

    setTopics: function(userObj, callback) {
        var setObj = {},
            newObj = {
                topicsList: 0
            };

        newObj = intersect(newObj, userObj);
        if(newObj.topicsList < 0) {
            newObj.topicsList = Math.abs(newObj.topicsList);
            setObj.$inc = {
                fans: -1
            };
            setObj.$pull = {
                topicsList: newObj.topicsList
            };
        } else {
            setObj.$inc = {
                fans: 1
            };
            setObj.$push = {
                topicsList: newObj.topicsList
            };
        }

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });

    },

    setCollections: function(userObj, callback) {
        var setObj = {},
            newObj = {
                collectionsList: 0
            };

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

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });

    },

    setComments: function(userObj, callback) {
        var setObj = {},
            newObj = {
                commentsList: 0
            };

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

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });

    },

    setCollect: function(userObj, callback) {
        var setObj = {},
            newObj = {
                collectList: 0
            };

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

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });

    },

    setMessages: function(userObj, callback) {
        var setObj = {
            $set: {
                'messages.topics': 0,
                'messages.collections': 0,
                'messages.comments': 0,
                'messages.fans': 0,
                'messages.receive': 0
            },
            $push: {
                'messages.topics': 0,
                'messages.collections': 0,
                'messages.comments': 0,
                'messages.fans': 0,
                'messages.receive': 0
            }
        },
            newObj = {
                messages: {
                    topics: 0,
                    collections: 0,
                    comments: 0,
                    fans: 0,
                    receive: 0
                }
            };

        newObj = intersect(newObj, userObj);
        if(newObj.messages.topics === 0) setObj.$set['messages.topics'] = [];
        else delete setObj.$set['messages.topics'];
        if(newObj.messages.topics > 0) setObj.$push['messages.topics'] = newObj.messages.topics;
        else delete setObj.$push['messages.topics'];
        if(newObj.messages.collections === 0) setObj.$set['messages.collections'] = [];
        else delete setObj.$set['messages.collections'];
        if(newObj.messages.collections > 0) setObj.$push['messages.collections'] = newObj.messages.collections;
        else delete setObj.$push['messages.collections'];
        if(newObj.messages.comments === 0) setObj.$set['messages.comments'] = [];
        else delete setObj.$set['messages.comments'];
        if(newObj.messages.comments > 0) setObj.$push['messages.comments'] = newObj.messages.comments;
        else delete setObj.$push['messages.comments'];
        if(newObj.messages.fans === 0) setObj.$set['messages.fans'] = [];
        else delete setObj.$set['messages.fans'];
        if(newObj.messages.fans > 0) setObj.$push['messages.fans'] = newObj.messages.fans;
        else delete setObj.$push['messages.fans'];
        if(newObj.messages.receive === 0) setObj.$set['messages.receive'] = [];
        else delete setObj.$set['messages.receive'];
        if(newObj.messages.receive > 0) setObj.$push['messages.receive'] = newObj.messages.receive;
        else delete setObj.$push['messages.receive'];

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });

    },

    setReceive: function(userObj, callback) {
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

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });

    },

    setSend: function(userObj, callback) {
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

        this.update({
            _id: userObj._id
        }, setObj, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });

    },

    setNewUser: function(userObj, callback) {
        var that = this,
            user = {},
            newUser = {};

        user = merge(user, defautUser);
        newUser = merge(newUser, defautUser);
        newUser = intersect(newUser, userObj);
        newUser = merge(user, newUser);

        if(!newUser._id) {
            this.getLatestId(function(err, doc) {
                if(err) {
                    db.close();
                    return callback(err, null);
                }
                preAllocate._id = doc._id + 1;
                delete newUser._id;
                that.insert(
                preAllocate, {
                    w: 1
                }, function(err, doc) {
                    if(err) {
                        db.close();
                        return callback(err, doc);
                    }
                    that.update({
                        _id: preAllocate._id
                    }, newUser, {
                        w: 1
                    }, function(err, doc) {
                        db.close();
                        return callback(err, doc);
                    });
                });
            });
        } else {
            preAllocate._id = newUser._id;
            delete newUser._id;
            this.insert(
            preAllocate, {
                w: 1
            }, function(err, doc) {
                if(err) {
                        db.close();
                        return callback(err, doc);
                    }
                that.update({
                    _id: preAllocate._id
                }, newUser, {
                    w: 1
                }, function(err, doc) {
                    db.close();
                    return callback(err, doc);
                });
            });
        }
    }
});

module.exports = db.users;