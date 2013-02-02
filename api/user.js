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
    gravatar = require('../lib/tools.js').gravatar,
    Err = require('./errmsg.js');

var cache = {
    _initTime: 0,
    Uid: [],
    name: [],
    email: [],
    avatar: []
};
cache.init = function(callback) {
    this.Uid = [];
    this.name = [];
    this.email = [];
    this.avatar = [];
    var that = this;
    userDao.getUsersIndex(function(err, doc) {
        if(err) return errlog.error(err);
        if(doc) that.update(doc);
        if(callback) callback(err, doc);
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
    this._initTime = Date.now();
    return this;
};
cache.getidByEmail = function(str) {
    var index = this.email.indexOf(str);
    if(index === -1) return null;
    return userDao.convertID(this.Uid[index]);
};
cache.getidByName = function(str) {
    var index = this.name.indexOf(str);
    if(index === -1) return null;
    return userDao.convertID(this.Uid[index]);
};
cache.getByid = function(num) {
    var Uid = userDao.convertID(num);
    var index = this.Uid.indexOf(Uid);
    if(index === -1) return null;
    return {
        Uid: Uid,
        name: this.name[index],
        email: this.email[index],
        avatar: this.avatar[index]
    };
};

function adduser(userObj, callback) {
    var result = {};
    if(!checkEmail(userObj.email)) {
        result.err = Err.userEmailErr;
    } else if(cache.email.indexOf(userObj.email) >= 0) {
        result.err = Err.userEmailExist;
    }
    if(!checkUserName(userObj.name)) {
        result.err = Err.userNameErr;
    } else if(cache.name.indexOf(userObj.name) >= 0) {
        result.err = Err.userNameExist;
    }
    if(result.err) return callback(result.err, null);
    delete userObj._id;
    userObj.avatar = gravatar(userObj.email);
    userDao.setNewUser(userObj, function(err, doc) {
        if(err) {
            result.err = Err.dbErr;
            errlog.error(err);
        } else {
            cache.update(doc);
            result.err = null;
            result._id = userDao.convertID(doc._id);
            result.name = doc.name;
            result.email = doc.email;
        }
        return callback(result.err, result);
    });
};

function editUser(userObj, callback) {

};

function logout(req, res) {
    req.delsession();
    res.redirect('/');
};

function login(req, res) {
    var data = req.apibody;
    var _id = null,
        body = {};

    if(checkEmail(data.logname)) {
        _id = cache.getidByEmail(data.logname);
        if(!_id) body.err = Err.userEmailNone;
    } else if(checkUserID(data.logname)) {
        _id = userDao.convertID(data.logname);
        if(!cache.getByid(_id)) body.err = Err.UidNone;
    } else if(checkUserName(data.logname)) {
        _id = cache.getidByName(data.logname);
        if(!_id) body.err = Err.userNameNone;
    } else body.err = Err.logNameErr;

    if(!body.err) {
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
    } else return res.sendjson(body);
};

function register(req, res) {
    var data = req.apibody,
        body = {};
        console.log('register');
    adduser(data, function(err, doc){
        if (err) doc.err = err;
        return res.sendjson(doc);
    });
};

function addUsers(req, res) {
    var body = [];
    if(req.session.role === 'admin') {
        function addUserExec() {
            var userObj = req.apibody.shift();
            if (!userObj) return res.sendjson(body);
            adduser(userObj, function(err, doc){
                if (err) {
                    doc.err = err;
                    body.push(doc);
                    return res.sendjson(body);
                } else {
                    body.push(doc);
                    addUserExec();
                }
            });
        };
        addUserExec();
    }
    else body.err = Err.userRoleErr;
    return res.sendjson(body);
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
            body = doc;
            body._id = userDao.convertID(doc._id);
            delete body.email;
        }
        db.close();
        return res.sendjson(body);
    });
};

function getUidArray(req, res) {
    var body = {};

    if(req.session.role === 'admin') body.UidArray = cache.Uid;
    else body.err = Err.userRoleErr;
    return res.sendjson(body);
};

function getUsers(req, res) {
    var UidArray = [],
        body = [];

    if(req.session.role === 'admin') {
        for(var i = req.apibody.UidArray.length - 1; i >= 0; i--) {
            if(cache.Uid.indexOf(req.apibody.UidArray[i]) >= 0) UidArray.push(req.apibody.UidArray[i]);
        };
        userDao.getUsers(UidArray, function(err, doc) {
            if (doc) {
                doc._id = userDao.convertID(doc._id);
                body.push(doc);
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
    } else body.err = Err.userRoleErr;
    return res.sendjson(body);
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
        return getUidArray(req, res);
    default:
        return getUser(req, res);
    }
};

function postFn(req, res) {
    switch(req.path[2]) {
    case 'login':
        return login(req, res);
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
    PUT: putFn,
    cache: cache
};
