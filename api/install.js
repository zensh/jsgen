var checkEmail = jsGen.lib.tools.checkEmail,
    checkUserID = jsGen.lib.tools.checkUserID,
    checkUserName = jsGen.lib.tools.checkUserName,
    HmacSHA256 = jsGen.lib.tools.HmacSHA256,
    SHA256 = jsGen.lib.tools.SHA256,
    gravatar = jsGen.lib.tools.gravatar;

function getFn(req, res) {
    jsGen.dao.db.createCollection("articles", {
        w: 1
    }, function(err, collection) {
        jsGen.dao.db.command({
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

    jsGen.dao.db.createCollection("collections", {
        w: 1
    }, function(err, collection) {
        jsGen.dao.db.command({
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

    // jsGen.dao.db.createCollection("comments", {
    //     w: 1
    // }, function(err, collection) {
    //     collection.ensureIndex({
    //         _id: -1,
    //         favors: -1
    //     }, {
    //         background: true
    //     });
    // });

    jsGen.dao.db.createCollection("messages", {
        w: 1
    }, function(err, collection) {
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
    });

    jsGen.dao.db.createCollection("tags", {
        w: 1
    }, function(err, collection) {
        jsGen.dao.db.command({
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

    jsGen.dao.db.createCollection("global", {
        w: 1
    }, function(err, collection) {
        jsGen.dao.db.command({
            collMod: "global",
            usePowerOf2Sizes: true
        });
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
        jsGen.dao.index.initGlobalConfig();
        jsGen.dao.index.newVisitHistory();
    });

    jsGen.dao.db.createCollection("users", {
        w: 1
    }, function(err, collection) {
        jsGen.dao.db.command({
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

    jsGen.dao.user.setNewUser({
        _id: jsGen.dao.user.convertID('Uadmin'),
        name: 'admin',
        email: 'admin@zensh.com',
        passwd: SHA256('admin@zensh.com'),
        role: 'admin',
        avatar: gravatar('admin@zensh.com'),
        desc: '梦造互联网 By ZENSH'
    }, function(err, doc) {
        jsGen.dao.db.close();
        res.sendjson(doc);
    });

};

function postFn(req, res) {};

module.exports = {
    GET: getFn,
    POST: postFn
};
//getFn();
