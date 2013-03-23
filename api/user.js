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
    userCache = jsGen.cache.user,
    filterSummary = jsGen.lib.tools.filterSummary,
    pagination = jsGen.lib.tools.pagination,
    checkTimeInterval = jsGen.lib.tools.checkTimeInterval;

userCache.getP = function (Uid, callback, convert) {
    var that = this,
        doc = this.get(Uid);

    callback = callback || jsGen.lib.tools.callbackFn;
    if (convert === undefined) {
        convert = true;
    }

    function getConvert(doc) {
        doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
        doc.followList = convertUsers(doc.followList, 'Uid');
    };
    if (doc) {
        if (convert) {
            getConvert(doc);
        }
        return callback(null, doc);
    } else jsGen.dao.user.getUserInfo(jsGen.dao.user.convertID(Uid), function (err, doc) {
        if (doc) {
            doc._id = Uid;
            doc = intersect(union(UserPrivateTpl), doc);
            that.put(Uid, doc);
            if (convert) {
                getConvert(doc);
            }
        }
        return callback(err, doc);
    });
};

var cache = {
    _initTime: 0,
    _index: []
};
cache._update = function (obj) {
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
cache._remove = function (Uid) {
    var i, that = this;
    if (this[Uid]) {
        delete this[this[Uid].name];
        delete this[this[Uid].email];
        delete this[Uid];
        this._index.splice(i = this._index.indexOf(Uid), i >= 0 ? 1 : 0);
        this._initTime = Date.now();
    }
    return this;
};
(function () {
    var that = this;
    jsGen.config.users = 0;
    jsGen.dao.user.getUsersIndex(function (err, doc) {
        if (err) {
            throw err;
        }
        if (doc) {
            doc._id = jsGen.dao.user.convertID(doc._id);
            that._update(doc);
            jsGen.config.users += 1;
        }
    });
}).call(cache);

function convertUsers(_idArray, mode) {
    var result = [];
    if (!Array.isArray(_idArray)) {
        _idArray = [_idArray];
    }
    if (typeof _idArray[0] === 'number') {
        _idArray = _idArray.map(function (x) {
            return jsGen.dao.user.convertID(x);
        });
    }
    if (mode === 'Uid') {
        return _idArray;
    }
    if (typeof _idArray[0] !== 'string') {
        return result;
    }
    _idArray.forEach(function (x, i) {
        if (cache[x]) {
            result.push({
                _id: cache[x]._id,
                name: cache[x].name,
                avatar: cache[x].avatar
            });
        }
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
    if (body.err) {
        return callback(body.err, body);
    }
    delete userObj._id;
    userObj.avatar = gravatar(userObj.email);
    userObj.resetDate = Date.now();
    jsGen.dao.user.setNewUser(userObj, function (err, doc) {
        if (doc) {
            doc._id = jsGen.dao.user.convertID(doc._id);
            body = union(UserPrivateTpl);
            body = intersect(body, doc);
            body.err = null;
            cache._update(body);
            jsGen.config.users += 1;
        }
        return callback(err, body);
    });
};

function logout(req, res, dm) {
    req.delsession();
    return res.sendjson({
        logout: true
    });
};

function login(req, res, dm) {
    var data = req.apibody;

    if (!cache[data.logname]) {
        if (checkEmail(data.logname)) {
            throw jsGen.Err(jsGen.lib.msg.userEmailNone);
        } else if (checkUserID(data.logname)) {
            throw jsGen.Err(jsGen.lib.msg.UidNone);
        } else if (checkUserName(data.logname)) {
            throw jsGen.Err(jsGen.lib.msg.userNameNone);
        } else {
            throw jsGen.Err(jsGen.lib.msg.logNameErr);
        }
    }
    var _id = jsGen.dao.user.convertID(cache[data.logname]._id);
    jsGen.dao.user.getAuth(_id, dm.intercept(function (doc) {
        if (doc.locked) {
            throw jsGen.Err(jsGen.lib.msg.userLocked, 'locked');
        } else if (doc.loginAttempts >= 5) {
            jsGen.dao.user.setUserInfo({
                _id: _id,
                locked: true
            }, dm.intercept(function (doc) {
                jsGen.dao.user.setLoginAttempt({
                    _id: _id,
                    loginAttempts: 0
                });
            }));
            throw jsGen.Err(jsGen.lib.msg.loginAttempts);
        }
        if (data.logpwd === HmacSHA256(doc.passwd, data.logname)) {
            doc._id = jsGen.dao.user.convertID(doc._id);
            req.session.Uid = doc._id;
            req.session.role = doc.role;
            if (doc.loginAttempts > 0) {
                jsGen.dao.user.setLoginAttempt({
                    _id: _id,
                    loginAttempts: 0
                });
            }
            var date = Date.now();
            jsGen.dao.user.setLogin({
                _id: _id,
                lastLoginDate: date,
                login: {
                    date: date,
                    ip: req.ip
                }
            });
            userCache.getP(doc._id, dm.intercept(function (doc) {
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

    if (!jsGen.config.register) {
        throw jsGen.Err(jsGen.lib.msg.registerClose);
    }
    if (checkTimeInterval(req, 'Re')) {
        throw jsGen.Err(jsGen.lib.msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]');
    }
    adduser(data, dm.intercept(function (doc) {
        if (doc) {
            checkTimeInterval(req, 'Re', dm);
            req.session.Uid = doc._id;
            req.session.role = doc.role;
            setReset({
                u: doc._id,
                r: 'role'
            }, dm.intercept(function () {
                if (jsGen.config.email) {
                    var url = jsGen.config.url + '/' + doc._id;
                    jsGen.lib.email.tpl(jsGen.config.title, doc.name, jsGen.config.email, url, 'register').send();
                }
            }));
            return res.sendjson(doc);
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
    jsGen.dao.user.setUserInfo(userObj, function (err, doc) {
        if (err) {
            return callback(err, null);
        }
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

    if (req.session.role !== 'admin') {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    if (!Array.isArray(req.apibody)) {
        req.apibody = [req.apibody];
    }
    req.apibody.reverse();
    next();

    function next() {
        var userObj = req.apibody.pop();
        if (!userObj) {
            return res.sendjson(body);
        }
        adduser(userObj, dm.intercept(function (doc) {
            body.push(doc);
            return next();
        }));
    };
};

function getUser(req, res, dm) {
    var Uid = req.path[2];
    if (checkUserID(Uid) && cache[Uid]) {
        Uid = cache[Uid]._id;
    } else {
        throw jsGen.Err(jsGen.lib.msg.UidNone);
    }
    userCache.getP(Uid, dm.intercept(function (user) {
        var list, key = Uid + req.path[3];
        p = req.getparam.p || req.getparam.page || 1;
        p = Number(p);
        list = jsGen.cache.pagination.get(key);
        if (!list || p === 1) {
            if (req.path[3] === 'fans') {
                list = convertUsers(user.fansList, 'Uid');
                jsGen.cache.pagination.put(key, list);
                getPagination();
            } else {
                jsGen.api.article.convertArticles(user.articlesList, dm.intercept(function (IDList) {
                    list = [];
                    IDList.forEach(function (ID) {
                        if (jsGen.api.article.cache[ID] && jsGen.api.article.cache[ID].status > -1) list.push(ID);
                    });
                    list.reverse();
                    jsGen.cache.pagination.put(key, list);
                    getPagination();
                }), 'id');
            }
        } else {
            getPagination();
        }

        function getPagination() {
            var cache;
            if (req.path[3] === 'fans') {
                cache = userCache;
            } else {
                cache = jsGen.cache.list;
                list.forEach(function (ID, i) {
                    if (jsGen.api.article.cache[ID].display >= 2) {
                        list.splice(i, 1);
                    }
                });
            }
            pagination(req, list, cache, dm.intercept(function (doc) {
                var body = doc;
                if (p === 1 && req.path[3] === 'index') {
                    body.user = intersect(union(UserPublicTpl), user);
                }
                return res.sendjson(body);
            }));
        };
    }));
};

function setUser(req, res, dm) {
    var Uid = req.path[2];

    if (checkUserID(Uid) && cache[Uid]) {
        Uid = cache[Uid]._id;
    } else {
        throw jsGen.Err(jsGen.lib.msg.UidNone);
    }
    if (!req.session.Uid) {
        throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    } else if (req.session.Uid === Uid || !req.apibody) {
        throw jsGen.Err(jsGen.lib.msg.requestDataErr);
    }
    if (checkTimeInterval(req, 'Fo')) {
        throw jsGen.Err(jsGen.lib.msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]');
    }
    var _id = jsGen.dao.user.convertID(Uid);
    var _idReq = jsGen.dao.user.convertID(req.session.Uid);
    var follow = !! req.apibody.follow;
    userCache.getP(req.session.Uid, dm.intercept(function (doc) {
        if (follow && doc.followList.indexOf(_id) >= 0) {
            throw jsGen.Err(jsGen.lib.msg.userFollowed);
        } else if (!follow && doc.followList.indexOf(_id) < 0) {
            throw jsGen.Err(jsGen.lib.msg.userUnfollowed);
        }
        jsGen.dao.user.setFollow({
            _id: _idReq,
            followList: follow ? _id : -_id
        }, dm.intercept(function (doc) {
            jsGen.dao.user.setFans({
                _id: _id,
                fansList: follow ? _idReq : -_idReq
            });
            userCache.update(Uid, function (value) {
                var i;
                if (follow) {
                    value.fansList.push(_idReq);
                } else {
                    value.fansList.splice(i = value.fansList.indexOf(_idReq), i >= 0 ? 1 : 0);
                }
                return value;
            });
            userCache.update(req.session.Uid, function (value) {
                var i;
                if (follow) {
                    value.followList.push(_id);
                } else {
                    value.followList.splice(i = value.followList.indexOf(_id), i >= 0 ? 1 : 0);
                }
                return value;
            });
            checkTimeInterval(req, 'Fo', dm);
            return res.sendjson({
                follow: follow
            });
        }));
    }), false);
};

function getUsers(req, res, dm) {
    if (req.session.role !== 'admin') {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    pagination(req, cache._index, userCache, dm.intercept(function (doc) {
        var data;
        for (var i = doc.data.length - 1; i >= 0; i--) {
            data = union(UserPublicTpl);
            intersect(data, doc.data[i]);
            data.email = doc.data[i].email;
            doc.data[i] = data;
        };
        return res.sendjson(doc);
    }));
};

function getUserInfo(req, res, dm) {
    if (!req.session.Uid) {
        throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    }
    userCache.getP(req.session.Uid, dm.intercept(function (doc) {
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

    if (!req.session.Uid) {
        throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    }
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
    if (userObj.sex && ['male', 'female'].indexOf(userObj.sex) < 0) {
        delete userObj.sex;
    }
    if (userObj.avatar && !checkUrl(userObj.avatar)) {
        delete userObj.avatar;
    }
    if (userObj.desc) {
        userObj.desc = filterSummary(userObj.desc);
    }
    if (userObj.tagsList) {
        jsGen.api.tag.filterTags(userObj.tagsList.slice(0, jsGen.config.UserTagsMax), dm.intercept(function (doc) {
            if (doc) {
                userObj.tagsList = doc;
            }
            userCache.getP(req.session.Uid, dm.intercept(function (doc) {
                var tagList = {},
                setTagList = [];
                if (doc) {
                    doc.tagsList.forEach(function (x) {
                        tagList[x] = -userObj._id;
                    });
                }
                userObj.tagsList.forEach(function (x) {
                    if (tagList[x]) {
                        delete tagList[x];
                    } else {
                        tagList[x] = userObj._id;
                    }
                });
                for (var key in tagList) {
                    setTagList.push({
                        _id: Number(key),
                        usersList: tagList[key]
                    });
                }
                setTagList.forEach(function (x) {
                    jsGen.api.tag.setTag(x);
                });
                daoExec();
            }), false);
        }));
    } else {
        daoExec();
    }

    function daoExec() {
        jsGen.dao.user.setUserInfo(userObj, dm.intercept(function (doc) {
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

    if (req.session.Uid !== 'Uadmin') {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    if (!req.apibody.data) {
        throw jsGen.Err(jsGen.lib.msg.requestDataErr);
    }
    if (!Array.isArray(req.apibody.data)) {
        req.apibody.data = [req.apibody.data];
    }
    req.apibody.data.reverse();
    next();

    function next() {
        var userObj = req.apibody.data.pop();
        if (!userObj) {
            return res.sendjson(body);
        }
        if (!userObj._id) {
            throw jsGen.Err(jsGen.lib.msg.UidNone);
        }
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
        if (userObj.role && ['admin', 'editor', 'author', 'user', 'guest', 'forbid'].lastIndexOf(userObj.role) < 0) {
            delete userObj.role;
        }
        if (userObj.locked !== false) {
            delete userObj.locked;
        }
        jsGen.dao.user.setUserInfo(userObj, dm.intercept(function (doc) {
            if (doc) {
                doc._id = jsGen.dao.user.convertID(doc._id);
                setCache(doc);
                var data = intersect(union(UserPublicTpl), doc);
                data.email = doc.email;
                body.data.push(data);
            }
            return next();
        }));
    };
};

function getReset(req, res, dm) {
    var resetObj = {};
    resetObj.r = req.apibody.request;
    if (!resetObj.r || ['locked', 'email', 'passwd'].indexOf(resetObj.r) === -1) {
        throw jsGen.Err(jsGen.lib.msg.resetInvalid);
    }
    if (resetObj.r === 'email') {
        resetObj.e = req.apibody.email;
        if (!req.session.Uid) {
            throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
        }
        if (!checkEmail(resetObj.e)) {
            throw jsGen.Err(jsGen.lib.msg.userEmailErr);
        }
        if (cache[resetObj.e]) {
            throw jsGen.Err(jsGen.lib.msg.userEmailExist);
        }
        resetObj.u = req.session.Uid;
    } else {
        if ((checkUserID(req.apibody.name) || checkUserName(req.apibody.name)) && cache[req.apibody.name]) {
            resetObj.u = cache[req.apibody.name]._id;
            resetObj.e = cache[req.apibody.name].email;
        } else {
            throw jsGen.Err(jsGen.lib.msg.resetInvalid);
        }
        if (req.apibody.email !== resetObj.e) {
            throw jsGen.Err(jsGen.lib.msg.resetInvalid);
        }
    }
    setReset(resetObj, dm.intercept(function () {
        return res.sendjson({
            name: 'success',
            message: jsGen.lib.msg.requestSent
        });
    }));
};

function resetUser(req, res, dm) {
    var body = {};
    var _id = null;

    var reset = JSON.parse(new Buffer(req.path[3], 'base64').toString());
    if (!reset.u || !reset.r || !reset.k) {
        throw jsGen.Err(jsGen.lib.msg.resetInvalid);
    }
    if (checkUserID(reset.u) && cache[reset.u]) {
        _id = jsGen.dao.user.convertID(cache[reset.u]._id);
    } else {
        throw jsGen.Err(jsGen.lib.msg.resetInvalid);
    }
    jsGen.dao.user.getAuth(_id, dm.intercept(function (doc) {
        var userObj = {};
        userObj._id = _id;
        if (doc && doc.resetKey && (Date.now() - doc.resetDate) / 86400000 < 1) {
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
                jsGen.dao.user.setUserInfo(userObj, dm.intercept(function (doc) {
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
            } else {
                throw jsGen.Err(jsGen.lib.msg.resetInvalid);
            }
        } else {
            throw jsGen.Err(jsGen.lib.msg.resetOutdate);
        }
    }));
};

function getArticles(req, res, dm) {
    var list, key,
    p = req.getparam.p || req.getparam.page || 1;

    p = Number(p);
    if (!req.session.Uid) {
        throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    }
    key = req.session.Uid + req.path[2];
    list = jsGen.cache.pagination.get(key);

    if (!list || p === 1) {
        userCache.getP(req.session.Uid, dm.intercept(function (user) {
            if (req.path[2] === 'mark') {
                jsGen.api.article.convertArticles(user.markList, dm.intercept(function (IDList) {
                    jsGen.cache.pagination.put(req.session.Uid + 'mark', IDList.reverse());
                    list = jsGen.cache.pagination.get(key);
                    getPagination();
                }), 'id');
            } else {
                jsGen.api.article.convertArticles(user.articlesList, dm.intercept(function (IDList) {
                    var articlesList = [],
                        commentsList = [];
                    IDList.forEach(function (ID) {
                        if (jsGen.api.article.cache[ID] && jsGen.api.article.cache[ID].status > -1) articlesList.push(ID);
                        else commentsList.push(ID);
                    });
                    jsGen.cache.pagination.put(req.session.Uid + 'article', articlesList.reverse());
                    jsGen.cache.pagination.put(req.session.Uid + 'comment', commentsList.reverse());
                    list = jsGen.cache.pagination.get(key);
                    getPagination();
                }), 'id');
            }
        }), false);
    } else {
        getPagination();
    }

    function getPagination() {
        pagination(req, list, jsGen.cache.list, dm.intercept(function (articlesList) {
            return res.sendjson(articlesList);
        }));
    };
};

function getUsersList(req, res, dm) {
    var list,
    p = req.getparam.p || req.getparam.page || 1;

    p = Number(p);
    if (!req.session.Uid) {
        throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    }
    userCache.getP(req.session.Uid, dm.intercept(function (user) {
        if (req.path[2] === 'fans') {
            list = user.fansList;
        } else if (req.path[2] === 'follow') {
            list = user.followList;
        } else {
            throw jsGen.Err(jsGen.lib.msg.requestDataErr);
        }
        list = convertUsers(list, 'Uid');
        pagination(req, list, userCache, dm.intercept(function (usersList) {
            usersList.data.forEach(function (user, i) {
                usersList.data[i] = intersect(union(UserPublicTpl), user);
            });
            return res.sendjson(usersList);
        }));
    }), false);
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
        case 'article':
        case 'comment':
        case 'mark':
            return getArticles(req, res, dm);
        case 'fans':
        case 'follow':
            return getUsersList(req, res, dm);
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
        default:
            return setUser(req, res, dm);
    }
};

module.exports = {
    GET: getFn,
    POST: postFn,
    cache: cache,
    convertUsers: convertUsers
};
