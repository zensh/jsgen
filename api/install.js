var userDao = require('../dao/userDao.js'),
    globalDao = require('../dao/globalDao.js'),
    checkEmail = jsGen.tools.checkEmail,
    checkUserID = jsGen.tools.checkUserID,
    checkUserName = jsGen.tools.checkUserName,
    HmacSHA256 = jsGen.tools.HmacSHA256,
    SHA256 = jsGen.tools.SHA256,
    gravatar = jsGen.tools.gravatar;

function getFn(req, res) {
    jsGen.db.createCollection("articles", {
        w: 1
    }, function(err, collection) {
        jsGen.db.command({
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

    jsGen.db.createCollection("collections", {
        w: 1
    }, function(err, collection) {
        jsGen.db.command({
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

    // jsGen.db.createCollection("comments", {
    //     w: 1
    // }, function(err, collection) {
    //     collection.ensureIndex({
    //         _id: -1,
    //         favors: -1
    //     }, {
    //         background: true
    //     });
    // });

    jsGen.db.createCollection("messages", {
        w: 1
    }, function(err, collection) {
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
    });

    jsGen.db.createCollection("tags", {
        w: 1
    }, function(err, collection) {
        jsGen.db.command({
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

    jsGen.db.createCollection("global", {
        w: 1
    }, function(err, collection) {
        jsGen.db.command({
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

    jsGen.db.createCollection("users", {
        w: 1
    }, function(err, collection) {
        jsGen.db.command({
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
        passwd: SHA256('admin@zensh.com'),
        role: 'admin',
        avatar: gravatar('admin@zensh.com'),
        desc: '梦造互联网 By ZENSH'
    }, function(err, doc) {
        jsGen.db.close();
        res.sendjson(doc);
    });

};

function postFn(req, res) {};

module.exports = {
    GET: getFn,
    POST: postFn
};
//getFn();
