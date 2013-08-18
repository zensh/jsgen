'use strict';
/*global require, module, Buffer, jsGen*/
var redisIp = jsGen.conf.RedisIp || '127.0.0.1',
    redisPort = jsGen.conf.RedisPort || 6379,
    redisDbBegin = jsGen.conf.RedisDefaultDb || 1,
    globalCacheDb = redisDbBegin,
    onlineCacheDb = redisDbBegin + 1,
    onlineUserCacheDb = redisDbBegin + 2,
    TimeLimitCacheId = 0,
    each = jsGen.lib.tools.each,
    callbackFn = jsGen.lib.tools.callbackFn,
    errorHandler = jsGen.lib.tools.errorHandler,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    then = jsGen.module.then,
    redis = require('redis'),
    client = redis.createClient(redisPort, redisIp, {
        detect_buffers: true,
        connect_timeout: 3000
    });

client.on('ready', function () {
    console.log('Redis connected: ' + redisIp + ':' + redisPort + ', DB Begin: ' + redisDbBegin);
});

function TimeLimitCache(timeLimit, type, name, getUpdate) {
    var method = {
        string: ['get', 'set'],
        array: ['lrange', 'lpush'],
        object: ['hgetall', 'hmset']
    };
    this.name = 'tlCache.' + (name || TimeLimitCacheId++) + '.';
    this.getUpdate = !! getUpdate;
    this.method = method[type || 'string'];
    this.timeLimit = +timeLimit || 60;
}

TimeLimitCache.prototype.get = function (key, callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        var get = this.method[0];
        if (this.getUpdate) {
            client.expire(this.name + key, this.timeLimit);
        }
        if (get === 'lrange') {
            client[get](this.name + key, 0, -1, callback);
        } else {
            client[get](this.name + key, callback);
        }
    }).fail(callback);
};
TimeLimitCache.prototype.put = function (key, value, callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.del(this.name + key, defer);
    }).then(function (defer) {
        client[this.method[1]](this.name + key, value, defer);
    }).then(function (defer) {
        client.expire(this.name + key, this.timeLimit, callback);
    }).fail(callback);
};
TimeLimitCache.prototype.remove = function (key, callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.del(this.name + key, callback);
    }).fail(callback);
};
TimeLimitCache.prototype.removeAll = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.keys(this.name, defer);
    }).then(function (defer, keys) {
        if (keys.length > 0) {
            client.del(keys, defer);
        } else {
            defer(null, 0);
        }
    }).then(function (defer, num) {
        callback(null, num);
    }).fail(callback);
};
TimeLimitCache.prototype.info = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.keys(this.name, defer);
    }).then(function (defer, keys) {
        keys = keys || [];
        callback(null, {
            name: this.name,
            timeLimit: this.timeLimit,
            length: keys.length
        });
    }).fail(callback);
};

function onlineCache(req, callback) {
    var size = 0,
        db = req.session.Uid ? onlineUserCacheDb : onlineCacheDb,
        anotherDb = req.session.Uid ? onlineCacheDb : onlineUserCacheDb,
        key = req.session.Uid || req.session._restsid;

    callback = callback || callbackFn;
    if (key) {
        then(function (defer) {
            client.select(db, defer);
        }).then(function (defer) {
            client.setex(key, 600, '', defer);
        }).then(function (defer) {
            client.dbsize(defer);
        }).then(function (defer, reply) {
            size = reply;
            client.select(anotherDb, defer);
        }).then(function (defer) {
            client.dbsize(defer);
        }).then(function (defer, reply) {
            callback(null, db === onlineUserCacheDb ? size : reply, size + reply);
        }).fail(callback);
    } else {
        callback(jsGen.Err('redis onlineCache request error!'));
    }
}

function userCache(_id, callback) {
    callback = callback || callbackFn;

    if (_id >= 0) {
        then(function (defer) {
            client.select(globalCacheDb, defer);
        }).then(function (defer) {
            client.hgetall('user.hash.' + _id, defer);
        }).then(function (defer, user) {
            if (!user) {
                callback(jsGen.Err('redis user not exist!'));
            } else {
                user._id = +user._id;
                callback(null, user);
            }
        }).fail(callback);
    } else {
        callback(jsGen.Err('redis userCache request error!'));
    }
}
userCache.index = function (callback, start, end) {
    start = start || 0;
    end = end || 50;
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.zrevrange('user.sset.index', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(callback);
};
userCache.index.total = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.scard('user.set.index', defer);
    }).then(function (defer, total) {
        callback(null, +total);
    }).fail(callback);
};
userCache.get = function (name, callback) {
    callback = callback || callbackFn;

    if (name) {
        then(function (defer) {
            client.select(globalCacheDb, defer);
        }).then(function (defer) {
            client.get('user.str.' + name.toLowerCase(), defer);
        }).then(function (defer, _id) {
            callback(_id >= 0 ? null : jsGen.Err('redis user not exist!'), +_id);
        }).fail(callback);
    } else {
        callback(jsGen.Err('redis userCache.get request error!'));
    }
};
userCache.update = function (userObj, callback) {
    var user = {
        _id: 0,
        name: '',
        email: '',
        avatar: ''
    };

    callback = callback || callbackFn;
    intersect(user, userObj);
    if (user._id >= 0) {
        then(function (defer) {
            client.select(globalCacheDb, defer);
        }).then(function (defer) {
            client.hgetall('user.hash.' + user._id, defer);
        }).all(function (defer, err, old) {
            if (old) {
                then(function (defer2) {
                    if (user.name && old.name !== user.name) {
                        client.del('user.str.' + old.name.toLowerCase(), defer2);
                    } else {
                        defer2();
                    }
                }).then(function (defer2) {
                    if (user.email && old.email !== user.email) {
                        client.del('user.str.' + old.email.toLowerCase(), defer);
                    } else {
                        defer();
                    }
                }).fail(function (err) {
                    defer();
                });
            } else {
                defer();
            }
        }).then(function (defer) {
            client.hmset('user.hash.' + user._id, user, defer);
        }).then(function (defer) {
            client.zadd('user.sset.index', user._id, user._id, defer);
        }).then(function (defer) {
            client.set('user.str.' + user.name.toLowerCase(), user._id, defer);
        }).then(function (defer) {
            client.set('user.str.' + user.email.toLowerCase(), user._id, defer);
        }).then(function (defer) {
            callback(null, true);
        }).fail(callback);
    } else {
        callback(jsGen.Err('redis userCache update request error!'));
    }
};
userCache.removeAll = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.keys('user*', defer);
    }).then(function (defer, keys) {
        if (keys.length > 0) {
            client.del(keys, defer);
        } else {
            defer(null, 0);
        }
    }).then(function (defer, num) {
        callback(null, num);
    }).fail(callback);
};

function tagCache(_id, callback) {
    callback = callback || callbackFn;

    if (_id >= 0) {
        then(function (defer) {
            client.select(globalCacheDb, defer);
        }).then(function (defer) {
            client.hgetall('tag.hash.' + _id, defer);
        }).then(function (defer, tag) {
            if (!tag) {
                callback(jsGen.Err('redis tag not exist!'));
            } else {
                tag._id = +tag._id;
                callback(null, tag);
            }
        }).fail(callback);
    } else {
        callback(jsGen.Err('redis tagCache request error!'));
    }
}
tagCache.index = function (callback, start, end) {
    start = start || 0;
    end = end || 20;
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.zrevrange('tag.sset.index', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(callback);
};
tagCache.index.total = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.zcard('tag.sset.index', defer);
    }).then(function (defer, total) {
        callback(null, +total);
    }).fail(callback);
};
tagCache.get = function (name, callback) {
    callback = callback || callbackFn;

    if (name) {
        then(function (defer) {
            client.select(globalCacheDb, defer);
        }).then(function (defer) {
            client.get('tag.str.' + name.toLowerCase(), defer);
        }).then(function (defer, _id) {
            callback(_id >= 0 ? null : jsGen.Err('redis tag not exist!'), +_id);
        }).fail(callback);
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
    if (tag._id >= 0) {
        then(function (defer) {
            client.select(globalCacheDb, defer);
        }).then(function (defer) {
            client.hgetall('tag.hash.' + tag._id, defer);
        }).all(function (defer, err, old) {
            if (old && tag.tag && old.tag !== tag.tag) {
                client.del('tag.str.' + old.tag.toLowerCase(), function () {
                    defer();
                });
            } else {
                defer();
            }
        }).then(function (defer) {
            client.hmset('tag.hash.' + tag._id, tag, defer);
        }).then(function (defer) {
            client.zadd('tag.sset.index', tag.articles, tag._id, defer);
        }).then(function (defer) {
            client.set('tag.str.' + tag.tag.toLowerCase(), tag._id, defer);
        }).then(function (defer) {
            callback(null, true);
        }).fail(callback);
    } else {
        callback(jsGen.Err('redis tagCache update request error!'));
    }
};
tagCache.remove = function (_id, callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.del('tag.hash.' + _id, defer);
    }).then(function (defer) {
        client.zrem('tag.sset.index', _id, defer);
    }).then(function (defer) {
        callback(null, true);
    }).fail(callback);
};
tagCache.removeAll = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.keys('tag*', defer);
    }).then(function (defer, keys) {
        if (keys.length > 0) {
            client.del(keys, defer);
        } else {
            defer(null, 0);
        }
    }).then(function (defer, num) {
        callback(null, num);
    }).fail(callback);
};

function articleCache(_id, callback) {
    callback = callback || callbackFn;

    if (_id >= 0) {
        then(function (defer) {
            client.select(globalCacheDb, defer);
        }).then(function (defer) {
            client.hgetall('article.hash.' + _id, defer);
        }).then(function (defer, article) {
            if (!article) {
                callback(jsGen.Err('redis article not exist!'));
            } else {
                article._id = +article._id;
                callback(null, article);
            }
        }).fail(callback);
    } else {
        callback(jsGen.Err('redis articleCache request error!'));
    }
}
articleCache.index = function (callback, start, end) {
    start = start || 0;
    end = end || 20;
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.zrevrange('article.sset.index', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(callback);
};
articleCache.index.total = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.zcard('article.sset.index', defer);
    }).then(function (defer, total) {
        callback(null, +total);
    }).fail(callback);
};
articleCache.updateList = function (callback, start, end) {
    start = start || 0;
    end = end || 20;
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.zrevrange('article.sset.updateList', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(callback);
};
articleCache.hotsList = function (callback, start, end) {
    start = start || 0;
    end = end || 20;
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.zrevrange('article.sset.hotsList', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(callback);
};
articleCache.hotCommentsList = function (callback, start, end) {
    start = start || 0;
    end = end || 20;
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.zrevrange('article.sset.hotCommentsList', start, end, defer);
    }).then(function (defer, list) {
        callback(null, list || []);
    }).fail(callback);
};
articleCache.update = function (articleObj, callback) {
    var now = Date.now(),
        article = {
            _id: 0,
            display: 0,
            status: 0,
            updateTime: 0,
            date: 0,
            hots: 0
        };

    callback = callback || callbackFn;
    intersect(article, articleObj);
    if (article._id >= 0) {
        then(function (defer) {
            client.select(globalCacheDb, defer);
        }).then(function (defer) {
            client.hmset('article.hash.' + article._id, article, defer);
        }).then(function (defer) {
            if (article.display < 2 && article.status > -1) {
                then(function (defer2) {
                    //按提交日期排序的文章列表
                    client.zadd('article.sset.index', article.status === 2 ? (now + 604800000) : article.date, article._id, defer2);
                }).then(function (defer2) {
                    //按更新日期排序的文章列表
                    client.zadd('article.sset.updateList', article.updateTime, article._id, defer2);
                }).then(function (defer2) {
                    //按热度排序的文章列表
                    client.zadd('article.sset.hotsList', article.hots, article._id, defer);
                }).fail(defer);
            } else if (article.status === -1) {
                //按热度排序的评论列表
                client.zadd('article.sset.hotCommentsList', article.hots, article._id, defer);
            } else if (article.display >= 2) {
                //删除文章
                client.zrem('article.sset.index', article._id);
                client.zrem('article.sset.updateList', article._id);
                client.zrem('article.sset.hotsList', article._id);
                defer();
            }
        }).then(function (defer) {
            then(function (defer2) {
                // 移除一个月前的更新
                client.zremrangebyscore('article.sset.updateList', 0, now - 2592000000, defer2);
            }).then(function (defer2) {
                // 获取更新排序列表
                client.zrevrange('article.sset.updateList', 0, -1, defer2);
            }).then(function (defer2, list) {
                list = list || [];
                then(function (defer3) {
                    client.zrevrange('article.sset.hotsList', 0, -1, defer3);
                }).then(function (defer3, hotsList) {
                    //从hotsList移除一月前更新的文章，只保留一个月内更新的文章
                    each(hotsList || [], function (x) {
                        var index = list.indexOf(x);
                        if (index === -1) {
                            client.zrem('article.sset.hotsList', x);
                        } else {
                            list.splice(index, 1);
                        }
                    });
                    client.zrank('article.sset.hotCommentsList', 0, -1, defer3);
                }).then(function (defer3, hotCommentsList) {
                    //从hotCommentsList移除一星期前更新的评论，只保留一星期内更新的评论
                    each(hotCommentsList, function (x) {
                        client.hgetall('article.hash.' + x, function (err, comment) {
                            if (!comment || now - comment.updateTime > 604800000) {
                                client.zrem('article.sset.hotCommentsList', x);
                            }
                        });
                    });
                    defer();
                }).fail(defer);
            }).fail(defer);
        }).then(function (defer) {
            callback(null, true);
        }).fail(callback);
    } else {
        callback(jsGen.Err('redis articleCache update request error!'));
    }
};

articleCache.removeAll = function (callback) {
    callback = callback || callbackFn;
    then(function (defer) {
        client.select(globalCacheDb, defer);
    }).then(function (defer) {
        client.keys('article*', defer);
    }).then(function (defer, keys) {
        if (keys.length > 0) {
            client.del(keys, defer);
        } else {
            defer(null, 0);
        }
    }).then(function (defer, num) {
        callback(null, num);
    }).fail(callback);
};

module.exports = {
    redis: redis,
    TimeLimitCache: TimeLimitCache,
    onlineCache: onlineCache,
    userCache: userCache,
    tagCache: tagCache,
    articleCache: articleCache
};