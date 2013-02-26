var globalConfig = jsGen.lib.json.GlobalConfig,
    UserPublicTpl = jsGen.lib.json.UserPublicTpl,
    UserPrivateTpl = jsGen.lib.json.UserPrivateTpl,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    checkEmail = jsGen.lib.tools.checkEmail,
    checkUserID = jsGen.lib.tools.checkUserID,
    checkUserName = jsGen.lib.tools.checkUserName,
    checkUrl = jsGen.lib.tools.checkUrl,
    SHA256 = jsGen.lib.tools.SHA256,
    HmacSHA256 = jsGen.lib.tools.HmacSHA256,
    HmacMD5 = jsGen.lib.tools.HmacMD5,
    gravatar = jsGen.lib.tools.gravatar,
    CacheFn = jsGen.lib.tools.CacheFn,
    filterSummary = jsGen.lib.tools.filterSummary;

var userCache = new CacheFn(100);
var paginationCache = new CacheFn(5);
userCache.getUser = function(Uid, callback) {
    var that = this,
        callback = callback || jsGen.lib.tools.callbackFn,
        doc = this.get(Uid);

    if(doc) return callback(null, doc);
    else jsGen.dao.user.getUserInfo(jsGen.dao.user.convertID(Uid), function(err, doc) {
        if(err) jsGen.errlog.error(err);
        if(doc) {
            doc._id = Uid;
            that.put(Uid, doc);
        }
        return callback(err, doc);
    });
};

var cache = {
    _initTime: 0,
    _index: []
};
cache._init = function(callback) {
    var that = this,
        callback = callback || jsGen.lib.tools.callbackFn;
    jsGen.dao.user.getUsersIndex(function(err, doc) {
        if(err) return jsGen.errlog.error(err);
        if(doc) {
            doc._id = jsGen.dao.user.convertID(doc._id);
            that._update(doc);
        }
        if(callback) callback(err, doc);
    });
    return this;
};
cache._update = function(obj) {
    if(!this[obj._id]) {
        this[obj._id] = {};
        this._index.push(obj._id);
    }
    this[obj._id]._id = obj._id;
    this[obj._id].name = obj.name;
    this[obj._id].email = obj.email;
    this[obj._id].avatar = obj.avatar;
    this[obj.name] = this[obj._id];
    this[obj.email] = this[obj._id];
    this._initTime = Date.now();
    return this;
};
cache._remove = function(Uid) {
    var that = this;
    if(this[Uid]) {
        delete this[this[Uid].name];
        delete this[this[Uid].email];
        delete this[Uid];
        this._index.splice(this._index.indexOf(Uid), 1);
        this._initTime = Date.now();
    }
    return this;
};

function setCache(obj) {
    cache._remove(obj._id);
    cache._update(obj);
    userCache.put(obj._id, obj);
};

function adduser(userObj, callback) {
    var body = {},
        callback = callback || jsGen.lib.tools.callbackFn;
    if(!checkEmail(userObj.email)) {
        body.err = jsGen.lib.Err.userEmailErr;
    } else if(cache[userObj.email]) {
        body.err = jsGen.lib.Err.userEmailExist;
    }
    if(!checkUserName(userObj.name)) {
        body.err = jsGen.lib.Err.userNameErr;
    } else if(cache[userObj.name]) {
        body.err = jsGen.lib.Err.userNameExist;
    }
    if(body.err) return callback(body.err, body);
    delete userObj._id;
    userObj.avatar = gravatar(userObj.email);
    userObj.resetDate = Date.now();
    jsGen.dao.user.setNewUser(userObj, function(err, doc) {
        if(err) {
            body.err = jsGen.lib.Err.dbErr;
            jsGen.errlog.error(err);
        }
        if(doc) {
            doc._id = jsGen.dao.user.convertID(doc._id);
            body = union(UserPrivateTpl);
            body = intersect(body, doc);
            body.err = null;
            cache._update(body);
            jsGen.dao.user.getUsersNum(function(err, num) {
                console.log('usersNum: ' + num);
                if(num) jsGen.api.index.setGlobalConfig({users: num});
            });
        }
        return callback(err, body);
    });
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

    try {
        if(!cache[data.logname]) {
            if(checkEmail(data.logname)) throw new Error(jsGen.lib.Err.userEmailNone);
            else if(checkUserID(data.logname)) throw new Error(jsGen.lib.Err.UidNone);
            else if(checkUserName(data.logname)) throw new Error(jsGen.lib.Err.userNameNone);
            else throw new Error(jsGen.lib.Err.logNameErr);
        }
        _id = jsGen.dao.user.convertID(cache[data.logname]._id);
        jsGen.dao.user.getAuth(_id, function(err, doc) {
            if(err) {
                jsGen.errlog.error(err);
                throw new Error(jsGen.lib.Err.dbErr);
            } else if(doc.locked) {
                throw new Error(jsGen.lib.Err.userLocked);
            } else if(doc.loginAttempts >= 5) {
                jsGen.dao.user.setUserInfo({
                    _id: _id,
                    locked: true
                }, function(err, doc) {
                    if(err) return jsGen.errlog.error(err);
                    return jsGen.dao.user.setLoginAttempt({
                        _id: _id,
                        loginAttempts: 0
                    });
                });
                throw new Error(jsGen.lib.Err.loginAttempts);
            }
            if(data.logpwd === HmacSHA256(doc.passwd, data.logname)) {
                doc._id = jsGen.dao.user.convertID(doc._id);
                body = union(UserPrivateTpl);
                body = intersect(body, doc);
                req.session.Uid = body._id;
                req.session.role = body.role;
                if(doc.loginAttempts > 0) jsGen.dao.user.setLoginAttempt({
                    _id: _id,
                    loginAttempts: 0
                });
                var date = Date.now();
                jsGen.dao.user.setLogin({
                    _id: _id,
                    lastLoginDate: date,
                    login: {
                        date: date,
                        ip: req.ip
                    }
                });
            } else {
                jsGen.dao.user.setLoginAttempt({
                    _id: _id,
                    loginAttempts: 1
                });
                throw new Error(jsGen.lib.Err.userPasswd);
            }
            jsGen.dao.db.close();
            return res.sendjson(body);
        });
    } catch(err) {
        jsGen.dao.db.close();
        body.err = {};
        body.err.name = err.name;
        body.err.message = err.message;
        return res.sendjson(body);
    }
};

function register(req, res) {
    var data = req.apibody;

    try {
        if(!jsGen.config.register) throw new Error(jsGen.lib.Err.registerClose);
        adduser(data, function(err, doc) {
            if(err) throw new Error(err);
            if(doc) {
                req.session.Uid = doc._id;
                req.session.role = doc.role;
                res.sendjson(doc);
                setReset({
                    u: doc._id,
                    r: 'role'
                }, function(err) {
                    if(err) {
                        jsGen.errlog.error(err);
                        throw new Error(err);
                    } else if(jsGen.config.email) {
                        var url = jsGen.config.url + '/' + doc._id;
                        jsGen.lib.email.tpl(jsGen.config.title, doc.name, jsGen.config.email, url, 'register').send();
                    }
                    jsGen.dao.db.close();
                });
            }
        });
    } catch(err) {
        jsGen.dao.db.close();
        body.err = err;
        return res.sendjson(body);
    }
};

function setReset(resetObj, callback) {
    // var resetObj = {
    //     u: 'Uid'
    //     r: 'request= role/locked/email/passwd',
    //     e: 'email',
    //     k: 'resetKey'
    // };
    var userObj = {},
        callback = callback || jsGen.lib.tools.callbackFn;

    userObj._id = jsGen.dao.user.convertID(resetObj.u);
    userObj.resetDate = Date.now();
    userObj.resetKey = SHA256(userObj.resetDate.toString());
    jsGen.dao.user.setUserInfo(userObj, function(err, doc) {
        if(err) {
            jsGen.errlog.error(err);
            return callback(err, null);
        }
        if(doc) {
            resetObj.k = HmacMD5(HmacMD5(userObj.resetKey, resetObj.r), resetObj.u, 'base64');
            var resetUrl = new Buffer(JSON.stringify(resetObj)).toString('base64');
            resetUrl = jsGen.config.url + '/api/user/reset/' + resetUrl;
            var email = resetObj.e || doc.email;
            jsGen.lib.email.tpl(jsGen.config.title, doc.name, email, resetUrl, resetObj.r).send(callback);
        }
    });
};

function addUsers(req, res) {
    var body = [];

    try {
        if(req.session.role !== 'admin') throw new Error(jsGen.lib.Err.userRoleErr);
        if(!Array.isArray(req.apibody)) req.apibody = [req.apibody];
        req.apibody.reverse();

        function addUserExec() {
            var userObj = req.apibody.pop();
            if(!userObj) {
                jsGen.dao.db.close();
                return res.sendjson(body);
            }
            adduser(userObj, function(err, doc) {
                if(err) throw new Error(err);
                body.push(doc);
                addUserExec();
            });
        };
        addUserExec();
    } catch(err) {
        jsGen.dao.db.close();
        body.err = err;
        return res.sendjson(body);
    }
};

function getUser(req, res) {
    var user = req.path[2];
    var Uid = null,
        body = {};

    try {
        if(checkUserID(user) && cache[user]) {
            Uid = user;
        } else if(checkUserName(user) && cache[user]) {
            Uid = cache[user]._id;
        } else throw new Error(jsGen.lib.Err.UidNone);
        userCache.getUser(Uid, function(err, doc) {
            if(err) {
                jsGen.errlog.error(err);
                throw new Error(jsGen.lib.Err.dbErr);
            }
            if(doc) {
                body = union(UserPublicTpl);
                body = intersect(body, doc);
            }
            jsGen.dao.db.close();
            return res.sendjson(body);
        });
    } catch(err) {
        jsGen.dao.db.close();
        body.err = err;
        return res.sendjson(body);
    }
};

function getUsers(req, res) {
    var array = [],
        p = 1,
        body = {
            pagination: {},
            data: []
        };

    try {
        if(req.session.role !== 'admin') throw new Error(jsGen.lib.Err.userRoleErr);
        if(!req.session.pagination) {
            req.session.pagination = {
                pagination: cache._initTime,
                total: cache._index.length,
                num: 20
            };
            paginationCache.put(req.session.pagination.pagination, cache._index);
        }
        if(req.getparam.n && req.getparam.n >= 1 && req.getparam.n <= 100) req.session.pagination.num = Math.floor(req.getparam.n);
        if(req.getparam.p && req.getparam.p >= 1) p = Math.floor(req.getparam.p);
        else p = 1;
        if(p === 1 && req.session.pagination.pagination !== cache._initTime) {
            req.session.pagination.pagination = cache._initTime;
            req.session.pagination.total = cache._index.length;
            paginationCache.put(req.session.pagination.pagination, cache._index);
        }
        array = paginationCache.get(req.session.pagination.pagination).slice((p - 1) * req.session.pagination.num, p * req.session.pagination.num);
        body.pagination.now = p;
        body.pagination.total = req.session.pagination.total;
        body.pagination.num = req.session.pagination.num;
        array.forEach(function(Uid, i, array) {
            userCache.getUser(Uid, function(err, doc) {
                var data = {};
                if(err) {
                    jsGen.errlog.error(err);
                    throw new Error(jsGen.lib.Err.dbErr);
                } else if(doc) {
                    data = union(UserPublicTpl);
                    data = intersect(data, doc);
                    data.email = doc.email;
                }
                body.data.push(data);
                if(i === array.length - 1) {
                    jsGen.dao.db.close();
                    return res.sendjson(body);
                }
            });
        });
    } catch(err) {
        jsGen.dao.db.close();
        body.err = err;
        return res.sendjson(body);
    }
};

function getUserInfo(req, res) {
    var body = {};
    try {
        if(!req.session.Uid) throw new Error(jsGen.lib.Err.userNeedLogin);
        userCache.getUser(req.session.Uid, function(err, doc) {
            if(err) throw new Error(jsGen.lib.Err.dbErr);
            body = doc;
            jsGen.api.tag.filterTags(body.tagsList, false, function(err, doc) {
                if(err) throw new Error(err);
                if(doc) body.tagsList = doc;
                return res.sendjson(body);
            });
        });
    } catch(err) {
        jsGen.dao.db.close();
        body.err = err;
        return res.sendjson(body);
    }
};

function editUser(req, res) {
    var defaultObj = {
        name: '',
        email: '',
        passwd: '',
        sex: '',
        avatar: '',
        desc: '',
        tagsList: ['']
    },
        body = {},
        userObj = {},
        setTagList = [];

    try {
        if(!req.session.Uid) throw new Error(jsGen.lib.Err.userNeedLogin);
        userObj = union(defaultObj);
        userObj = intersect(userObj, req.apibody);
        userObj._id = jsGen.dao.user.convertID(req.session.Uid);
        if(userObj.name) {
            if(!checkUserName(userObj.name)) {
                throw new Error(jsGen.lib.Err.userNameErr);
            } else if(userObj.name === cache[req.session.Uid].name) {
                delete userObj.name;
            } else if(cache[userObj.name]) {
                throw new Error(jsGen.lib.Err.userNameExist);
            }
        }
        if(userObj.email) {
            if(!checkEmail(userObj.email)) {
                throw new Error(jsGen.lib.Err.userEmailErr);
            } else if(userObj.email === cache[req.session.Uid].email) {
                delete userObj.email;
            } else if(cache[userObj.email]) {
                throw new Error(jsGen.lib.Err.userEmailExist);
            }
        }
        if(userObj.sex) {
            if(['male', 'female'].indexOf(userObj.sex) < 0) delete userObj.sex;
        }
        if(userObj.avatar) {
            if(!checkUrl(userObj.avatar)) delete userObj.avatar;
        }
        if(userObj.desc) userObj.desc = filterSummary(userObj.desc);
        if(userObj.tagsList) {
            jsGen.api.tag.filterTags(userObj.tagsList.slice(0, globalConfig.UserTagsMax), true, function(err, doc) {
                if(err) throw new Error(err);
                if(doc) userObj.tagsList = doc;
                userCache.getUser(req.session.Uid, function(err, doc) {
                    var tagList = {};
                    if(doc) doc.tagsList.forEach(function(x) {
                        tagList[x] = -userObj._id;
                    });
                    userObj.tagsList.forEach(function(x) {
                        if(tagList[x]) delete tagList[x];
                        else tagList[x] = userObj._id;
                    });
                    for(var key in tagList) setTagList.push({
                        _id: Number(key),
                        usersList: tagList[key]
                    });
                    daoExec();
                });
            });
        } else daoExec();

        function daoExec() {
            if(body.err) throw new Error(body.err);
            else return jsGen.dao.user.setUserInfo(userObj, function(err, doc) {
                if(err) {
                    jsGen.errlog.error(err);
                    throw new Error(jsGen.lib.Err.dbErr);
                } else {
                    doc._id = req.session.Uid;
                    body = union(UserPrivateTpl);
                    body = intersect(body, doc);
                    setCache(body);
                    if(setTagList.length > 0) setTagList.forEach(function(x) {
                        jsGen.api.tag.setTag(x);
                    });
                    jsGen.api.tag.filterTags(body.tagsList, false, function(err, doc) {
                        body = intersect(defaultObj, body);
                        if(doc) body.tagsList = doc;
                        return res.sendjson(body);
                    });
                }
            });
        };
    } catch(err) {
        jsGen.dao.db.close();
        body.err = err;
        return res.sendjson(body);
    }
};

function editUsers(req, res) {
    var defaultObj = {
        _id: '',
        email: '',
        locked: false,
        role: ''
    },
        body = {
            err: null,
            data: []
        };

    try {
        if(req.session.Uid !== 'Uadmin') throw new Error(jsGen.lib.Err.userRoleErr);
        if(!req.apibody.data) throw new Error(jsGen.lib.Err.requestDataErr);
        if(!Array.isArray(req.apibody.data)) req.apibody.data = [req.apibody.data];
        req.apibody.data.reverse();

        function editUserExec() {
            var userObj = req.apibody.data.pop();
            if(!userObj) {
                jsGen.dao.db.close();
                return res.sendjson(body);
            }
            if(!userObj._id) throw new Error(jsGen.lib.Err.UidNone);
            userObj = intersect(union(defaultObj), userObj);
            userObj._id = jsGen.dao.user.convertID(userObj._id);
            if(userObj.email) {
                if(!checkEmail(userObj.email)) {
                    throw new Error(jsGen.lib.Err.userEmailErr);
                } else if(userObj.email === cache[req.session.Uid].email) {
                    delete userObj.email;
                } else if(cache[userObj.email]) {
                    throw new Error(jsGen.lib.Err.userEmailExist);
                }
            }
            if(userObj.role) {
                if(['admin', 'editor', 'author', 'user', 'guest', 'forbid'].lastIndexOf(userObj.role) < 0) delete userObj.role;
            }
            if(userObj.locked !== true) delete userObj.locked;
            jsGen.dao.user.setUserInfo(userObj, function(err, doc) {
                if(err) {
                    jsGen.errlog.error(err);
                    throw new Error(jsGen.lib.Err.dbErr);
                } else {
                    doc._id = jsGen.dao.user.convertID(doc._id);
                    setCache(doc);
                    var data = intersect(union(UserPublicTpl), doc);
                    data.email = doc.email;
                    body.data.push(data);
                    editUserExec();
                }
            });
        };
        editUserExec();
    } catch(err) {
        jsGen.dao.db.close();
        body.err = err;
        return res.sendjson(body);
    }
};

function getReset(req, res) {};

function resetUser(req, res) {
    var body = {};
    var _id = null;
    try {
        var reset = JSON.parse(new Buffer(req.path[3], 'base64').toString());
        if(!reset.u || !reset.r || !reset.k) throw new Error(jsGen.lib.Err.resetInvalid);
        if(cache[reset.u]) _id = jsGen.dao.user.convertID(cache[reset.u]._id);
        else throw new Error(jsGen.lib.Err.resetInvalid);
        jsGen.dao.user.getAuth(_id, function(err, doc) {
            var userObj = {};
            userObj._id = _id;
            if(err) {
                jsGen.errlog.error(err);
                throw new Error(jsGen.lib.Err.dbErr);
            } else if(doc && doc.resetKey && (Date.now() - doc.resetDate) / 86400000 < 3) {
                if(HmacMD5(HmacMD5(doc.resetKey, reset.r), reset.u, 'base64') === reset.k) {
                    switch(reset.r) {
                    case 'locked':
                        userObj.locked = false;
                        break;
                    case 'role':
                        userObj.role = 'user';
                        break;
                    case 'email':
                        userObj.email = reset.e;
                        break;
                    case 'passwd':
                        userObj.passwd = SHA256(reset.e);
                        break;
                    default:
                        throw new Error(jsGen.lib.Err.resetInvalid);
                    }
                    userObj.resetDate = Date.now();
                    userObj.resetKey = '';
                    jsGen.dao.user.setUserInfo(userObj, function(err, doc) {
                        if(err) {
                            jsGen.errlog.error(err);
                            throw new Error(jsGen.lib.Err.dbErr);
                        } else if(doc) {
                            doc._id = jsGen.dao.user.convertID(doc._id);
                            body = union(UserPrivateTpl);
                            body = intersect(body, doc);
                            setCache(body);
                            req.session.Uid = body._id;
                            req.session.role = body.role;
                            jsGen.dao.db.close();
                            return res.sendjson(body);
                        }
                    });
                } else throw new Error(jsGen.lib.Err.resetInvalid);
            } else throw new Error(jsGen.lib.Err.resetOutdate);
        });
    } catch(e) {
        jsGen.dao.db.close();
        body.err = e.toString();
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
    case 'reset':
        return resetUser(req, res);
    default:
        return getUser(req, res);
    }
};

function postFn(req, res) {
    switch(req.path[2]) {
    case undefined:
    case 'index':
        return editUser(req, res);
    case 'login':
        return login(req, res);
    case 'register':
        return register(req, res);
    case 'admin':
        return editUsers(req, res);
    default:
        return res.r404();
    }
};

module.exports = {
    GET: getFn,
    POST: postFn,
    cache: cache
};
