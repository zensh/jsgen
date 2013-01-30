var userDao = require('../dao/userDao.js'),
    articleDao = require('../dao/articleDao.js'),
    collectionDao = require('../dao/collectionDao.js'),
    commentDao = require('../dao/commentDao.js'),
    messageDao = require('../dao/messageDao.js'),
    tagDao = require('../dao/tagDao.js'),
    db = require('../dao/mongoDao.js').db,
    errlog = require('rrestjs').restlog,
    checkEmail = require('../lib/tools.js').checkEmail,
    checkUserID = require('../lib/tools.js').checkUserID,
    checkUserName = require('../lib/tools.js').checkUserName,
    HmacSHA256 = require('../lib/tools.js').HmacSHA256,
    Err = require('./errmsg.js');

var cache = {
    Uid: [],
    name: [],
    email: [],
    avatar: []
};
cache.init = function() {
    this.Uid = [];
    this.name = [];
    this.email = [];
    this.avatar = [];
    var that = this;
    userDao.getUsersIndex(function(err, doc) {
        if(err) return errlog.error(err);
        if(doc === null) return that;
        else that.update(doc);
        return that;
    });
};
cache.update = function(obj) {
    var Uid = userDao.convertID(obj._id);
    var index = this.Uid.indexOf(Uid);
    if(index >= 0) {
        this.name[index] = obj.name;
        this.email[index] = obj.email;
        this.avatar[index] = obj.avatar;
    } else {
        this.Uid.push(Uid);
        this.name.push(obj.name);
        this.email.push(obj.email);
        this.avatar.push(obj.avatar);
    }
    return this;
};
cache.getidByEmail = function(str) {
    var index = this.email.indexOf(str);
    if(index === -1) return Err.userEmailNone;
    return userDao.convertID(this.Uid[index]);
};
cache.getidByName = function(str) {
    var index = this.name.indexOf(str);
    if(index === -1) return Err.userNameNone;
    return userDao.convertID(this.Uid[index]);
};
cache.getByid = function(num) {
    var Uid = userDao.convertID(num);
    var index = this.Uid.indexOf(Uid);
    if(index === -1) return Err.UidNone;
    return {
        Uid: Uid,
        name: this.name[index],
        email: this.email[index],
        avatar: this.avatar[index]
    };
};

function login(req, res) {
    console.log(req.bodyparam);
    var data = JSON.parse(req.bodyparam);
    var _id = 0,
        loginBy = null,
        body = {};

    if(checkEmail(data.logname)) {
        _id = cache.getidByEmail(data.logname);
        loginBy = data.logname;
    } else if(checkUserID(data.logname)) {
        _id = userDao.convertID(data.logname);
        if(typeof cache.getByid(_id) === 'string') _id = cache.getByid(_id);
        loginBy = data.logname;
    } else if(checkUserName(data.logname)) {
        _id = cache.getidByName(data.logname);
        loginBy = data.logname;
    }

    if(typeof _id === 'number') {
        userDao.getAuth(_id, function(err, doc) {
            if(err) {
                body.err = Err.dbErr;
                return errlog.error(err);
            } else if(doc.locked) {
                body.err = Err.userLocked;
                return;
            } else if(doc.loginAttempts >= 5) {
                body.err = Err.loginAttempts;
                userDao.setUserInfo({
                    _id: doc._id,
                    locked: true
                }, function(err, doc) {
                    if(err) return errlog.error(err);
                    return userDao.setLoginAttempt({
                        _id: doc._id,
                        loginAttempts: 0
                    });
                });
                return;
            }
            if(data.logpwd === HmacSHA256(doc.passwd, loginBy)) {
                req.session.Uid = body._id = userDao.convertID(doc._id);
                req.session.avatar = body.avatar = doc.avatar;
                req.session.email = body.email = doc.email;
                req.session.name = body.name = doc.name;
                req.session.role = body.role = doc.role;
                var date = Date.now();
                userDao.setLogin({
                    _id: doc._id,
                    lastLoginDate: date,
                    login: {
                        date: date,
                        ip: req.ip
                    }
                });
                db.close();
                if(data.redirect) return res.redirect(data.redirect);
                else return res.sendjson(body);
            } else {
                body.err = Err.userPasswd;
                userDao.setLoginAttempt({
                    _id: doc._id,
                    loginAttempts: 1
                });
                db.close();
                return res.sendjson(body);
            }
        });
    } else {
        body.err = _id;
        return res.sendjson(body);
    }
};

function register(req, res) {
    var data = JSON.parse(req.bodyparam);
    var _id = 0,
        loginBy = null,
        body = {};

    if(!checkEmail(data.email)) {
        body.err = Err.userEmailErr;
    } else if(cache.email.indexOf(data.email) >= 0) {
        body.err = Err.userEmailExist;
    }
    if(!checkUserName(data.name)) {
        body.err = Err.userNameErr;
    } else if(cache.name.indexOf(data.name) >= 0) {
        body.err = Err.userNameExist;
    }
    if(body.err) return res.sendjson(body);
    delete data._id;
    userDao.setNewUser(data, function(err, doc) {
        if(err) {
            body.err = Err.dbErr;
            errlog.error(err);
        } else {
            cache.update(doc);
            body.err = null;
            body._id = userDao.convertID(doc._id);
            body.name = doc.name;
            body.email = doc.email;
        }
        return res.sendjson(body);
    });
};

function getUser(req, res) {
    var user = req.path[2];
    var _id = null,
        body = {};

    if(checkUserID(user) && cache.Uid.indexOf(user) >= 0) {
        _id = userDao.convertID(user);
    } else if(checkUserName(user) && cache.name.indexOf(user) >= 0) {
        _id = cache.getidByName(user);
    } else {
        body.err = Err.UidNone;
        return res.sendjson(body);
    }
    if(_id) userDao.getUsers(_id, function(err, doc) {
        if(err) {
            body.err = Err.dbErr;
            errlog.error(err);
        } else {
            doc._id = userDao.convertID(doc._id);
            body = doc;
        }
        db.close();
        return res.sendjson(body);
    });
};

function getUserInfo(req, res) {
    var body = {};

    if(req.session.Uid) userDao.getUserInfo(userDao.convertID(req.session.Uid), function(err, doc) {
        if(err) {
            body.err = Err.dbErr;
            errlog.error(err);
        } else {
            doc._id = req.session.Uid;
            body = doc;
        }
        return res.sendjson(body);
    });
    else {
        body.err = Err.userNeedLogin;
        return res.sendjson(body);
    }
};

function getFn(req, res) {
    switch(req.path[2]) {
    case 'index':
    default:
        getUser(req, res);
    }
};

function postFn(req, res) {
    console.log(req.path);
    switch(req.path[2]) {
    case 'login':
        return login(req, res);
    }
};

function putFn(req, res) {};

function deleteFn(req, res) {};

if(cache.Uid.length === 0) process.nextTick(function(){return cache.init();});
module.exports = {
    GET: getFn,
    POST: postFn,
    PUT: putFn,
    DELETE: deleteFn,
    cache: cache
};
