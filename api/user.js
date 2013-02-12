var userDao = require('../dao/userDao.js'),
    articleDao = require('../dao/articleDao.js'),
    collectionDao = require('../dao/collectionDao.js'),
    commentDao = require('../dao/commentDao.js'),
    messageDao = require('../dao/messageDao.js'),
    tagDao = require('../dao/tagDao.js'),
    db = require('../dao/mongoDao.js').db,
    errlog = require('rrestjs').restlog,
    merge = require('../lib/tools.js').merge,
    checkEmail = require('../lib/tools.js').checkEmail,
    checkUserID = require('../lib/tools.js').checkUserID,
    checkUserName = require('../lib/tools.js').checkUserName,
    HmacSHA256 = require('../lib/tools.js').HmacSHA256,
    gravatar = require('../lib/tools.js').gravatar,
    Err = require('./errmsg.js');

var cache = {
    _initTime: 0
};
cache.init = function(callback) {
    var that = this;
    userDao.getUsersIndex(function(err, doc) {
        if(err) return errlog.error(err);
        if(doc) {
            doc._id = userDao.convertID(doc._id);
            that.update(doc);
        }
        if(callback) callback(err, doc);
    });
    return this;
};
cache.update = function(obj) {
    if(!this[obj._id]) this[obj._id] = {};
    this[obj._id]._id = obj._id;
    this[obj._id].name = obj.name;
    this[obj._id].email = obj.email;
    this[obj._id].avatar = obj.avatar;
    this[obj.name] = this[obj._id];
    this[obj.email] = this[obj._id];
    this._initTime = Date.now();
    return this;
};

function adduser(userObj, callback) {
    var result = {};
    if(!checkEmail(userObj.email)) {
        result.err = Err.userEmailErr;
    } else if(cache[userObj.email]) {
        result.err = Err.userEmailExist;
    }
    if(!checkUserName(userObj.name)) {
        result.err = Err.userNameErr;
    } else if(cache[userObj.name]) {
        result.err = Err.userNameExist;
    }
    if(result.err) return callback(result);
    delete userObj._id;
    userObj.avatar = gravatar(userObj.email);
    userObj.resetDate = Date.now();
    userDao.setNewUser(userObj, function(err, doc) {
        if(err) {
            result.err = Err.dbErr;
            errlog.error(err);
        }
        if(doc) {
            result = doc;
            result.err = null;
            result._id = userDao.convertID(doc._id);
            process.nextTick(function() {
                return cache.update(doc);
            });
        }
        return callback(result);
    });
};

function editUser(userObj, callback) {

};

function logout(req, res) {
    req.delsession();
    res.sendjson({
        logout: true
    });
};

function login(req, res) {
    var data = req.apibody;
    var _id = null,
        body = {};

    if(!cache[data.logname]) {
        if(checkEmail(data.logname)) body.err = Err.userEmailNone;
        else if(checkUserID(data.logname)) body.err = Err.UidNone;
        else if(checkUserName(data.logname)) body.err = Err.userNameNone;
        else body.err = Err.logNameErr;
        return res.sendjson(body);
    } else {
        _id = userDao.convertID(cache[data.logname]._id);
        userDao.getAuth(_id, function(err, doc) {
            if(err) {
                body.err = Err.dbErr;
                errlog.error(err);
            } else if(doc.locked) {
                body.err = Err.userLocked;
            } else if(doc.loginAttempts >= 5) {
                body.err = Err.loginAttempts;
                userDao.setUserInfo({
                    _id: doc._id,
                    locked: true
                }, function(err) {
                    if(err) return errlog.error(err);
                    return userDao.setLoginAttempt({
                        _id: doc._id,
                        loginAttempts: 0
                    });
                });
            }
            if(body.err) {
                db.close();
                return res.sendjson(body);
            }
            if(data.logpwd === HmacSHA256(doc.passwd, data.logname)) {
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
            } else {
                body.err = Err.userPasswd;
                userDao.setLoginAttempt({
                    _id: doc._id,
                    loginAttempts: 1
                });
            }
            db.close();
            return res.sendjson(body);
        });
    }
};

function register(req, res) {
    var data = req.apibody;
    adduser(data, function(doc) {
        if(!doc.err) {
            req.session.Uid = doc._id;
            req.session.avatar = doc.avatar;
            req.session.email = doc.email;
            req.session.name = doc.name;
            req.session.role = doc.role;
            var date = Date.now();
            userDao.setLogin({
                _id: doc._id,
                lastLoginDate: date,
                login: {
                    date: date,
                    ip: req.ip
                }
            });
        }
        return res.sendjson(doc);
    });
};

function addUsers(req, res) {
    var body = [];
    if(req.session.role === 'admin') {
        function addUserExec() {
            var userObj = req.apibody.shift();
            if(!userObj) return res.sendjson(body);
            adduser(userObj, function(doc) {
                if(doc.err) {
                    body.push(doc);
                    return res.sendjson(body);
                } else {
                    body.push(doc);
                    addUserExec();
                }
            });
        };
        addUserExec();
    } else body[0] = {
        err: Err.userRoleErr
    };
    return res.sendjson(body);
};

function getUser(req, res) {
    var user = req.path[2];
    var _id = null,
        body = {};

    if(checkUserID(user) && cache[user]) {
        _id = userDao.convertID(user);
    } else if(checkUserName(user) && cache[user]) {
        _id = userDao.convertID(cache[user]);
    } else {
        body.err = Err.UidNone;
        return res.sendjson(body);
    }
    if(_id) userDao.getUsers(_id, function(err, doc) {
        if(err) {
            body.err = Err.dbErr;
            errlog.error(err);
        } else if(doc) {
            body = doc;
            body._id = userDao.convertID(doc._id);
            delete body.email;
        }
        db.close();
        return res.sendjson(body);
    });
};

function getUsers(req, res) {
    var idArray = [],
        body = {
            idArray: [],
            data: []
        };

    if(req.session.role === 'admin') {
        if(req.apibody && req.apibody.idArray && req.apibody.idArray.length >= 1) {
            for(var i = req.apibody.idArray.length - 1; i >= 0; i--) {
                if(cache[req.apibody.idArray[i]]) idArray.push(req.apibody.idArray[i]);
            };
        } else {
            for(var key in cache) {
                if(checkUserID(key)) body.idArray.push(key);
            }
            idArray = body.idArray;
        }
        idArray = idArray.slice(0, 50);
        idArray.forEach(function(x, i, idArray){
            idArray[i] = userDao.convertID(x);
        });
        userDao.getUsers(idArray, function(err, doc) {
            if(doc) {
                doc._id = userDao.convertID(doc._id);
                body.data.push(doc);
            }
            if(err) {
                body.err = Err.dbErr;
                errlog.error(err);
                db.close();
                return res.sendjson(body);
            }
            if(!doc) {
                db.close();
                return res.sendjson(body);
            }
        });
    } else {
        body.err = Err.userRoleErr;
        return res.sendjson(body);
    }
};

function getUserInfo(req, res) {
    var body = {};

    if(req.session.Uid) userDao.getUserInfo(userDao.convertID(req.session.Uid), function(err, doc) {
        if(err) {
            body.err = Err.dbErr;
            errlog.error(err);
        } else {
            body = doc;
            body._id = req.session.Uid;
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
    case undefined:
    case 'index':
        return getUserInfo(req, res);
    case 'logout':
        return logout(req, res);
    case 'admin':
        return getUsers(req, res);
    default:
        return getUser(req, res);
    }
};

function postFn(req, res) {
    switch(req.path[2]) {
    case 'login':
        return login(req, res);
    case 'register':
        return register(req, res);
    case 'admin':
        return getUsers(req, res);
    default:
        return res.r404();
    }
};

function putFn(req, res) {
    switch(req.path[2]) {
    case 'register':
        return register(req, res);
    case 'admin':
        return addUsers(req, res);
    default:
        return res.r404();
    }
};

module.exports = {
    GET: getFn,
    POST: postFn,
    cache: cache
};
