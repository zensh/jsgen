var UserPublicTpl = jsGen.lib.json.UserPublicTpl,
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
    userCache = jsGen.cache.user;
    filterSummary = jsGen.lib.tools.filterSummary;

userCache.getUser = function(Uid, callback, convert) {
    var that = this,
        doc = this.get(Uid);

    callback = callback || jsGen.lib.tools.callbackFn;
    if (convert === undefined) convert = true;
    if (doc) {
        if (convert) {
            doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
            doc.followList = convertUsers(doc.followList);
        }
        return callback(null, doc);
    } else jsGen.dao.user.getUserInfo(jsGen.dao.user.convertID(Uid), function(err, doc) {
        if (doc) {
            doc._id = Uid;
            that.put(Uid, doc);
            if (convert) {
                doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
                doc.followList = convertUsers(doc.followList);
            }
        }
        return callback(err, doc);
    });
};

var cache = {
    _initTime: 0,
    _index: []
};
cache._update = function(obj) {
    if (!this[obj._id]) {
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
    if (this[Uid]) {
        delete this[this[Uid].name];
        delete this[this[Uid].email];
        delete this[Uid];
        this._index.splice(this._index.indexOf(Uid), 1);
        this._initTime = Date.now();
    }
    return this;
};
(function() {
    var that = this;
    jsGen.dao.user.getUsersIndex(function(err, doc) {
        if (err) throw err;
        if (doc) {
            doc._id = jsGen.dao.user.convertID(doc._id);
            that._update(doc);
        }
    });
}).call(cache);

function convertUsers(_idArray) {
    var result = [];
    if (!Array.isArray(_idArray)) _idArray = [_idArray];
    if (typeof _idArray[0] !== 'number') return result;
    _idArray.forEach(function(x, i) {
        x = jsGen.dao.user.convertID(x);
        if (cache[x]) result.push({
            _id: cache[x]._id,
            name: cache[x].name
        });
    });
    return result;
};

function setCache(obj) {
    cache._remove(obj._id);
    cache._update(obj);
    userCache.put(obj._id, obj);
};

function adduser(userObj, callback) {
    var body = {},
    callback = callback || jsGen.lib.tools.callbackFn;
    if (!checkEmail(userObj.email)) {
        body.err = jsGen.lib.msg.userEmailErr;
    } else if (cache[userObj.email]) {
        body.err = jsGen.lib.msg.userEmailExist;
    }
    if (!checkUserName(userObj.name)) {
        body.err = jsGen.lib.msg.userNameErr;
    } else if (cache[userObj.name]) {
        body.err = jsGen.lib.msg.userNameExist;
    }
    if (body.err) return callback(body.err, body);
    delete userObj._id;
    userObj.avatar = gravatar(userObj.email);
    userObj.resetDate = Date.now();
    jsGen.dao.user.setNewUser(userObj, function(err, doc) {
        if (doc) {
            doc._id = jsGen.dao.user.convertID(doc._id);
            body = union(UserPrivateTpl);
            body = intersect(body, doc);
            body.err = null;
            cache._update(body);
            jsGen.dao.user.getUsersNum(function(err, num) {
                if (num) jsGen.api.index.setGlobalConfig({
                    users: num
                });
            });
        }
        return callback(err, body);
    });
};

function logout(req, res, dm) {
    req.delsession();
    res.sendjson({
        logout: true
    });
};

function login(req, res, dm) {
    var data = req.apibody;

    if (!cache[data.logname]) {
        if (checkEmail(data.logname)) throw jsGen.Err(jsGen.lib.msg.userEmailNone);
        else if (checkUserID(data.logname)) throw jsGen.Err(jsGen.lib.msg.UidNone);
        else if (checkUserName(data.logname)) throw jsGen.Err(jsGen.lib.msg.userNameNone);
        else throw jsGen.Err(jsGen.lib.msg.logNameErr);
    }
    var _id = jsGen.dao.user.convertID(cache[data.logname]._id);
    jsGen.dao.user.getAuth(_id, dm.intercept(function(doc) {
        if (doc.locked) {
            throw jsGen.Err(jsGen.lib.msg.userLocked, 'locked');
        } else if (doc.loginAttempts >= 5) {
            jsGen.dao.user.setUserInfo({
                _id: _id,
                locked: true
            }, dm.intercept(function(doc) {
                jsGen.dao.user.setLoginAttempt({
                    _id: _id,
                    loginAttempts: 0
                });
            }));
            throw jsGen.Err(jsGen.lib.msg.loginAttempts, 'locked');
        }
        if (data.logpwd === HmacSHA256(doc.passwd, data.logname)) {
            doc._id = jsGen.dao.user.convertID(doc._id);
            req.session.Uid = doc._id;
            req.session.role = doc.role;
            if (doc.loginAttempts > 0) jsGen.dao.user.setLoginAttempt({
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
            userCache.getUser(doc._id, dm.intercept(function(doc) {
                return res.sendjson(doc);
            }));
        } else {
            jsGen.dao.user.setLoginAttempt({
                _id: _id,
                loginAttempts: 1
            });
            throw jsGen.Err(jsGen.lib.msg.userPasswd, 'passwd');
        }
    }));
};

function register(req, res, dm) {
    var data = req.apibody;

    if (!jsGen.config.register) throw jsGen.Err(jsGen.lib.msg.registerClose);
    adduser(data, dm.intercept(function(doc) {
        if (doc) {
            req.session.Uid = doc._id;
            req.session.role = doc.role;
            setReset({
                u: doc._id,
                r: 'role'
            }, dm.intercept(function() {
                userCache.getUser(doc._id, dm.intercept(function(doc) {
                    return res.sendjson(doc);
                }));
                if (jsGen.config.email) {
                    var url = jsGen.config.url + '/' + doc._id;
                    jsGen.lib.email.tpl(jsGen.config.title, doc.name, jsGen.config.email, url, 'register').send();
                }
            }));
        }
    }));
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
        if (err) return callback(err, null);
        if (doc) {
            resetObj.k = HmacMD5(HmacMD5(userObj.resetKey, resetObj.r), resetObj.u, 'base64');
            var resetUrl = new Buffer(JSON.stringify(resetObj)).toString('base64');
            resetUrl = jsGen.config.url + '/api/user/reset/' + resetUrl;
            var email = resetObj.e || doc.email;
            jsGen.lib.email.tpl(jsGen.config.title, doc.name, email, resetUrl, resetObj.r).send(callback);
        }
    });
};

function addUsers(req, res, dm) {
    var body = [];

    if (req.session.role !== 'admin') throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    if (!Array.isArray(req.apibody)) req.apibody = [req.apibody];
    req.apibody.reverse();
    next();

    function next() {
        var userObj = req.apibody.pop();
        if (!userObj) return res.sendjson(body);
        adduser(userObj, dm.intercept(function(doc) {
            body.push(doc);
            next();
        }));
    };
};

function getUser(req, res, dm) {
    var user = req.path[2];
    var Uid = null;
    if ((checkUserID(user) || checkUserName(user)) && cache[user]) Uid = cache[user]._id;
    else throw jsGen.Err(jsGen.lib.msg.UidNone);
    var _id = jsGen.dao.user.convertID(Uid);
    if (req.path[3] === 'follow') {
        if (!req.session.Uid) throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
        userCache.getUser(req.session.Uid, dm.intercept(function(doc) {
            if (doc.followList.indexOf(_id) >= 0) throw jsGen.Err(jsGen.lib.msg.userFollowed);
            _idReq = jsGen.dao.user.convertID(req.session.Uid);
            jsGen.dao.user.setFollow({
                _id: _idReq,
                followList: _id
            }, dm.intercept(function(doc) {
                jsGen.dao.user.setFans({
                    _id: _id,
                    fansList: _idReq
                });
                userCache.remove(Uid);
                userCache.remove(req.session.Uid);
                userCache.getUser(req.session.Uid, dm.intercept(function(doc) {
                    return res.sendjson({
                        followList: doc.followList
                    });
                }));
            }));
        }), false);
    } else if (req.path[3] === 'unfollow') {
        if (!req.session.Uid) throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
        userCache.getUser(req.session.Uid, dm.intercept(function(doc) {
            if (doc.followList.indexOf(_id) < 0) throw jsGen.Err(jsGen.lib.msg.userUnfollowed);
            _idReq = jsGen.dao.user.convertID(req.session.Uid);
            jsGen.dao.user.setFollow({
                _id: _idReq,
                followList: -_id
            }, dm.intercept(function(doc) {
                jsGen.dao.user.setFans({
                    _id: _id,
                    fansList: -_idReq
                });
                userCache.remove(Uid);
                userCache.remove(req.session.Uid);
                userCache.getUser(req.session.Uid, dm.intercept(function(doc) {
                    return res.sendjson({
                        followList: doc.followList
                    });
                }));
            }));
        }), false);
    } else {
        userCache.getUser(Uid, dm.intercept(function(doc) {
            doc = intersect(union(UserPublicTpl), doc);
            return res.sendjson(doc);
        }));
    }
};

function getUsers(req, res, dm) {
    var array = [],
        p = req.getparam.p || req.getparam.page,
        n = req.getparam.n || req.getparam.num,
        body = {
            pagination: {},
            data: []
        };

    if (req.session.role !== 'admin') throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    if (!req.session.pagination) {
        req.session.pagination = {
            pagID: 'user' + cache._initTime,
            total: cache._index.length,
            num: 20,
            now: 1
        };
        jsGen.cache.pagination.put(req.session.pagination.pagID, cache._index);
    }
    if (n && n >= 1 && n <= 500) req.session.pagination.num = Math.floor(n);
    if (p && p >= 1) req.session.pagination.now = Math.floor(p);
    p = req.session.pagination.now;
    n = req.session.pagination.num;
    array = jsGen.cache.pagination.get(req.session.pagination.pagID);
    if (!array || (p === 1 && req.session.pagination.pagID !== 'user' + cache._initTime)) {
        req.session.pagination.pagID = 'user' + cache._initTime;
        req.session.pagination.total = cache._index.length;
        jsGen.cache.pagination.put(req.session.pagination.pagID, cache._index);
        array = cache._index;
    }
    array = array.slice((p - 1) * n, p * n);
    body.pagination.total = req.session.pagination.total;
    body.pagination.now = p;
    body.pagination.num = n;
    array.reverse();
    next();

    function next() {
        var Uid = array.pop();
        if (!Uid) return res.sendjson(body);
        userCache.getUser(Uid, dm.intercept(function(doc) {
            var data = {};
            if (doc) {
                data = union(UserPublicTpl);
                data = intersect(data, doc);
                data.email = doc.email;
                body.data.push(data);
            }
            next();
        }));
    };
};

function getUserInfo(req, res, dm) {
    if (!req.session.Uid) throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    userCache.getUser(req.session.Uid, dm.intercept(function(doc) {
        return res.sendjson(doc);
    }));
};

function editUser(req, res, dm) {
    var defaultObj = {
        name: '',
        passwd: '',
        sex: '',
        avatar: '',
        desc: '',
        tagsList: ['']
    },
    body = {},
    userObj = {};

    if (!req.session.Uid) throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    userObj = union(defaultObj);
    userObj = intersect(userObj, req.apibody);
    userObj._id = jsGen.dao.user.convertID(req.session.Uid);
    if (userObj.name) {
        if (!checkUserName(userObj.name)) {
            throw jsGen.Err(jsGen.lib.msg.userNameErr);
        } else if (userObj.name === cache[req.session.Uid].name) {
            delete userObj.name;
        } else if (cache[userObj.name]) {
            throw jsGen.Err(jsGen.lib.msg.userNameExist);
        }
    }
    if (userObj.sex) {
        if (['male', 'female'].indexOf(userObj.sex) < 0) delete userObj.sex;
    }
    if (userObj.avatar) {
        if (!checkUrl(userObj.avatar)) delete userObj.avatar;
    }
    if (userObj.desc) userObj.desc = filterSummary(userObj.desc);
    if (userObj.tagsList) {
        jsGen.api.tag.filterTags(userObj.tagsList.slice(0, jsGen.config.UserTagsMax), dm.intercept(function(doc) {
            if (doc) userObj.tagsList = doc;
            userCache.getUser(req.session.Uid, dm.intercept(function(doc) {
                var tagList = {},
                setTagList = [];
                if (doc) doc.tagsList.forEach(function(x) {
                    tagList[x] = -userObj._id;
                });
                userObj.tagsList.forEach(function(x) {
                    if (tagList[x]) delete tagList[x];
                    else tagList[x] = userObj._id;
                });
                for (var key in tagList) setTagList.push({
                    _id: Number(key),
                    usersList: tagList[key]
                });
                setTagList.forEach(function(x) {
                    jsGen.api.tag.setTag(x);
                });
                daoExec();
            }), false);
        }));
    } else daoExec();

    function daoExec() {
        jsGen.dao.user.setUserInfo(userObj, dm.intercept(function(doc) {
            if (doc) {
                doc._id = req.session.Uid;
                body = union(UserPrivateTpl);
                body = intersect(body, doc);
                setCache(body);
                var tagsList = jsGen.api.tag.convertTags(body.tagsList);
                body = intersect(defaultObj, body);
                body.tagsList = tagsList;
                return res.sendjson(body);
            }
        }));
    };
};

function editUsers(req, res, dm) {
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

    if (req.session.Uid !== 'Uadmin') throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    if (!req.apibody.data) throw jsGen.Err(jsGen.lib.msg.requestDataErr);
    if (!Array.isArray(req.apibody.data)) req.apibody.data = [req.apibody.data];
    req.apibody.data.reverse();
    next();

    function next() {
        var userObj = req.apibody.data.pop();
        if (!userObj) return res.sendjson(body);
        if (!userObj._id) throw jsGen.Err(jsGen.lib.msg.UidNone);
        userObj = intersect(union(defaultObj), userObj);
        userObj._id = jsGen.dao.user.convertID(userObj._id);
        if (userObj.email) {
            if (!checkEmail(userObj.email)) {
                throw jsGen.Err(jsGen.lib.msg.userEmailErr);
            } else if (userObj.email === cache[req.session.Uid].email) {
                delete userObj.email;
            } else if (cache[userObj.email]) {
                throw jsGen.Err(jsGen.lib.msg.userEmailExist);
            }
        }
        if (userObj.role) {
            if (['admin', 'editor', 'author', 'user', 'guest', 'forbid'].lastIndexOf(userObj.role) < 0) delete userObj.role;
        }
        if (userObj.locked !== false) delete userObj.locked;
        jsGen.dao.user.setUserInfo(userObj, dm.intercept(function(doc) {
            if (doc) {
                doc._id = jsGen.dao.user.convertID(doc._id);
                setCache(doc);
                var data = intersect(union(UserPublicTpl), doc);
                data.email = doc.email;
                body.data.push(data);
            }
            next();
        }));
    };
};

function getReset(req, res, dm) {
    var resetObj = {};
    resetObj.r = req.apibody.request;
    if (!resetObj.r || ['locked', 'email', 'passwd'].indexOf(resetObj.r) === -1) throw jsGen.Err(jsGen.lib.msg.resetInvalid);
    if (resetObj.r === 'email') {
        resetObj.e = req.apibody.email;
        if (!req.session.Uid) throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
        if (!checkEmail(resetObj.e)) throw jsGen.Err(jsGen.lib.msg.userEmailErr);
        if (cache[resetObj.e]) throw jsGen.Err(jsGen.lib.msg.userEmailExist);
        resetObj.u = req.session.Uid;
    } else {
        if ((checkUserID(req.apibody.name) || checkUserName(req.apibody.name)) && cache[req.apibody.name]) {
            resetObj.u = cache[req.apibody.name]._id;
            resetObj.e = cache[req.apibody.name].email;
        } else throw jsGen.Err(jsGen.lib.msg.resetInvalid);
        if (req.apibody.email !== resetObj.e) throw jsGen.Err(jsGen.lib.msg.resetInvalid);
    }
    setReset(resetObj, dm.intercept(function() {
        return res.sendjson({
            request: jsGen.lib.msg.requestSent
        });
    }));
};

function resetUser(req, res, dm) {
    var body = {};
    var _id = null;

    var reset = JSON.parse(new Buffer(req.path[3], 'base64').toString());
    if (!reset.u || !reset.r || !reset.k) throw jsGen.Err(jsGen.lib.msg.resetInvalid);
    if (cache[reset.u]) _id = jsGen.dao.user.convertID(cache[reset.u]._id);
    else throw jsGen.Err(jsGen.lib.msg.resetInvalid);
    jsGen.dao.user.getAuth(_id, dm.intercept(function(doc) {
        var userObj = {};
        userObj._id = _id;
        if (doc && doc.resetKey && (Date.now() - doc.resetDate) / 86400000 < 3) {
            if (HmacMD5(HmacMD5(doc.resetKey, reset.r), reset.u, 'base64') === reset.k) {
                switch (reset.r) {
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
                        throw jsGen.Err(jsGen.lib.msg.resetInvalid);
                }
                userObj.resetDate = Date.now();
                userObj.resetKey = '';
                jsGen.dao.user.setUserInfo(userObj, dm.intercept(function(doc) {
                    if (doc) {
                        doc._id = jsGen.dao.user.convertID(doc._id);
                        body = union(UserPrivateTpl);
                        body = intersect(body, doc);
                        setCache(body);
                        req.session.Uid = body._id;
                        req.session.role = body.role;
                    }
                    return res.redirect('/');
                }));
            } else throw jsGen.Err(jsGen.lib.msg.resetInvalid);
        } else throw jsGen.Err(jsGen.lib.msg.resetOutdate);
    }));
};

function getFn(req, res, dm) {
    switch (req.path[2]) {
        case undefined:
        case 'index':
            return getUserInfo(req, res, dm);
        case 'logout':
            return logout(req, res, dm);
        case 'admin':
            return getUsers(req, res, dm);
        case 'reset':
            return resetUser(req, res, dm);
        default:
            return getUser(req, res, dm);
    }
};

function postFn(req, res, dm) {
    switch (req.path[2]) {
        case undefined:
        case 'index':
            return editUser(req, res, dm);
        case 'login':
            return login(req, res, dm);
        case 'register':
            return register(req, res, dm);
        case 'admin':
            return editUsers(req, res, dm);
        case 'reset':
            return getReset(req, res, dm);
    }
};

module.exports = {
    GET: getFn,
    POST: postFn,
    userCache: userCache,
    convertUsers: convertUsers
};
