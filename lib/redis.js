'use strict';
/*global require, module, Buffer, jsGen*/
var redisIp = jsGen.conf.RedisIp || '127.0.0.1',
    redisPort = jsGen.conf.RedisPort || 6379,
    globalCacheDb = jsGen.conf.RedisDefaultDb || 1,
    onlineCacheDb = globalCacheDb + 1,
    onlineUserCacheDb = globalCacheDb + 2,
    TimeLimitCacheId = 0,
    MD5 = jsGen.lib.tools.MD5,
    each = jsGen.lib.tools.each,
    callbackFn = jsGen.lib.tools.callbackFn,
    errorHandler = jsGen.lib.tools.errorHandler,
    union = jsGen.lib.tools.union,
    throttle = jsGen.lib.tools.throttle,
    intersect = jsGen.lib.tools.intersect,
    then = jsGen.module.then,
    redis = require('redis'),
    client = {};

each([globalCacheDb, onlineCacheDb, onlineUserCacheDb], function (x) {
    client[x] = redis.createClient(redisPort, redisIp, {
        detect_buffers: true,
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
        client[globalCacheDb].keys(that.name, defer);
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
        client[globalCacheDb].keys(that.name, defer);
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

    if (_id >= 0) {
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
            callback(_id >= 0 ? null : jsGen.Err('redis user not exist!'), +_id);
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
    if (user._id >= 0) {
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

    if (_id >= 0) {
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
            callback(_id >= 0 ? null : jsGen.Err('redis tag not exist!'), +_id);
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
    if (tag._id >= 0) {
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

    if (_id >= 0) {
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
        // 移除一个月前的更新
        client[globalCacheDb].zremrangebyscore('article.sset.updateList', 0, now - 2592000000, defer);
    }).then(function (defer) {
        // 获取更新排序列表
        client[globalCacheDb].zrevrange('article.sset.updateList', 0, -1, defer);
    }).then(function (defer, list) {
        list = list || [];
        then(function (defer2) {
            client[globalCacheDb].zrevrange('article.sset.hotsList', 0, -1, defer2);
        }).then(function (defer2, hotsList) {
            //从hotsList移除一月前更新的文章，只保留一个月内更新的文章
            var outDateList = [];
            each(hotsList || [], function (x) {
                if (list.indexOf(x) === -1) {
                    outDateList.push(x);
                }
            });
            client[globalCacheDb].zrem('article.sset.hotsList', outDateList, defer2);
        }).then(function (defer2) {
            client[globalCacheDb].zrevrange('article.sset.hotCommentsList', 0, -1, defer2);
        }).then(function (defer2, hotCommentsList) {
            // 从hotCommentsList移除一星期前更新的评论，只保留一星期内更新的评论
            var outDateList = [];
            then.each(hotCommentsList, function (next, x) {
                client[globalCacheDb].hgetall('article.hash.' + x, function (err, comment) {
                    if (!comment || now - comment.updateTime > 604800000) {
                        outDateList.push(x);
                    }
                    return next ? next() : defer2(null, outDateList);
                });
            });
        }).then(function (defer2, outDateList) {
            client[globalCacheDb].zrem('article.sset.hotCommentsList', outDateList, defer2);
        }).fail(defer);
    });
}, 30000);

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
    TimeLimitCache: TimeLimitCache
};