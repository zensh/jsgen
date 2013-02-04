var userDao = require('../dao/userDao.js'),
    globalDao = require('../dao/globalDao.js'),
    db = require('../dao/mongoDao.js').db,
    errlog = require('rrestjs').restlog,
    checkEmail = require('../lib/tools.js').checkEmail,
    checkUserID = require('../lib/tools.js').checkUserID,
    checkUserName = require('../lib/tools.js').checkUserName,
    HmacSHA256 = require('../lib/tools.js').HmacSHA256,
    SHA256 = require('../lib/tools.js').SHA256,
    gravatar = require('../lib/tools.js').gravatar,
    userErr = require('./errmsg.js').userErr;

function getFn(req, res) {
    db.createCollection("articles", {
        w: 1
    }, function(err, collection) {
        db.command({
            collMod: "articles",
            usePowerOf2Sizes: true
        });
        collection.ensureIndex({
            _id: -1,
            hots: -1
        }, {
            background: true
        });
    });

    db.createCollection("collections", {
        w: 1
    }, function(err, collection) {
        db.command({
            collMod: "collections",
            usePowerOf2Sizes: true
        });
        collection.ensureIndex({
            _id: -1,
            updateTime: -1
        }, {
            background: true
        });
    });

    db.createCollection("comments", {
        w: 1
    }, function(err, collection) {
        collection.ensureIndex({
            _id: -1,
            favors: -1
        }, {
            background: true
        });
    });

    db.createCollection("messages", {
        w: 1
    }, function(err, collection) {
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
    });

    db.createCollection("tags", {
        w: 1
    }, function(err, collection) {
        db.command({
            collMod: "tags",
            usePowerOf2Sizes: true
        });
        collection.ensureIndex({
            _id: -1,
            updateTime: -1
        }, {
            background: true
        });
    });

    db.createCollection("global", {
        w: 1
    }, function(err, collection) {
        db.command({
            collMod: "global",
            usePowerOf2Sizes: true
        });
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
        globalDao.initGlobalConfig();
        globalDao.newVisitHistory();
    });

    db.createCollection("users", {
        w: 1
    }, function(err, collection) {
        db.command({
            collMod: "users",
            usePowerOf2Sizes: true
        });
        collection.ensureIndex({
            _id: -1,
            score: -1
        }, {
            background: true
        });
    });

    userDao.setNewUser({
        _id: userDao.convertID('Uadmin'),
        name: 'admin',
        email: 'admin@zensh.com',
        passwd: SHA256('admin123'),
        role: 'admin',
        avatar: gravatar('admin@zensh.com'),
        desc: '梦造互联网 By ZENSH'
    }, function(err, doc) {
        db.close();
        res.sendjson(doc);
    });

};

function postFn(req, res) {};

module.exports = {
    GET: getFn,
    POST: postFn
};
//getFn();
