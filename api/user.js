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
        calcuScore(doc);
        doc._id = jsGen.dao.user.convertID(Uid);
        doc.tagsList = jsGen.api.tag.convertTags(doc.tagsList);
        doc.followList = convertUsers(doc.followList, 'Uid');
        jsGen.dao.user.setUserInfo({
            _id: Uid,
            score: doc.score
        });
        delete doc.fansList;
        delete doc.articlesList;
        delete doc.collectionsList;
    };
    if (doc) {
        if (convert) {
            getConvert(doc);
        }
        return callback(null, doc);
    } else jsGen.dao.user.getUserInfo(Uid, function (err, doc) {
            if (doc) {
                doc = intersect(union(UserPrivateTpl), doc);
                that.put(Uid, doc);
                if (convert) {
                    getConvert(doc);
                }
            }
            return callback(err, doc);
        });
};

jsGen.cache.userAll = {
    _initTime: 0,
    _index: []
};
var cache = jsGen.cache.userAll;
cache._update = function (obj) {
    if (!this[obj._id]) {
        this[obj._id] = {};
        this._index.push(obj._id);
    }
    this[obj._id]._id = obj._id;
    this[obj._id].name = obj.name;
    this[obj._id].email = obj.email;
    this[obj._id].avatar = obj.avatar;
    this[obj.name.toLowerCase()] = this[obj._id];
    this[obj.email.toLowerCase()] = this[obj._id];
    this._initTime = Date.now();
    return this;
};
cache._remove = function (Uid) {
    var i = this._index.indexOf(Uid),
        that = this;
    if (this[Uid]) {
        delete this[this[Uid].name.toLowerCase()];
        delete this[this[Uid].email.toLowerCase()];
        delete this[Uid];
        if (i >= 0) {
            this._index.splice(i, 1);
        }
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
            that._update(doc);
            jsGen.config.users += 1;
        }
    });
}).call(cache);

function convertUsers(UidArray, mode) {
    var result = [];
    if (!Array.isArray(UidArray)) {
        UidArray = [UidArray];
    }
    if (UidArray.length === 0) {
        return result;
    }
    if (mode === 'Uid') {
        for (var i = 0, len = UidArray.length; i < len; i++) {
            result[i] = jsGen.dao.user.convertID(UidArray[i]);
        }
        return result;
    } else {
        for (var i = 0, len = UidArray.length; i < len; i++) {
            var user = cache[UidArray[i]];
            if (user) {
                result.push({
                    _id: jsGen.dao.user.convertID(user._id),
                    name: user.name,
                    avatar: user.avatar
                });
            }
        }
        return result;
    }
};

function calcuScore(user) {
    //UsersScore: [1, 3, 5, 10, 0.5, 1]
    // 用户积分系数，表示评论×1，文章×3，关注×5，粉丝×10，文章热度×0.5，注册时长天数×1
    user.score = 0;
    for (var i = user.articlesList.length - 1; i >= 0; i--) {
        if (jsGen.api.article.cache[user.articlesList[i]].status === -1) {
            user.score += jsGen.config.UsersScore[0];
        } else {
            user.score += jsGen.config.UsersScore[1];
        }
        user.score += jsGen.config.UsersScore[4] * (jsGen.api.article.cache[user.articlesList[i]].hots || 0);
    };
    user.score += jsGen.config.UsersScore[2] * (user.follow || 0);
    user.score += jsGen.config.UsersScore[3] * (user.fans || 0);
    user.score += jsGen.config.UsersScore[5] * Math.floor((Date.now() - user.date) / 86400000);
    user.score = Math.round(user.score);
    cache._update(user);
};

function setCache(obj) {
    cache._remove(obj._id);
    cache._update(obj);
    obj = intersect(union(UserPrivateTpl), obj);
    userCache.put(obj._id, obj);
};

function adduser(userObj, callback) {
    var err;
    callback = callback || jsGen.lib.tools.callbackFn;
    if (!checkEmail(userObj.email)) {
        err = jsGen.lib.msg.userEmailErr;
    } else if (cache[userObj.email.toLowerCase()]) {
        err = jsGen.lib.msg.userEmailExist;
    } else if (!checkUserName(userObj.name)) {
        err = jsGen.lib.msg.userNameErr;
    } else if (cache[userObj.name.toLowerCase()]) {
        err = jsGen.lib.msg.userNameExist;
    }
    if (err) {
        return callback(jsGen.Err(err), null);
    }
    delete userObj._id;
    userObj.email = userObj.email.toLowerCase();
    userObj.avatar = gravatar(userObj.email);
    userObj.resetDate = Date.now();
    userObj.role = jsGen.config.emailVerification ? 1 : 2;
    jsGen.dao.user.setNewUser(userObj, function (err, doc) {
        if (doc) {
            setCache(doc);
            jsGen.config.users += 1;
        }
        return callback(err, doc);
    });
};

function userLogin(loginData, callback) {
    var Uid, date = Date.now();
    callback = callback || jsGen.lib.tools.callbackFn;
    loginData.logname = loginData.logname + '';
    if (checkUserID(loginData.logname)) {
        Uid = jsGen.dao.user.convertID(loginData.logname);
        if (!cache[Uid]) {
            return callback(jsGen.Err(jsGen.lib.msg.UidNone));
        }
    } else if (loginData.logname[0] === '_' || !cache[loginData.logname.toLowerCase()]) {
        if (checkEmail(loginData.logname)) {
            return callback(jsGen.Err(jsGen.lib.msg.userEmailNone));
        } else if (checkUserName(loginData.logname)) {
            return callback(jsGen.Err(jsGen.lib.msg.userNameNone));
        } else {
            return callback(jsGen.Err(jsGen.lib.msg.logNameErr));
        }
    } else if (date - loginData.logtime > 259200000) {
        return callback(jsGen.Err(jsGen.lib.msg.requestOutdate));
    } else {
        Uid = cache[loginData.logname.toLowerCase()]._id;
    }
    jsGen.dao.user.getAuth(Uid, function (err, doc) {
        if (!doc) {
            return callback(jsGen.Err(jsGen.lib.msg.dbErr));
        } else if (doc.locked) {
            return callback(jsGen.Err(jsGen.lib.msg.userLocked, 'locked'));
        } else if (doc.loginAttempts >= 5) {
            jsGen.dao.user.setUserInfo({
                _id: Uid,
                locked: true
            }, function (err, doc) {
                jsGen.dao.user.setLoginAttempt({
                    _id: Uid,
                    loginAttempts: 0
                });
            });
            return callback(jsGen.Err(jsGen.lib.msg.loginAttempts));
        }
        if (loginData.logpwd === HmacSHA256(doc.passwd, loginData.logname + ':' + loginData.logtime)) {
            if (doc.loginAttempts > 0) {
                jsGen.dao.user.setLoginAttempt({
                    _id: Uid,
                    loginAttempts: 0
                });
            }
            callback(null, Uid, doc.passwd);
            jsGen.dao.user.setLogin({
                _id: Uid,
                lastLoginDate: date,
                login: {
                    date: date,
                    ip: req.ip
                }
            });
        } else {
            jsGen.dao.user.setLoginAttempt({
                _id: Uid,
                loginAttempts: 1
            });
            return callback(jsGen.Err(jsGen.lib.msg.userPasswd, 'passwd'));
        }
    });
};

function logout(req, res, dm) {
    req.delsession();
    res.clearcookie('autologin');
    return res.sendjson({
        logout: true
    });
};

function cookieLoginUpdate(Uid, callback) {
    callback = callback || jsGen.lib.tools.callbackFn;
    jsGen.dao.user.getAuth(Uid, function (err, doc) {
        var data = {};
        if (!doc) {
            return callback();
        } else {
            data.n = Uid;
            data.t = Date.now();
            data.p = HmacSHA256(doc.passwd, data.n + ':' + data.t);
            return callback(new Buffer(JSON.stringify(data)).toString('base64'));
        }
    });
}

function cookieLogin(cookie, callback) {
    var data = JSON.parse(new Buffer(cookie, 'base64').toString());
    if (typeof data !== 'object') {
        return callback();
    } else {
        data.logname = data.n;
        data.logtime = data.t
        data.logpwd = data.p
        userLogin(data, function (err, Uid) {
            return callback(Uid);
        });
    }
};

function login(req, res, dm) {
    var Uid, data = req.apibody;
    if (typeof req.apibody !== 'object') {
        throw jsGen.Err(jsGen.lib.msg.requestDataErr);
    } else {
        userLogin(req.apibody, dm.intercept(function (Uid) {
            userCache.getP(Uid, dm.intercept(function (doc) {
                req.session.Uid = Uid;
                req.session.role = doc.role;
                req.session.logauto = req.apibody.logauto;
                if (req.session.logauto) {
                    cookieLoginUpdate(Uid, function (cookie) {
                        if (cookie) {
                            res.cookie('autologin', cookie, {
                                maxAge: 259200000,
                                path: '/',
                                httpOnly: true
                            });
                        }
                        return res.sendjson(doc);
                    });
                } else {
                    return res.sendjson(doc);
                }
            }));
        }));
    }
};

function register(req, res, dm) {
    var data = req.apibody;

    function emailToAdmin(doc) {
        if (jsGen.config.email) {
            var url = jsGen.config.url + '/' + doc._id;
            jsGen.lib.email.tpl(jsGen.config.title, doc.name, jsGen.config.email, url, 'register').send();
        }
    }

    if (!jsGen.config.register) {
        throw jsGen.Err(jsGen.lib.msg.registerClose);
    }
    if (checkTimeInterval(req, 'Re')) {
        throw jsGen.Err(jsGen.lib.msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]');
    }
    adduser(data, dm.intercept(function (doc) {
        if (doc) {
            checkTimeInterval(req, 'Re', true);
            req.session.Uid = doc._id;
            req.session.role = doc.role;
            doc._id = jsGen.dao.user.convertID(doc._id);
            if (jsGen.config.emailVerification) {
                setReset({
                    u: doc._id,
                    r: 'role'
                }, emailToAdmin.bind(null, doc));
            } else {
                emailToAdmin(doc);
            }
            return res.sendjson(doc);
        }
    }));
};

function setReset(resetObj, callback) {
    // var resetObj = {
    //     u: 'Uxxxxx'
    //     r: 'request= role/locked/email/passwd',
    //     e: 'email',
    //     k: 'resetKey'
    // };
    var userObj = {},
        callback = callback || jsGen.lib.tools.callbackFn;

    userObj._id = resetObj.u;
    userObj.resetDate = Date.now();
    userObj.resetKey = SHA256(userObj.resetDate + '');
    jsGen.dao.user.setUserInfo(userObj, function (err, doc) {
        if (!doc) {
            return callback(err, null);
        } else {
            resetObj.k = HmacMD5(HmacMD5(userObj.resetKey, resetObj.r), resetObj.u + '', 'base64');
            var resetUrl = new Buffer(JSON.stringify(resetObj)).toString('base64');
            resetUrl = jsGen.config.url + '/api/user/reset/' + resetUrl;
            var email = resetObj.e || doc.email;
            return jsGen.lib.email.tpl(jsGen.config.title, doc.name, email, resetUrl, resetObj.r).send(callback);
        }
    });
};

function addUsers(req, res, dm) {
    var body = [];

    if (req.session.role < 5) {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    var userArray = req.apibody.data;
    if (!Array.isArray(userArray)) {
        userArray = [userArray];
    }
    userArray.reverse();
    next();

    function next() {
        var userObj;
        if (userArray.length === 0) {
            return res.sendjson(body);
        }
        userObj = userArray.pop();
        if (!userObj) {
            return next();
        }
        adduser(userObj, dm.intercept(function (doc) {
            var data;
            if (doc) {
                data = intersect(union(UserPublicTpl), doc);
                data._id = jsGen.dao.user.convertID(doc._id);
                data.email = doc.email;
                body.push(doc);
                setReset({
                    u: doc._id,
                    r: 'role'
                });
            }
            return next();
        }));
    };
};

function getUser(req, res, dm) {
    var userID, Uid = decodeURI(req.path[2]);
    if (checkUserID(Uid)) {
        userID = Uid
        Uid = jsGen.dao.user.convertID(userID);
        if (!cache[Uid]) {
            throw jsGen.Err(jsGen.lib.msg.UidNone);
        }
    } else if (checkUserName(Uid) && cache[Uid.toLowerCase()]) {
        Uid = cache[Uid]._id;
        userID = jsGen.dao.user.convertID(Uid);
    } else {
        throw jsGen.Err(jsGen.lib.msg.UidNone);
    }
    userCache.getP(Uid, dm.intercept(function (user) {
        var list, key = 'Pub' + userID + req.path[3],
            p = req.getparam.p || req.getparam.pageIndex || 1;
        p = +p;
        list = jsGen.cache.pagination.get(key);
        if (!list || p === 1) {
            if (req.path[3] === 'fans') {
                list = user.fansList;
                jsGen.cache.pagination.put(key, list);
                getPagination();
            } else {
                list = [];
                user.articlesList.forEach(function (ID) {
                    var article = jsGen.api.article.cache[ID];
                    if (article && article.status > -1 && article.display < 2) list.push(ID);
                });
                list.reverse();
                jsGen.cache.pagination.put(key, list);
                getPagination();
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
            }
            pagination(req, list, cache, dm.intercept(function (doc) {
                if (p === 1 && req.path[3] === 'index' || !req.path[3]) {
                    userCache.getP(Uid, dm.intercept(function (user) {
                        doc.user = intersect(union(UserPublicTpl), user);
                        doc.user._id = userID;
                        return res.sendjson(doc);
                    }));
                } else {
                    return res.sendjson(doc);
                }
            }));
        };
    }), false);
};

function setUser(req, res, dm) {
    var userID, Uid = decodeURI(req.path[2]);
    if (checkUserID(Uid)) {
        userID = Uid
        Uid = jsGen.dao.user.convertID(userID);
        if (!cache[Uid]) {
            throw jsGen.Err(jsGen.lib.msg.UidNone);
        }
    } else if (checkUserName(Uid) && cache[Uid.toLowerCase()]) {
        Uid = cache[Uid.toLowerCase()]._id;
        userID = jsGen.dao.user.convertID(Uid);
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

    var follow = !! req.apibody.follow;
    userCache.getP(req.session.Uid, dm.intercept(function (doc) {
        if (follow && doc.followList.indexOf(Uid) >= 0) {
            throw jsGen.Err(jsGen.lib.msg.userFollowed);
        } else if (!follow && doc.followList.indexOf(Uid) < 0) {
            throw jsGen.Err(jsGen.lib.msg.userUnfollowed);
        }
        jsGen.dao.user.setFollow({
            _id: req.session.Uid,
            followList: follow ? Uid : -Uid
        }, dm.intercept(function (doc) {
            jsGen.dao.user.setFans({
                _id: Uid,
                fansList: follow ? req.session.Uid : -req.session.Uid
            });
            userCache.update(Uid, function (value) {
                var i = value.fansList.indexOf(req.session.Uid);
                if (follow) {
                    value.fansList.push(req.session.Uid);
                } else if (i >= 0) {
                    value.fansList.splice(i, 1);
                }
                return value;
            });
            userCache.update(req.session.Uid, function (value) {
                var i = value.followList.indexOf(Uid);
                if (follow) {
                    value.followList.push(Uid);
                } else if (i >= 0) {
                    value.followList.splice(i, 1);
                }
                return value;
            });
            checkTimeInterval(req, 'Fo', true);
            return res.sendjson({
                follow: follow
            });
        }));
    }), false);
};

function getUsers(req, res, dm) {
    if (req.session.role < 5) {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    pagination(req, cache._index, userCache, dm.intercept(function (doc) {
        var data;
        for (var i = doc.data.length - 1; i >= 0; i--) {
            data = union(UserPublicTpl);
            intersect(data, doc.data[i]);
            data._id = doc.data[i]._id;
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
    var userID = jsGen.dao.user.convertID(req.session.Uid);
    userCache.getP(req.session.Uid, dm.intercept(function (user) {
        var list, key = userID + 'home',
            p = req.getparam.p || req.getparam.pageIndex || 1;
        p = +p;
        list = jsGen.cache.pagination.get(key);
        if (!list || p === 1) {
            var i = jsGen.api.article.cache._index.length - 1;
            list = [];
            checkList();

            function checkList() {
                var ID = jsGen.api.article.cache._index[i];
                if (!ID) {
                    return checkList();
                }
                i -= 1;
                if (i === -1 || list.length >= 500) {
                    list.sort(function (a, b) {
                        return jsGen.api.article.cache[b].updateTime - jsGen.api.article.cache[a].updateTime;
                    });
                    jsGen.cache.pagination.put(key, list);
                    return getPagination();
                } else {
                    jsGen.cache.list.getP(ID, dm.intercept(function (article) {
                        var checkTag = user.tagsList.some(function (x) {
                            if (article.tagsList.indexOf(x) >= 0) return true;
                        });
                        if (checkTag || req.session.Uid === article.author || user.followList.indexOf(article.author) >= 0) {
                            list.push(ID);
                        }
                        return checkList();
                    }), false);
                }
            };
        } else {
            getPagination();
        }

        function getPagination() {
            pagination(req, list, jsGen.cache.list, dm.intercept(function (doc) {
                var now = Date.now();
                doc.readtimestamp = user.readtimestamp;
                if (p === 1) {
                    jsGen.dao.user.setUserInfo({
                        _id: req.session.Uid,
                        readtimestamp: now
                    });
                    userCache.update(req.session.Uid, function (value) {
                        value.readtimestamp = now;
                        return value;
                    });
                    userCache.getP(req.session.Uid, dm.intercept(function (user) {
                        doc.user = user;
                        return res.sendjson(doc);
                    }));
                } else {
                    return res.sendjson(doc);
                }
            }));
        };
    }), false);
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
    userObj._id = req.session.Uid;
    if (userObj.name) {
        if (!checkUserName(userObj.name)) {
            throw jsGen.Err(jsGen.lib.msg.userNameErr);
        } else if (userObj.name === cache[req.session.Uid].name) {
            delete userObj.name;
        } else if (cache[userObj.name.toLowerCase()]) {
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
                        _id: +key,
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
                setCache(doc);
                userCache.getP(req.session.Uid, dm.intercept(function (user) {
                    return res.sendjson(user);
                }));
            }
        }));
    };
};

function editUsers(req, res, dm) {
    var defaultObj = {
        _id: '',
        email: '',
        locked: false,
        role: 0
    },
        userArray = req.apibody.data,
        body = {
            data: []
        };

    if (req.session.role !== 5) {
        throw jsGen.Err(jsGen.lib.msg.userRoleErr);
    }
    if (!userArray) {
        throw jsGen.Err(jsGen.lib.msg.requestDataErr);
    }
    if (!Array.isArray(userArray)) {
        userArray = [userArray];
    }
    userArray.reverse();
    next();

    function next() {
        var userObj;
        if (userArray.length === 0) {
            return res.sendjson(body);
        }
        userObj = userArray.pop();
        if (!userObj || !userObj._id) {
            return next();
        }
        userObj = intersect(union(defaultObj), userObj);
        var userID = userObj._id;
        userObj._id = jsGen.dao.user.convertID(userID);
        if (!cache[userObj._id]) {
            return next();
        }
        if (userObj.email) {
            if (!checkEmail(userObj.email)) {
                throw jsGen.Err(jsGen.lib.msg.userEmailErr);
            } else if (userObj.email.toLowerCase() === cache[req.session.Uid].email.toLowerCase()) {
                delete userObj.email;
            } else if (cache[userObj.email.toLowerCase()]) {
                throw jsGen.Err(jsGen.lib.msg.userEmailExist);
            }
        }
        if (userObj.role) {
            userObj.role = Math.floor(userObj.role);
            if (userObj.role < 0 || userObj.role > 5) {
                delete userObj.role;
            }
        }
        if (userObj.locked !== false) {
            delete userObj.locked;
        }
        jsGen.dao.user.setUserInfo(userObj, dm.intercept(function (doc) {
            if (doc) {
                setCache(doc);
                var data = intersect(union(UserPublicTpl), doc);
                data.email = doc.email;
                data._id = userID;
                body.data.push(data);
            }
            return next();
        }));
    };
};

function getReset(req, res, dm) {
    var resetObj = {};
    resetObj.r = req.apibody.request;
    if (!resetObj.r || ['locked', 'email', 'passwd', 'role'].indexOf(resetObj.r) === -1) {
        throw jsGen.Err(jsGen.lib.msg.resetInvalid);
    }
    if (resetObj.r === 'email') {
        if (!req.session.Uid) {
            throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
        }
        resetObj.e = req.apibody.email;
        if (resetObj.e) {
            resetObj.e = resetObj.e.toLowerCase();
            if (!checkEmail(resetObj.e)) {
                throw jsGen.Err(jsGen.lib.msg.userEmailErr);
            }
            if (cache[resetObj.e]) {
                throw jsGen.Err(jsGen.lib.msg.userEmailExist);
            }
        }
        resetObj.u = req.session.Uid;
    } else if (resetObj.r === 'role') {
        if (!req.session.Uid) {
            throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
        }
        resetObj.u = req.session.Uid;
    } else {
        if (checkUserID(req.apibody.name)) {
            var user = cache[jsGen.dao.user.convertID(req.apibody.name)];
            if (!user) {
                throw jsGen.Err(jsGen.lib.msg.resetInvalid);
            }
            resetObj.u = user._id;
            resetObj.e = user.email;
        } else if (checkUserName(req.apibody.name) && cache[req.apibody.name.toLowerCase()]) {
            var user = cache[req.apibody.name.toLowerCase()];
            resetObj.u = user._id;
            resetObj.e = user.email;
        } else {
            throw jsGen.Err(jsGen.lib.msg.resetInvalid);
        }
        if (req.apibody.email.toLowerCase() !== resetObj.e) {
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
    var Uid = null;

    var reset = JSON.parse(new Buffer(req.path[3], 'base64').toString());
    if (typeof reset !== 'object' || !reset.u || !reset.r || !reset.k) {
        throw jsGen.Err(jsGen.lib.msg.resetInvalid);
    }
    Uid = +reset.u;
    if (!cache[Uid]) {
        throw jsGen.Err(jsGen.lib.msg.resetInvalid);
    }
    jsGen.dao.user.getAuth(Uid, dm.intercept(function (doc) {
        var userObj = {};
        userObj._id = Uid;
        if (doc && doc.resetKey && (Date.now() - doc.resetDate) / 86400000 < 1) {
            if (HmacMD5(HmacMD5(doc.resetKey, reset.r), reset.u, 'base64') === reset.k) {
                switch (reset.r) {
                case 'locked':
                    userObj.locked = false;
                    break;
                case 'role':
                    userObj.role = 2;
                    break;
                case 'email':
                    userObj.email = reset.e.toLowerCase();
                    break;
                case 'passwd':
                    userObj.passwd = SHA256(reset.e);
                    break;
                default:
                    throw jsGen.Err(jsGen.lib.msg.resetInvalid);
                }
                userObj.resetDate = Date.now();
                userObj.resetKey = '';
                jsGen.dao.user.setUserInfo(userObj, dm.intercept(function (user) {
                    if (user) {
                        setCache(user);
                        req.session.Uid = user._id;
                        req.session.role = user.role;
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
        p = req.getparam.p || req.getparam.pageIndex || 1;

    p = +p;
    if (!req.session.Uid) {
        throw jsGen.Err(jsGen.lib.msg.userNeedLogin);
    }
    var userID = jsGen.dao.user.convertID(req.session.Uid);
    key = userID + req.path[2];
    list = jsGen.cache.pagination.get(key);

    if (!list || p === 1) {
        userCache.getP(req.session.Uid, dm.intercept(function (user) {
            if (req.path[2] === 'mark') {
                list = user.markList.reverse();
                jsGen.cache.pagination.put(userID + 'mark', list);
                getPagination();
            } else {
                var articlesList = [],
                    commentsList = [];
                for (var i = user.articlesList.length - 1; i >= 0; i--) {
                    if (jsGen.api.article.cache[user.articlesList[i]] && jsGen.api.article.cache[user.articlesList[i]].status > -1) {
                        articlesList.push(user.articlesList[i]);
                    } else {
                        commentsList.push(user.articlesList[i]);
                    }
                };
                jsGen.cache.pagination.put(userID + 'article', articlesList);
                jsGen.cache.pagination.put(userID + 'comment', commentsList);
                list = jsGen.cache.pagination.get(key);
                getPagination();
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
        p = req.getparam.p || req.getparam.pageIndex || 1;

    p = +p;
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
        pagination(req, list, userCache, dm.intercept(function (usersList) {
            for (var i = usersList.data.length - 1; i >= 0; i--) {
                var userID = usersList.data[i]._id;
                usersList.data[i] = intersect(union(UserPublicTpl), usersList.data[i]);
                usersList.data[i]._id = userID;
            };
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
    convertUsers: convertUsers,
    cookieLogin: cookieLogin,
    cookieLoginUpdate: cookieLoginUpdate
};