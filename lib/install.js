'use strict';
/*global require, module, Buffer, jsGen*/

var then = jsGen.module.then,
    dao = jsGen.dao,
    db = dao.db;

module.exports = function () {
    return then(function (cont) {
        db.createCollection('global', {
            w: 1
        }, cont);
    }).then(function (cont, collection) {
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        }, cont);
    }).then(function (cont) {
        dao.index.initGlobalConfig(cont);
    }).then(function (cont, config) {
        db.createCollection("articles", {
            w: 1
        }, cont);
    }).then(function (cont, collection) {
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        }, cont);
    }).then(function (cont) {
        db.command({
            collMod: "articles",
            usePowerOf2Sizes: true
        }, cont);
    }).then(function (cont) {
        db.createCollection("collections", {
            w: 1
        }, cont);
    }).then(function (cont, collection) {
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        }, cont);
    }).then(function (cont) {
        db.command({
            collMod: "collections",
            usePowerOf2Sizes: true
        }, cont);
    }).then(function (cont) {
        db.createCollection("messages", {
            w: 1
        }, cont);
    }).then(function (cont, collection) {
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        }, cont);
    }).then(function (cont) {
        db.command({
            collMod: "messages",
            usePowerOf2Sizes: true
        }, cont);
    }).then(function (cont) {
        db.createCollection("tags", {
            w: 1
        }, cont);
    }).then(function (cont, collection) {
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        }, cont);
    }).then(function (cont) {
        db.command({
            collMod: "tags",
            usePowerOf2Sizes: true
        }, cont);
    }).then(function (cont) {
        db.createCollection("users", {
            w: 1
        }, cont);
    }).then(function (cont, collection) {
        collection.ensureIndex({
            _id: -1
        }, {
            background: true
        }, cont);
    }).then(function (cont) {
        db.command({
            collMod: "users",
            usePowerOf2Sizes: true
        }, cont);
    }).then(function (cont) {
        var passwd = jsGen.lib.tools.SHA256('admin@jsgen.org'); // 超级管理员的初始密码，请自行修改
        passwd = jsGen.lib.tools.HmacSHA256(passwd, 'jsGen');
        dao.user.setNewUser({
            _id: dao.user.convertID('Uadmin'), // 超级管理员的用户Uid，请勿修改
            name: 'admin', // 超级管理员的用户名，请勿修改
            email: 'admin@jsgen.org', // 超级管理员的邮箱，请自行修改
            passwd: passwd,
            role: 5, // 超级管理员最高权限，请勿修改
            avatar: jsGen.lib.tools.gravatar('admin@jsgen.org'), // 超级管理员的gravatar头像，请自行修改
            desc: '梦造互联网 By ZENSH' // 超级管理员的个人简介，请自行修改
        }, cont);
    });
};
