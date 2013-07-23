'use strict';
/*global require, module, Buffer, jsGen*/

var callback;

function global() {
    jsGen.dao.db.createCollection("global", {
        w: 1
    }, function (err, collection) {
        if (err) {
            throw err;
        }
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
        collection.findOne({
            _id: 'GlobalConfig'
        }, function (err, doc) {
            if (err) {
                throw err;
            }
            if (!doc) {
                jsGen.dao.index.initGlobalConfig(articles);
            }
        });
    });
}

function articles() {
    jsGen.dao.db.createCollection("articles", {
        w: 1
    }, function (err, collection) {
        if (err) {
            throw err;
        }
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
        jsGen.dao.db.command({
            collMod: "articles",
            usePowerOf2Sizes: true
        }, collections);
    });
}

function collections() {
    jsGen.dao.db.createCollection("collections", {
        w: 1
    }, function (err, collection) {
        if (err) {
            throw err;
        }
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
        jsGen.dao.db.command({
            collMod: "collections",
            usePowerOf2Sizes: true
        }, messages);
    });
}

function messages() {
    jsGen.dao.db.createCollection("messages", {
        w: 1
    }, function (err, collection) {
        if (err) {
            throw err;
        }
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
        jsGen.dao.db.command({
            collMod: "messages",
            usePowerOf2Sizes: true
        }, tags);
    });
}

function tags() {
    jsGen.dao.db.createCollection("tags", {
        w: 1
    }, function (err, collection) {
        if (err) {
            throw err;
        }
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
        jsGen.dao.db.command({
            collMod: "tags",
            usePowerOf2Sizes: true
        }, users);
    });
}

function users() {
    jsGen.dao.db.createCollection("users", {
        w: 1
    }, function (err, collection) {
        if (err) {
            throw err;
        }
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        });
        jsGen.dao.db.command({
            collMod: "users",
            usePowerOf2Sizes: true
        }, function (err, doc) {
            var _id = jsGen.dao.user.convertID('Uadmin');
            collection.findOne({
                _id: _id
            }, function (err, doc) {
                if (err) {
                    throw err;
                }
                if (!doc) {
                    jsGen.dao.user.setNewUser({
                        _id: jsGen.dao.user.convertID('Uadmin'), // 超级管理员的用户Uid，请勿修改
                        name: 'admin', // 超级管理员的用户名，请勿修改
                        email: 'admin@zensh.com', // 超级管理员的邮箱，请自行修改
                        passwd: jsGen.lib.tools.SHA256('admin@zensh.com'), // 超级管理员的初始密码，请自行修改
                        role: 5, // 超级管理员最高权限，请勿修改
                        avatar: jsGen.lib.tools.gravatar('admin@zensh.com'), // 超级管理员的gravatar头像，请自行修改
                        desc: '梦造互联网 By ZENSH' // 超级管理员的个人简介，请自行修改
                    }, callback);
                }
            });
        });
    });
}

function install(cb) {
    callback = cb || jsGen.lib.tools.callbackFn;
    global();
}

module.exports = install;