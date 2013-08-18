'use strict';
/*global require, module, Buffer, jsGen*/

var msg = jsGen.lib.msg,
    UserPublicTpl = jsGen.lib.json.UserPublicTpl,
    UserPrivateTpl = jsGen.lib.json.UserPrivateTpl,
    throwError = jsGen.lib.tools.throwError,
    errorHandler = jsGen.lib.tools.errorHandler,
    each = jsGen.lib.tools.each,
    removeItem = jsGen.lib.tools.remove,
    toArray = jsGen.lib.tools.toArray,
    union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    checkEmail = jsGen.lib.tools.checkEmail,
    checkUserID = jsGen.lib.tools.checkUserID,
    checkUserName = jsGen.lib.tools.checkUserName,
    checkUrl = jsGen.lib.tools.checkUrl,
    SHA256 = jsGen.lib.tools.SHA256,
    HmacSHA256 = jsGen.lib.tools.HmacSHA256,
    HmacMD5 = jsGen.lib.tools.HmacMD5,
    isJSON = jsGen.lib.tools.isJSON,
    gravatar = jsGen.lib.tools.gravatar,
    then = jsGen.module.then,
    cache = jsGen.lib.redis.userCache,
    userCache = jsGen.cache.user,
    filterSummary = jsGen.lib.tools.filterSummary,
    paginationList = jsGen.lib.tools.paginationList,
    checkTimeInterval = jsGen.lib.tools.checkTimeInterval,
    resJson = jsGen.lib.tools.resJson,
    callbackFn = jsGen.lib.tools.callbackFn,
    userDao = jsGen.dao.user,
    convertUserID = userDao.convertID,
    tagAPI = jsGen.api.tag,
    articleAPI = jsGen.api.article;

userCache.getP = function (Uid, convert) {
    var that = this,
        isCache = false,
        doc = this.get(Uid);

    convert = convert === undefined ? true : convert;

    return then(function (defer) {
        if (doc) {
            isCache = true;
            defer(null, doc);
        } else {
            userDao.getUserInfo(Uid, defer);
        }
    }).then(function (defer, doc) {
        if (!isCache) {
            doc = intersect(union(UserPrivateTpl), doc);
            that.put(Uid, doc);
        }
        if (convert) {
            calcuScore(doc);
            doc._id = convertUserID(Uid);
            doc.tagsList = tagAPI.convertTags(doc.tagsList);
            userDao.setUserInfo({
                _id: Uid,
                score: doc.score
            });
            delete doc.fansList;
            delete doc.articlesList;
            delete doc.collectionsList;
            convertUsers(doc.followList, 'Uid').then(function (defer2, list) {
                doc.followList = list;
                defer(null, doc);
            });
        } else {
            defer(null, doc);
        }
    }, errorHandler);
};

function convertUsers(UidArray, mode) {
    return then(function (defer) {
        var result = [];
        UidArray = toArray(UidArray);
        if (mode === 'Uid') {
            each(UidArray, function (x) {
                result.push(convertUserID(x));
            });
            defer(null, result);
        } else {
            then.each(UidArray, function (next, x) {
                cache(x, function (err, user) {
                    if (user) {
                        result.push({
                            _id: convertUserID(user._id),
                            name: user.name,
                            avatar: user.avatar
                        });
                    }
                    return next ? next() : defer(null, result);
                });
            });
        }
    });
}

function calcuScore(user) {
    //UsersScore: [1, 3, 5, 10, 0.5, 1]
    // 用户积分系数，表示评论×1，文章×3，关注×5，粉丝×10，文章热度×0.5，注册时长天数×1
    var UsersScore = jsGen.config.UsersScore;
    user.score = 0;
    each(user.articlesList, function (x) {
        user.score += UsersScore[+!(articleAPI.cache[x].status === -1)];
        user.score += UsersScore[4] * (+articleAPI.cache[x].hots);
    });
    user.score += UsersScore[2] * (+user.follow);
    user.score += UsersScore[3] * (+user.fans);
    user.score += UsersScore[5] * Math.floor((Date.now() - user.date) / 86400000);
    user.score = Math.round(user.score);
    cache.update(user);
}

function setCache(obj) {
    cache.update(obj, defer);
    obj = intersect(union(UserPrivateTpl), obj);
    userCache.put(obj._id, obj);
}

function adduser(userObj) {
    return then(function (defer) {
        if (typeof userObj !== 'object') {
            defer(jsGen.Err(msg.userNone));
        } else if (!checkEmail(userObj.email)) {
            defer(jsGen.Err(msg.userEmailErr));
        } else if (!checkUserName(userObj.name)) {
            defer(jsGen.Err(msg.userNameErr));
        } else {
            defer();
        }
    }).then(function (defer) {
        cache.get(userObj.email, function (err, _id) {
            if (_id) {
                defer(jsGen.Err(msg.userEmailExist));
            } else {
                defer();
            }
        });
    }, errorHandler).then(function (defer) {
        cache.get(userObj.name, function (err, _id) {
            if (_id) {
                defer(jsGen.Err(msg.userNameExist));
            } else {
                defer();
            }
        });
    }, errorHandler).then(function (defer) {
        delete userObj._id;
        userObj.email = userObj.email.toLowerCase();
        userObj.avatar = gravatar(userObj.email);
        userObj.resetDate = Date.now();
        userObj.role = jsGen.config.emailVerification ? 1 : 2;
        userDao.setNewUser(userObj, function (err, doc) {
            if (doc) {
                setCache(doc);
                jsGen.config.users += 1;
            }
            defer(err, doc);
        });
    }, errorHandler);
}

function userLogin(loginObj) {
    var date = Date.now();

    return then(function (defer) {
        if (typeof loginObj !== 'object') {
            defer(jsGen.Err(msg.requestDataErr));
        } else if (date - loginObj.logtime > 259200000) {
            defer(jsGen.Err(msg.requestOutdate));
        } else if (checkUserID(loginObj.logname)) {
            var Uid = convertUserID(loginObj.logname);
            cache(Uid, function (err, user) {
                if (!user) {
                    defer(jsGen.Err(msg.UidNone));
                } else {
                    defer(null, Uid);
                }
            });
        } else {
            cache.get(loginObj.logname, function (err, Uid) {
                if (Uid >= 0) {
                    defer(null, Uid);
                } else {
                    if (checkEmail(loginObj.logname)) {
                        defer(jsGen.Err(msg.userEmailNone));
                    } else if (checkUserName(loginObj.logname)) {
                        defer(jsGen.Err(msg.userNameNone));
                    } else {
                        defer(jsGen.Err(msg.logNameErr));
                    }
                }
            });
        }
    }).then(function (defer, Uid) {
        userDao.getAuth(Uid, function (err, doc) {
            if (!doc) {
                return defer(jsGen.Err(msg.dbErr));
            } else if (doc.locked) {
                return defer(jsGen.Err(msg.userLocked, 'locked'));
            } else if (doc.loginAttempts >= 5) {
                userDao.setUserInfo({
                    _id: Uid,
                    locked: true
                }, function () {
                    userDao.setLoginAttempt({
                        _id: Uid,
                        loginAttempts: 0
                    });
                });
                return defer(jsGen.Err(msg.loginAttempts));
            }
            if (loginObj.logpwd === HmacSHA256(doc.passwd, loginObj.logname + ':' + loginObj.logtime)) {
                if (doc.loginAttempts > 0) {
                    userDao.setLoginAttempt({
                        _id: Uid,
                        loginAttempts: 0
                    });
                }
                userDao.setLogin({
                    _id: Uid,
                    lastLoginDate: date,
                    login: {
                        date: date,
                        ip: loginObj.ip
                    }
                });
                defer(null, Uid);
            } else {
                userDao.setLoginAttempt({
                    _id: Uid,
                    loginAttempts: 1
                });
                return defer(jsGen.Err(msg.userPasswd, 'passwd'));
            }
        });
    }, errorHandler);
}

function logout(req, res, dm) {
    req.delsession();
    res.clearcookie('autologin');
    return res.sendjson(resJson());
}

function cookieLoginUpdate(Uid) {
    return then(function (defer) {
        userDao.getAuth(Uid, defer);
    }).then(function (defer, doc) {
        var data = {};
        data.n = Uid;
        data.t = Date.now();
        data.p = HmacSHA256(doc.passwd, data.n + ':' + data.t);
        return defer(null, new Buffer(JSON.stringify(data)).toString('base64'));
    }, errorHandler);
}

function cookieLogin(req) {
    var data = new Buffer(req.cookie.autologin, 'base64').toString();
    return then(function (defer) {
        if (isJSON(data)) {
            data = JSON.parse(data);
            data.logname = data.n;
            data.logtime = data.t;
            data.logpwd = data.p;
            data.ip = req.ip;
            userLogin(data).then(function (defer2, Uid) {
                return defer(null, Uid);
            }).fail(function () {
                defer(true);
            });
        } else {
            defer(true);
        }
    });
}

function login(req, res, dm) {
    var Uid;

    req.apibody.ip = req.ip;
    userLogin(req.apibody).then(function (defer, _id) {
        Uid = _id;
        userCache.getP(Uid).then(defer).fail(throwError);
    }).then(function (defer, doc) {
        req.session.Uid = Uid;
        req.session.role = doc.role;
        req.session.logauto = req.apibody.logauto;
        if (req.session.logauto) {
            cookieLoginUpdate(Uid).then(function (defer2, cookie) {
                res.cookie('autologin', cookie, {
                    maxAge: 259200000,
                    path: '/',
                    httpOnly: true
                });
                return res.sendjson(resJson(null, doc));
            }).fail(function (err) {
                defer(err);
            });
        } else {
            return res.sendjson(resJson(null, doc));
        }
    }).fail(throwError);
}

function register(req, res, dm) {
    var data = req.apibody;

    function emailToAdmin(doc) {
        if (jsGen.config.email) {
            var url = jsGen.config.url + '/#/' + doc._id;
            jsGen.lib.email.tpl(jsGen.config.title, doc.name, jsGen.config.email, url, 'register').send();
        }
    }

    if (!jsGen.config.register) {
        throw jsGen.Err(msg.registerClose);
    }
    if (checkTimeInterval(req, 'Re')) {
        throw jsGen.Err(msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]');
    }
    adduser(data).then(function (defer, doc) {
        checkTimeInterval(req, 'Re', true);
        req.session.Uid = doc._id;
        req.session.role = doc.role;
        doc._id = convertUserID(doc._id);
        if (jsGen.config.emailVerification) {
            setReset({
                u: doc._id,
                r: 'role'
            }).then(function () {
                emailToAdmin(doc);
            });
        } else {
            emailToAdmin(doc);
        }
        return res.sendjson(resJson(null, doc));
    }).fail(throwError);
}

function setReset(resetObj) {
    // var resetObj = {
    //     u: 'Uxxxxx'
    //     r: 'role|locked|email|passwd',
    //     e: 'email',
    //     k: 'resetKey'
    // };
    var userObj = {};

    callback = callback || callbackFn;
    userObj._id = resetObj.u;
    userObj.resetDate = Date.now();
    userObj.resetKey = SHA256(userObj.resetDate + '');
    return then(function (defer) {
        userDao.setUserInfo(userObj, defer);
    }).then(function (defer, doc) {
        resetObj.k = HmacMD5(HmacMD5(userObj.resetKey, resetObj.r), resetObj.u, 'base64');
        var resetUrl = new Buffer(JSON.stringify(resetObj)).toString('base64');
        resetUrl = jsGen.config.url + '/#/reset?req=' + resetUrl;
        var email = resetObj.e || doc.email;
        return jsGen.lib.email.tpl(jsGen.config.title, doc.name, email, resetUrl, resetObj.r).send(defer);
    }, errorHandler);
}

function addUsers(req, res, dm) {
    var body = [];

    if (req.session.role !== 5) {
        throw jsGen.Err(msg.userRoleErr);
    }
    var userArray = toArray(req.apibody.data);

    then.each(userArray, function (next, user) {
        adduser(user).then(function (defer, doc) {
            if (doc) {
                var data = intersect(union(UserPublicTpl), doc);
                data._id = convertUserID(doc._id);
                data.email = doc.email;
                body.push(doc);
                setReset({
                    u: doc._id,
                    r: 'role'
                });
            }
            return next ? next() : res.sendjson(resJson(null, body));
        }).fail(function () {
            return next ? next() : res.sendjson(resJson(null, body));
        });
    });
}

function getUser(req, res, dm) {
    var userID, Uid = decodeURI(req.path[2]);

    then(function (defer) {
        if (checkUserID(Uid)) {
            userID = Uid;
            Uid = convertUserID(userID);
            cache(Uid, function (err, user) {
                if (!user) {
                    defer(jsGen.Err(msg.UidNone));
                } else {
                    defer();
                }
            });
        } else if (checkUserName(Uid)) {
            cache.get(Uid, function (err, _id) {
                if (_id) {
                    Uid = _id;
                    userID = convertUserID(Uid);
                    defer();
                } else {
                    defer(jsGen.Err(msg.userNameNone));
                }
            });
        } else {
            defer(jsGen.Err(msg.UidNone));
        }
    }).then(function () {
        var publicUser;
        userCache.getP(Uid, false).then(function (defer2, user) {
            var list, key = 'Pub' + userID + req.path[3],
                p = +req.getparam.p || +req.getparam.pageIndex || 1;

            publicUser = intersect(union(UserPublicTpl), user);
            publicUser._id = userID;
            list = jsGen.cache.pagination.get(key);
            if (!req.path[3] || req.path[3] === 'index') {
                return res.sendjson(resJson(null, publicUser));
            } else if (!list || p === 1) {
                if (req.path[3] === 'fans') {
                    list = user.fansList;
                    jsGen.cache.pagination.put(key, list);
                    defer2(null, list, userCache);
                } else {
                    list = [];
                    each(user.articlesList, function (ID) {
                        var article = articleAPI.cache[ID];
                        if (article && article.status > -1 && article.display < 2) {
                            list.push(ID);
                        }
                    });
                    list.reverse();
                    jsGen.cache.pagination.put(key, list);
                    defer2(null, list, jsGen.cache.list);
                }
            } else {
                defer2(null, list, jsGen.cache.list);
            }
        }).then(function (defer2, list, listCache) {
            paginationList(req, list, listCache, defer2);
        }).then(function (defer2, data, pagination) {
            return res.sendjson(resJson(null, data, pagination, {
                user: publicUser
            }));
        }).fail(throwError);
    }).fail(throwError);
}

function setUser(req, res, dm) {
    var userID, Uid = decodeURI(req.path[2]);

    then(function (defer) {
        if (checkUserID(Uid)) {
            userID = Uid;
            Uid = convertUserID(userID);
            cache(Uid, function (err, user) {
                if (!user) {
                    defer(jsGen.Err(msg.UidNone));
                } else {
                    defer();
                }
            });
        } else if (checkUserName(Uid)) {
            cache.get(Uid, function (err, _id) {
                if (_id) {
                    Uid = _id;
                    userID = convertUserID(Uid);
                    defer();
                } else {
                    defer(jsGen.Err(msg.userNameNone));
                }
            });
        } else {
            defer(jsGen.Err(msg.UidNone));
        }
    }).then(function (defer) {
        if (!req.session.Uid) {
            defer(jsGen.Err(msg.userNeedLogin));
        } else if (req.session.Uid === Uid || !req.apibody) {
            defer(jsGen.Err(msg.requestDataErr));
        } else if (checkTimeInterval(req, 'Fo')) {
            defer(jsGen.Err(msg.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]'));
        } else {
            defer();
        }
    }).then(function (defer) {
        var follow = !! req.apibody.follow;
        userCache.getP(req.session.Uid, false).then(function (defer2, doc) {
            if (follow && doc.followList.indexOf(Uid) >= 0) {
                return defer(jsGen.Err(msg.userFollowed));
            } else if (!follow && doc.followList.indexOf(Uid) < 0) {
                return defer(jsGen.Err(msg.userUnfollowed));
            }
            userDao.setFollow({
                _id: req.session.Uid,
                followList: follow ? Uid : -Uid
            }, defer2);
        }).then(function (defer2, doc) {
            userDao.setFans({
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
            return res.sendjson(resJson(null, null, null, {
                follow: follow
            }));
        }).fail(throwError);
    }).fail(throwError);
}

function getUsers(req, res, dm) {
    then(function (defer) {
        if (req.session.role !== 5) {
            defer(jsGen.Err(msg.userRoleErr));
        } else {
            cache.index(defer);
        }
    }).then(function (defer, list) {
        paginationList(req, list, userCache, defer);
    }).then(function (defer, data, pagination) {
        each(data, function (x, i, list) {
            var user = intersect(union(UserPublicTpl), x);
            user._id = x._id;
            user.email = x.email;
            list[i] = user;
        });
        return res.sendjson(resJson(null, data, pagination));
    }).fail(throwError);
}

function getUserInfo(req, res, dm) {
    if (!req.session.Uid) {
        throw jsGen.Err(msg.userNeedLogin);
    }
    var p,
        user,
        userID = convertUserID(req.session.Uid);

    userCache.getP(req.session.Uid, false).then(function (defer, doc) {
        var list, key = userID + 'home';

        user = doc;
        p = +req.getparam.p || +req.getparam.pageIndex || 1;
        list = jsGen.cache.pagination.get(key);
        if (!list || p === 1) {
            list = [];
            then.each(articleAPI.cache._index, function (next, x) {
                if (!x) {
                    return next ? next() : defer(null, dealList(list));
                } else if (list.length >= 500) {
                    defer(null, dealList(list));
                } else {
                    jsGen.cache.list.getP(x, dm.intercept(function (article) {
                        var checkTag = user.tagsList.some(function (x) {
                            if (article.tagsList.indexOf(x) >= 0) {
                                return true;
                            }
                        });
                        if (checkTag || req.session.Uid === article.author || user.followList.indexOf(article.author) >= 0) {
                            list.push(x);
                        }
                        return next ? next() : defer(null, dealList(list));
                    }), false);
                }
            });
        } else {
            defer(null, list);
        }

        function dealList(list) {
            list.sort(function (a, b) {
                return articleAPI.cache[b].updateTime - articleAPI.cache[a].updateTime;
            });
            jsGen.cache.pagination.put(key, list);
            return list;
        }
    }).then(function (defer, list) {
        paginationList(req, list, jsGen.cache.list, defer);
    }).then(function (defer, data, pagination) {
        var now = Date.now(),
            readtimestamp = user.readtimestamp;
        if (p === 1) {
            userDao.setUserInfo({
                _id: req.session.Uid,
                readtimestamp: now
            });
            userCache.update(req.session.Uid, function (value) {
                value.readtimestamp = now;
                return value;
            });
        }
        return res.sendjson(resJson(null, data, pagination, {
            readtimestamp: readtimestamp
        }));
    }).fail(throwError);
}

function editUser(req, res, dm) {
    var defaultObj = {
        name: '',
        passwd: '',
        sex: '',
        avatar: '',
        desc: '',
        tagsList: ['']
    },
        userObj = {};

    if (!req.session.Uid) {
        throw jsGen.Err(msg.userNeedLogin);
    }
    userObj = union(defaultObj);
    userObj = intersect(userObj, req.apibody);
    userObj._id = req.session.Uid;
    then(function (defer) {
        if (userObj.name) {
            if (!checkUserName(userObj.name)) {
                defer(jsGen.Err(msg.userNameErr));
            } else {
                cache.get(userObj.name, function (err, user) {
                    if (user && user._id !== req.session.Uid) {
                        defer(jsGen.Err(msg.userNameExist));
                    } else {
                        defer();
                    }
                });
            }
        } else {
            defer();
        }
    }).then(function (defer) {
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
            then(function (defer2) {
                tagAPI.filterTags(userObj.tagsList.slice(0, jsGen.config.UserTagsMax)).all(defer2);
            }).then(function (defer2, doc) {
                if (doc) {
                    userObj.tagsList = doc;
                }
                userCache.getP(req.session.Uid, false).then(defer2).fail(defer2);
            }).then(function (defer2, doc) {
                var tagList = {},
                    setTagList = [];
                if (doc) {
                    each(doc.tagsList, function (x) {
                        tagList[x] = -userObj._id;
                    });
                }
                each(userObj.tagsList, function (x) {
                    if (tagList[x]) {
                        delete tagList[x];
                    } else {
                        tagList[x] = userObj._id;
                    }
                });
                each(tagList, function (x) {
                    setTagList.push({
                        _id: +x,
                        usersList: tagList[x]
                    });
                });
                each(setTagList, function (x) {
                    tagAPI.setTag(x);
                });
                defer();
            }).fail(function (err) {
                defer(err);
            });
        } else {
            defer();
        }
    }).then(function (defer) {
        userDao.setUserInfo(userObj, defer);
    }).then(function (defer, doc) {
        setCache(doc);
        userCache.getP(req.session.Uid).then(defer).fail(defer);
    }).then(function (defer, user) {
        return res.sendjson(resJson(null, user));
    }).fail(throwError);
}

function editUsers(req, res, dm) {
    var defaultObj = {
        _id: '',
        locked: false,
        role: 0
    },
        userArray = req.apibody.data,
        result = [];

    if (req.session.role !== 5) {
        throw jsGen.Err(msg.userRoleErr);
    }
    if (!userArray) {
        throw jsGen.Err(msg.requestDataErr);
    }
    userArray = toArray(userArray);

    then.each(userArray, function (next, user) {
        var userID;

        then(function (defer) {
            user = intersect(union(defaultObj), user);
            if (!user._id) {
                defer(true);
            } else {
                userID = user._id;
                user._id = convertUserID(userID);
                cache(user._id, defer);
            }
        }).then(function (defer) {
            user.role = Math.floor(user.role || -1);
            if (user.role < 0 || user.role > 5) {
                delete user.role;
            }
            userDao.setUserInfo(user, defer);
        }).then(function (defer, doc) {
            if (doc) {
                setCache(doc);
                var data = intersect(union(UserPublicTpl), doc);
                data.email = doc.email;
                data._id = userID;
                result.push(data);
            }
            return next ? next() : res.sendjson(resJson(null, result));
        }).fail(function (err) {
            return next ? next() : res.sendjson(resJson(null, result));
        });
    });
}

function getReset(req, res, dm) {
    var resetObj = {};
    resetObj.r = req.apibody.request;
    then(function (defer) {
        if (!resetObj.r || ['locked', 'email', 'passwd', 'role'].indexOf(resetObj.r) === -1) {
            defer(jsGen.Err(msg.resetInvalid));
        } else if (resetObj.r === 'email') {
            if (!req.session.Uid) {
                defer(jsGen.Err(msg.userNeedLogin));
            } else {
                resetObj.e = req.apibody.email;
                if (!checkEmail(resetObj.e)) {
                    defer(jsGen.Err(msg.userEmailErr));
                } else {
                    cache.get(resetObj.e, function (err, _id) {
                        if (_id) {
                            defer(jsGen.Err(msg.userEmailExist));
                        } else {
                            resetObj.u = req.session.Uid;
                            defer();
                        }
                    });
                }
            }
        } else if (resetObj.r === 'role') {
            if (!req.session.Uid) {
                defer(jsGen.Err(msg.userNeedLogin));
            } else {
                resetObj.u = req.session.Uid;
                defer();
            }
        } else {
            then(function (defer2) {
                if (checkUserID(req.apibody.name)) {
                    defer(null, convertUserID(req.apibody.name));
                } else if (checkUserName(req.apibody.name)) {
                    cache.get(req.apibody.name, function (err, _id) {
                        defer(_id ? null : jsGen.Err(msg.userEmailExist), _id);
                    });
                } else {
                    defer(jsGen.Err(msg.userNameNone));
                }
            }).then(function (defer2, _id) {
                cache(_id, function (err, user) {
                    defer(user ? null : jsGen.Err(msg.UidNone), user);
                });
            }).then(function (defer2, user) {
                resetObj.u = user._id;
                resetObj.e = user.email;
                if (req.apibody.email.toLowerCase() !== resetObj.e.toLowerCase()) {
                    defer2(jsGen.Err(msg.userEmailNotMatch));
                } else {
                    defer();
                }
            }).fail(function (err) {
                defer(err);
            });
        }
    }).then(function (defer) {
        setReset(resetObj).then(function () {
            defer(null, true);
        }).fail(function (err) {
            defer(err);
        });
    }).then(function () {
        return res.sendjson(resJson());
    }).fail(throwError);
}

function resetUser(req, res, dm) {
    var reset;

    then(function (defer) {
        reset = new Buffer(req.path[3], 'base64').toString();
        if (isJSON(reset)) {
            reset = JSON.parse(reset);
        }
        if (typeof reset !== 'object' || !reset.u || !reset.r || !reset.k) {
            defer(jsGen.Err(msg.resetInvalid));
        } else {
            cache(reset.u, function (err, user) {
                if (!user) {
                    defer(jsGen.Err(msg.resetInvalid));
                } else {
                    defer(null, user._id);
                }
            });
        }
    }).then(function (defer, Uid) {
        userDao.getAuth(Uid, defer);
    }).then(function (defer, doc) {
        var now = Date.now(),
            userObj = {
                _id: doc._id
            };

        if (doc && doc.resetKey && (now - doc.resetDate) / 86400000 < 1) {
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
                    defer(jsGen.Err(msg.resetInvalid));
                }
                userObj.resetDate = now;
                userObj.resetKey = '';
                userDao.setUserInfo(userObj, defer);
            } else {
                defer(jsGen.Err(msg.resetInvalid));
            }
        } else {
            defer(jsGen.Err(msg.resetOutdate));
        }
    }).then(function (defer, user) {
        if (user) {
            setCache(user);
            req.session.Uid = user._id;
            req.session.role = user.role;
        }
        return res.sendjson(resJson());
    }).fail(throwError);
}

function getArticles(req, res, dm) {
    var list, key,
        p = +req.getparam.p || +req.getparam.pageIndex || 1;

    if (!req.session.Uid) {
        throw jsGen.Err(msg.userNeedLogin);
    }
    var userID = convertUserID(req.session.Uid);
    key = userID + req.path[2];
    list = jsGen.cache.pagination.get(key);

    then(function (defer) {
        if (!list || p === 1) {
            userCache.getP(req.session.Uid, false).then(function (defer2, user) {
                if (req.path[2] === 'mark') {
                    list = user.markList.reverse();
                    jsGen.cache.pagination.put(userID + 'mark', list);
                    defer();
                } else {
                    var articlesList = [],
                        commentsList = [];
                    each(user.articlesList, function (x) {
                        if (articleAPI.cache[x] && articleAPI.cache[x].status > -1) {
                            articlesList.push(x);
                        } else {
                            commentsList.push(x);
                        }
                    });
                    articlesList.reverse();
                    commentsList.reverse();
                    jsGen.cache.pagination.put(userID + 'article', articlesList);
                    jsGen.cache.pagination.put(userID + 'comment', commentsList);
                    list = jsGen.cache.pagination.get(key);
                    defer();
                }
            }).fail(throwError);
        } else {
            defer();
        }
    }).then(function (defer) {
        paginationList(req, list, jsGen.cache.list, defer);
    }).then(function (defer, data, pagination) {
        return res.sendjson(resJson(null, data, pagination));
    }).fail(throwError);
}

function getUsersList(req, res, dm) {
    var list,
        p = +req.getparam.p || +req.getparam.pageIndex || 1;

    if (!req.session.Uid) {
        throw jsGen.Err(msg.userNeedLogin);
    }
    userCache.getP(req.session.Uid, false).then(function (defer, user) {
        if (req.path[2] === 'fans') {
            list = user.fansList;
        } else if (req.path[2] === 'follow') {
            list = user.followList;
        } else {
            defer(jsGen.Err(msg.requestDataErr));
        }
        paginationList(req, list, userCache, defer);
    }).then(function (defer, data, pagination) {
        each(data, function (x, i) {
            var userID = x._id;
            data[i] = intersect(union(UserPublicTpl), x);
            data[i]._id = userID;
        });
        return res.sendjson(resJson(null, data, pagination));
    }).fail(throwError);
}

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
}

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
}

module.exports = {
    GET: getFn,
    POST: postFn,
    convertUsers: convertUsers,
    cookieLogin: cookieLogin,
    cookieLoginUpdate: cookieLoginUpdate
};