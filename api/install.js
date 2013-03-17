function global() {
    jsGen.dao.db.createCollection("global", {
        w: 1
    }, function (err, collection) {
        if (err) throw err;
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
        jsGen.dao.index.initGlobalConfig(articles);
    });
};

function articles() {
    jsGen.dao.db.createCollection("articles", {
        w: 1
    }, function (err, collection) {
        if (err) throw err;
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
        collections();
    });
};

function collections() {
    jsGen.dao.db.createCollection("collections", {
        w: 1
    }, function (err, collection) {
        if (err) throw err;
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
        messages();
    });
};

function messages() {
    jsGen.dao.db.createCollection("messages", {
        w: 1
    }, function (err, collection) {
        if (err) throw err;
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
        tags();
    });
};

function tags() {
    jsGen.dao.db.createCollection("tags", {
        w: 1
    }, function (err, collection) {
        if (err) throw err;
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
        users();
    });
};

function users() {
    jsGen.dao.db.createCollection("users", {
        w: 1
    }, function (err, collection) {
        if (err) throw err;
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
        jsGen.dao.user.setNewUser({
            _id: jsGen.dao.user.convertID('Uadmin'),
            name: 'admin',
            email: 'admin@zensh.com',
            passwd: jsGen.lib.tools.SHA256('admin@zensh.com'),
            role: 'admin',
            avatar: jsGen.lib.tools.gravatar('admin@zensh.com'),
            desc: '梦造互联网 By ZENSH'
        }, function (err, doc) {
            if (err) throw err;
            if (doc) {
                console.log(doc);
                console.log('Ready!!!');
            }
        });
    });
}

function install() {
    global();
};

module.exports = install;
