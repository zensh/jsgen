'use strict';
/*global require, module, Buffer, jsGen*/
var client = {},
    redis = require('redis'),
    then = jsGen.module.then,
    redisPort = jsGen.conf.RedisPort || 6379,
    redisIp = jsGen.conf.RedisIp || '127.0.0.1',
    globalCacheDb = jsGen.conf.RedisDefaultDb || 1,
    onlineUserCacheDb = globalCacheDb + 2,
    onlineCacheDb = globalCacheDb + 1,
    TimeLimitCacheId = 0,
    MD5 = jsGen.lib.tools.MD5,
    each = jsGen.lib.tools.each,
    union = jsGen.lib.tools.union,
    throttle = jsGen.lib.tools.throttle,
    intersect = jsGen.lib.tools.intersect,
    callbackFn = jsGen.lib.tools.callbackFn,
    errorHandler = jsGen.lib.tools.errorHandler,
    clientSub = redis.createClient(redisPort, redisIp, {
        connect_timeout: 5000
    });  // 订阅频道等候消息的client

each([globalCacheDb, onlineCacheDb, onlineUserCacheDb], function (x) {
    client[x] = redis.createClient(redisPort, redisIp, {
        connect_timeout: 5000
    });
    client[x].on('ready', function () {
        then(function (defer) {
            client[x].select(x, defer);
        }).then(function (defer) {
            console.log('Redis connected: ' + redisIp + ':' + redisPort + ', DB: ' + x);
        });
    });
});

function initConfig(configTpl, callback) {
    var config = {},  // 新构建的config缓存
        _config = union(configTpl),  // 从configTpl克隆的config闭包镜像
        subPubId = MD5('' + Date.now() + Math.random(), 'base64');  // 本进程的唯一识别ID

    callback = callback || callbackFn;

    var update = throttle(function () {
        jsGen.dao.index.setGlobalConfig(_config);
    }, 300000); // 将config写入MongoDB，每五分钟内最多执行一次

    function updateKey(key) {  // 更新镜像的key键值
        return then(function (defer) {
            client[globalCacheDb].hget('config.hash', key, defer);  // 从redis读取更新的数据
        }).then(function (defer, reply) {
            reply = JSON.parse(reply);
            _config[key] = typeof _config[key] === typeof reply ? reply : _config[key];  // 数据写入config镜像
            defer(null, _config[key]);
        }).fail(errorHandler);
    }

    clientSub.on('message', function (channel, key) {
        var ID = key.slice(0, 24);  // 分离识别ID和key
        key = key.slice(24);
        if (channel === 'updateConfig' && ID !== subPubId) {  // 来自于updateConfig频道且不是本进程发出的更新通知
            if (key in _config) {
                updateKey(key);  // 更新一个key
            } else {
                each(_config, function (value, key) {  // 更新整个config镜像
                    updateKey(key);
                });
            }
        }
    });
    clientSub.subscribe('updateConfig');  // 订阅updateConfig频道

    each(configTpl, function (value, key) {  // 从configTpl模板构建getter/setter，利用Hash类型存储config
        Object.defineProperty(config, key, {
            set: function (value) {
                then(function (defer) {
                    if ((value === 1 || value === -1) && typeof _config[key] === 'number') {
                        _config[key] += value;  // 按1递增或递减，更新镜像，再更新redis
                        client[globalCacheDb].hincrby('config.hash', key, value, defer);
                    } else {
                        _config[key] = value;  // 因为redis存储字符串，下面先序列化。
                        client[globalCacheDb].hset('config.hash', key, JSON.stringify(value), defer);
                    }
                }).then(function () {  // redis数据库更新完成，向其他进程发出更新通知
                    client[globalCacheDb].publish('updateConfig', subPubId + key);
                }).fail(jsGen.thenErrLog);
                update();  // 更新MongoDB
            },
            get: function () {
                return _config[key];  // 从镜像读取数据
            },
            enumerable: true,
            configurable: true
        });
    });
    // 初始化config对象的值，如重启进程后，如果redis数据库原来存有数据，读取该数据
    then.each(Object.keys(configTpl), function (next, key) {
        updateKey(key).then(function (defer, value) {
            return next ? next() : callback(null, config);  // 异步返回新的config对象，已初始化数据值
        }).fail(function (defer, err) {
            callback(err);
        });
    });
    return config;  // 同步返回新的config对象
}

function TimeLimitCache(timeLimit, type, name, getUpdate) {
    var method = {
        string: ['get', 'set'],
        array: ['lrange', 'lpush'],
        object: ['hgetall', 'hmset']
    };
    this.name = 'tlCache.' + (name || TimeLimitCacheId++) + '.';
    this.method = method[type || 'string'];
    this.timeLimit = +timeLimit || 60;
    this.getUpdate = !! getUpdate;
}

TimeLimitCache.prototype.get = function (key, callback) {
    var that = this;
    callback = callback || callbackFn;
    then(function (defer) {
        var get = that.method[0];
        if (that.getUpdate) {
            client[globalCacheDb].expire(that.name + key, that.timeLimit);
        }
        if (get === 'lrange') {
            client[globalCacheDb][get](that.name + key, 0, -1, callback);
        } else {
            client[globalCacheDb][get](that.name + key, callback);
        }
    }).fail(function (defer, err) {
        callback(err);
    });
};
TimeLimitCache.prototype.put = function (key, value, callback) {
    var that = this;
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].del(that.name + key, defer);
    }).then(function (defer) {
        client[globalCacheDb][that.method[1]](that.name + key, value, defer);
    }).then(function (defer) {
        client[globalCacheDb].expire(that.name + key, that.timeLimit, callback);
    }).fail(function (defer, err) {
        callback(err);
    });
};
TimeLimitCache.prototype.remove = function (key, callback) {
    var that = this;
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].del(that.name + key, callback);
    }).fail(function (defer, err) {
        callback(err);
    });
};
TimeLimitCache.prototype.removeAll = function (callback) {
    var that = this;
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].keys(that.name + '*', defer);
    }).then(function (defer, keys) {
        if (keys.length > 0) {
            client[globalCacheDb].del(keys, defer);
        } else {
            defer(null, 0);
        }
    }).then(function (defer, num) {
        callback(null, num);
    }).fail(function (defer, err) {
        callback(err);
    });
};
TimeLimitCache.prototype.info = function (callback) {
    var that = this;
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].keys(that.name + '*', defer);
    }).then(function (defer, keys) {
        keys = keys || [];
        callback(null, {
            name: that.name,
            timeLimit: that.timeLimit,
            length: keys.length
        });
    }).fail(function (defer, err) {
        callback(err);
    });
};

function onlineCache(req, callback) {
    var users = 0,
        key = req.session.Uid || MD5(req.useragent + req.ip, 'base64');

    callback = callback || callbackFn;
    if (key) {
        then(function (defer) {
            client[req.session.Uid ? onlineUserCacheDb : onlineCacheDb].setex(key, 600, '', defer);
        }).then(function (defer) {
            client[onlineUserCacheDb].dbsize(defer);
        }).then(function (defer, reply) {
            users = +reply;
            client[onlineCacheDb].dbsize(defer);
        }).then(function (defer, reply) {
            callback(null, users, +reply + users);
        }).fail(function (defer, err) {
            callback(err);
        });
    } else {
        callback(jsGen.Err('redis onlineCache request error!'));
    }
}

function userCache(_id, callback) {
    callback = callback || callbackFn;

    if (_id > 0) {
        then(function (defer) {
            client[globalCacheDb].hgetall('user.hash.' + _id, defer);
        }).then(function (defer, user) {
            if (!user) {
                callback(jsGen.Err('redis user not exist!'));
            } else {
                user._id = +user._id;
                callback(null, user);
            }
        }).fail(function (defer, err) {
            callback(err);
        });
    } else {
        callback(jsGen.Err('redis userCache request error!'));
    }
}
userCache.index = function (start, end, callback) {
    start = start || 0;
    end = end || 50;
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].zrevrange('user.sset.index', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(function (defer, err) {
        callback(err);
    });
};
userCache.index.total = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].zcard('user.sset.index', defer);
    }).then(function (defer, total) {
        callback(null, +total);
    }).fail(function (defer, err) {
        callback(err);
    });
};
userCache.get = function (name, callback) {
    callback = callback || callbackFn;

    if (name) {
        then(function (defer) {
            client[globalCacheDb].get(('user.str.' + name).toLowerCase(), defer);
        }).then(function (defer, _id) {
            callback(_id > 0 ? null : jsGen.Err('redis user not exist!'), +_id);
        }).fail(function (defer, err) {
            callback(err);
        });
    } else {
        callback(jsGen.Err('redis userCache.get request error!'));
    }
};
userCache.update = function (userObj, callback) {
    var user = {
        _id: 0,
        name: '',
        email: '',
        avatar: '',
        score: 0,
    };

    callback = callback || callbackFn;
    intersect(user, userObj);
    if (user._id > 0) {
        then(function (defer) {
            client[globalCacheDb].hgetall('user.hash.' + user._id, defer);
        }).all(function (defer, err, old) {
            if (old) {
                then(function (defer2) {
                    if (user.name && old.name !== user.name) {
                        client[globalCacheDb].del(('user.str.' + old.name).toLowerCase(), defer2);
                    } else {
                        defer2();
                    }
                }).then(function (defer2) {
                    if (user.email && old.email !== user.email) {
                        client[globalCacheDb].del(('user.str.' + old.email).toLowerCase(), defer);
                    } else {
                        defer();
                    }
                }).fail(function (defer2, err) {
                    defer();
                });
            } else {
                defer();
            }
        }).then(function (defer) {
            client[globalCacheDb].hmset('user.hash.' + user._id, user, defer);
        }).then(function (defer) {
            client[globalCacheDb].zadd('user.sset.index', user._id, user._id, defer);
        }).then(function (defer) {
            client[globalCacheDb].set(('user.str.' + user.name).toLowerCase(), user._id, defer);
        }).then(function (defer) {
            client[globalCacheDb].set(('user.str.' + user.email).toLowerCase(), user._id, defer);
        }).then(function (defer) {
            callback(null, true);
        }).fail(function (defer, err) {
            callback(err);
        });
    } else {
        callback(jsGen.Err('redis userCache update request error!'));
    }
};
userCache.removeAll = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].keys('user*', defer);
    }).then(function (defer, keys) {
        if (keys.length > 0) {
            client[globalCacheDb].del(keys, defer);
        } else {
            defer(null, 0);
        }
    }).then(function (defer, num) {
        callback(null, num);
    }).fail(function (defer, err) {
        callback(err);
    });
};

function tagCache(_id, callback) {
    callback = callback || callbackFn;

    if (_id > 0) {
        then(function (defer) {
            client[globalCacheDb].hgetall('tag.hash.' + _id, defer);
        }).then(function (defer, tag) {
            if (!tag) {
                callback(jsGen.Err('redis tag not exist!'));
            } else {
                tag._id = +tag._id;
                tag.articles = +tag.articles;
                tag.users = +tag.users;
                callback(null, tag);
            }
        }).fail(function (defer, err) {
            callback(err);
        });
    } else {
        callback(jsGen.Err('redis tagCache request error!'));
    }
}
tagCache.index = function (start, end, callback) {
    start = start || 0;
    end = end > 1 ? end - 1 : -1;
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].zrevrange('tag.sset.index', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(function (defer, err) {
        callback(err);
    });
};
tagCache.index.total = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].zcard('tag.sset.index', defer);
    }).then(function (defer, total) {
        callback(null, +total);
    }).fail(function (defer, err) {
        callback(err);
    });
};
tagCache.get = function (name, callback) {
    callback = callback || callbackFn;

    if (name) {
        then(function (defer) {
            client[globalCacheDb].get(('tag.str.' + name).toLowerCase(), defer);
        }).then(function (defer, _id) {
            callback(_id > 0 ? null : jsGen.Err('redis tag not exist!'), +_id);
        }).fail(function (defer, err) {
            callback(err);
        });
    } else {
        callback(jsGen.Err('redis tagCache.get request error!'));
    }
};
tagCache.update = function (tagObj, callback) {
    var tag = {
        _id: 0,
        tag: '',
        articles: 0,
        users: 0
    };

    callback = callback || callbackFn;
    intersect(tag, tagObj);
    if (tag._id > 0) {
        then(function (defer) {
            client[globalCacheDb].hgetall('tag.hash.' + tag._id, defer);
        }).all(function (defer, err, old) {
            if (old && tag.tag && old.tag !== tag.tag) {
                client[globalCacheDb].del(('tag.str.' + old.tag).toLowerCase(), defer);
            } else {
                defer();
            }
        }).then(function (defer) {
            client[globalCacheDb].hmset('tag.hash.' + tag._id, tag, defer);
        }).then(function (defer) {
            client[globalCacheDb].zadd('tag.sset.index', tag.articles, tag._id, defer);
        }).then(function (defer) {
            client[globalCacheDb].set(('tag.str.' + tag.tag).toLowerCase(), tag._id, defer);
        }).then(function (defer) {
            callback(null, true);
        }).fail(function (defer, err) {
            callback(err);
        });
    } else {
        callback(jsGen.Err('redis tagCache update request error!'));
    }
};
tagCache.remove = function (_id, callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].del('tag.hash.' + _id, defer);
    }).then(function (defer) {
        client[globalCacheDb].zrem('tag.sset.index', _id, defer);
    }).then(function (defer) {
        callback(null, true);
    }).fail(function (defer, err) {
        callback(err);
    });
};
tagCache.removeAll = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].keys('tag*', defer);
    }).then(function (defer, keys) {
        if (keys.length > 0) {
            client[globalCacheDb].del(keys, defer);
        } else {
            defer(null, 0);
        }
    }).then(function (defer, num) {
        callback(null, num);
    }).fail(function (defer, err) {
        callback(err);
    });
};

function articleCache(_id, callback) {
    callback = callback || callbackFn;

    if (_id > 0) {
        then(function (defer) {
            client[globalCacheDb].hgetall('article.hash.' + _id, defer);
        }).then(function (defer, article) {
            if (!article) {
                callback(jsGen.Err('redis article not exist!'));
            } else {
                article._id = +article._id;
                article.author = +article.author;
                article.date = +article.date;
                article.display = +article.display;
                article.status = +article.status;
                article.updateTime = +article.updateTime;
                article.hots = +article.hots;
                callback(null, article);
            }
        }).fail(function (defer, err) {
            callback(err);
        });
    } else {
        callback(jsGen.Err('redis articleCache request error!'));
    }
}
articleCache.index = function (start, end, callback) {
    start = start || 0;
    end = end > 1 ? end - 1 : -1;
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].zrevrange('article.sset.index', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(function (defer, err) {
        callback(err);
    });
};
articleCache.index.total = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].zcard('article.sset.index', defer);
    }).then(function (defer, total) {
        callback(null, +total);
    }).fail(function (defer, err) {
        callback(err);
    });
};
articleCache.updateList = function (start, end, callback) {
    start = start || 0;
    end = end > 1 ? end - 1 : -1;
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].zrevrange('article.sset.updateList', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(function (defer, err) {
        callback(err);
    });
};
articleCache.hotsList = function (start, end, callback) {
    start = start || 0;
    end = end > 1 ? end - 1 : -1;
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].zrevrange('article.sset.hotsList', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(function (defer, err) {
        callback(err);
    });
};
articleCache.hotCommentsList = function (start, end, callback) {
    start = start || 0;
    end = end > 1 ? end - 1 : -1;
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].zrevrange('article.sset.hotCommentsList', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(function (defer, err) {
        callback(err);
    });
};
articleCache.update = function (articleObj, callback) {
    var article = {
        _id: 0,
        author: 0,
        display: 0,
        status: 0,
        updateTime: 0,
        date: 0,
        hots: 0
    };

    callback = callback || callbackFn;
    intersect(article, articleObj);
    if (article._id > 0) {
        then(function (defer) {
            client[globalCacheDb].hmset('article.hash.' + article._id, article, defer);
        }).then(function (defer) {
            if (article.display === 0 && article.status > -1) {
                then(function (defer2) {
                    //按提交日期排序的文章列表
                    client[globalCacheDb].zadd('article.sset.index', article.status === 2 ? (Date.now() + 604800000) : article.date, article._id, defer2);
                }).then(function (defer2) {
                    //按更新日期排序的文章列表
                    client[globalCacheDb].zadd('article.sset.updateList', article.updateTime, article._id, defer2);
                }).then(function (defer2) {
                    //按热度排序的文章列表
                    client[globalCacheDb].zadd('article.sset.hotsList', article.hots, article._id, defer);
                }).fail(defer);
            } else if (article.status === -1) {
                //按热度排序的评论列表
                client[globalCacheDb].zadd('article.sset.hotCommentsList', article.hots, article._id, defer);
            } else if (article.display > 0) {
                //删除文章
                client[globalCacheDb].zrem('article.sset.index', article._id);
                client[globalCacheDb].zrem('article.sset.updateList', article._id);
                client[globalCacheDb].zrem('article.sset.hotsList', article._id);
                defer();
            }
        }).then(function (defer) {
            callback(null, true);
        }).fail(function (defer, err) {
            callback(err);
        });
    } else {
        callback(jsGen.Err('redis articleCache update request error!'));
    }
};

articleCache.clearup = throttle(function () {
    var now = Date.now();

    then(function (defer) {
        // 移除三个月前的更新
        client[globalCacheDb].zremrangebyscore('article.sset.updateList', 0, now - 7776000000, defer);
    }).then(function (defer) {
        // 获取更新排序列表
        client[globalCacheDb].zrevrange('article.sset.updateList', 0, -1, defer);
    }).then(function (defer, list) {
        list = list || [];
        then(function (defer2) {
            client[globalCacheDb].zrevrange('article.sset.hotsList', 0, -1, defer2);
        }).then(function (defer2, hotsList) {
            //从hotsList移除三月前更新的文章，只保留三个月内更新的文章
            var outDateList = ['article.sset.hotsList'];

            each(hotsList || [], function (x) {
                if (list.indexOf(x) === -1) {
                    outDateList.push(x);
                }
            });
            if (outDateList.length > 1) {
                client[globalCacheDb].zrem(outDateList, defer2);
            } else {
                defer2();
            }
        }).then(function (defer2) {
            client[globalCacheDb].zrevrange('article.sset.hotCommentsList', 0, -1, defer2);
        }).then(function (defer2, hotCommentsList) {
            // 从hotCommentsList移除一个月前更新的评论，只保留一个月内更新的评论
            var outDateList = ['article.sset.hotCommentsList'];
            then.each(hotCommentsList, function (next, x) {
                client[globalCacheDb].hgetall('article.hash.' + x, function (err, comment) {
                    if (!comment || now - comment.updateTime > 2592000000) {
                        outDateList.push(x);
                    }
                    return next ? next() : (outDateList.length > 1 ? client[globalCacheDb].zrem(outDateList, defer2) : defer2());
                });
            });
        }).fail(defer);
    });
}, 300000); // 每五分钟内最多执行一次

articleCache.removeAll = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client[globalCacheDb].keys('article*', defer);
    }).then(function (defer, keys) {
        if (keys.length > 0) {
            client[globalCacheDb].del(keys, defer);
        } else {
            defer(null, 0);
        }
    }).then(function (defer, num) {
        callback(null, num);
    }).fail(function (defer, err) {
        callback(err);
    });
};

module.exports = {
    redis: redis,
    client: client,
    tagCache: tagCache,
    userCache: userCache,
    onlineCache: onlineCache,
    articleCache: articleCache,
    TimeLimitCache: TimeLimitCache,
    initConfig: initConfig
};