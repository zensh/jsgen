'use strict';
/*global require, module, Buffer, jsGen*/
var redisIp = jsGen.conf.RedisIp || '127.0.0.1',
    redisPort = jsGen.conf.RedisPort || 6379,
    redisDbBegin = jsGen.conf.RedisDefaultDb || 1,
    onlineCacheDb = redisDbBegin + 0,
    onlineUserCacheDb = redisDbBegin + 1,
    then = jsGen.lib.tools.then,
    callbackFn = jsGen.lib.tools.callbackFn,
    redis = require('redis'),
    client = redis.createClient(redisPort, redisIp);

client.on('ready', function () {
    console.log('Redis connected: ' + redisIp + ':' + redisPort + ', DB Begin: ' + redisDbBegin);
});

function onlineCache(req, callback) {
    var size = 0,
        db = req.session.Uid ? onlineUserCacheDb : onlineCacheDb,
        anotherDb = req.session.Uid ? onlineCacheDb : onlineUserCacheDb,
        key = req.session.Uid || req.session._restsid;

    function errorFn(defer, err) {
        callback(err);
    }

    callback = callback || callbackFn;
    if (key) {
        then(function (defer) {
            client.select(db, defer);
        }).
        then(function (defer) {
            client.setex(key, 600, '', defer);
        }, errorFn).
        then(function (defer) {
            client.dbsize(defer);
        }, errorFn).
        then(function (defer, reply) {
            size = reply;
            client.select(anotherDb, defer);
        }, errorFn).
        then(function (defer) {
            client.dbsize(defer);
        }, errorFn).
        then(function (defer, reply) {
            callback(null, db === onlineUserCacheDb ? size : reply, size + reply);
        }, errorFn);
    } else {
        callback(jsGen.Err('Request error!'));
    }
}

module.exports = {
    redis: redis,
    onlineCache: onlineCache
};