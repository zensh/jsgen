'use strict';
/*global require, module, Buffer, jsGen*/

var msg = jsGen.lib.msg,
    then = jsGen.module.then,
    UserPublicTpl = jsGen.lib.json.UserPublicTpl,
    UserPrivateTpl = jsGen.lib.json.UserPrivateTpl,
    each = jsGen.lib.tools.each,
    union = jsGen.lib.tools.union,
    SHA256 = jsGen.lib.tools.SHA256,
    HmacMD5 = jsGen.lib.tools.HmacMD5,
    HmacSHA256 = jsGen.lib.tools.HmacSHA256,
    isJSON = jsGen.lib.tools.isJSON,
    resJson = jsGen.lib.tools.resJson,
    toArray = jsGen.lib.tools.toArray,
    checkUrl = jsGen.lib.tools.checkUrl,
    gravatar = jsGen.lib.tools.gravatar,
    intersect = jsGen.lib.tools.intersect,
    checkEmail = jsGen.lib.tools.checkEmail,
    removeItem = jsGen.lib.tools.removeItem,
    checkUserID = jsGen.lib.tools.checkUserID,
    errorHandler = jsGen.lib.tools.errorHandler,
    checkUserName = jsGen.lib.tools.checkUserName,
    filterSummary = jsGen.lib.tools.filterSummary,
    paginationList = jsGen.lib.tools.paginationList,
    checkTimeInterval = jsGen.lib.tools.checkTimeInterval,
    tagAPI = jsGen.api.tag,
    redis = jsGen.lib.redis,
    userDao = jsGen.dao.user,
    userCache = jsGen.cache.user,
    articleAPI = jsGen.api.article,
    cache = jsGen.lib.redis.userCache,
    convertUserID = userDao.convertID,
    paginationCache = jsGen.cache.pagination;

userCache.getP = function (Uid, convert) {
    var that = this,
        inCache = false;

    return then(function (defer) {
        if (Uid >= 0) {
            var user = that.get(Uid);
            if (user) {
                inCache = true;
                defer(null, user);
            } else {
                userDao.getUserInfo(Uid, defer);
            }
        } else {
            defer(jsGen.Err(msg.USER.UidNone));
        }
    }).then(function (defer, user) {
        if (!inCache) {
            user = intersect(union(UserPrivateTpl), user);
            that.put(Uid, user);
        }
        if (convert !== false) {
            calcuScore(user).all(function (defer2) {
                userDao.setUserInfo({
                    _id: Uid,
                    score: user.score
                });
                defer2();
            }).then(function (defer2) {
                tagAPI.convertTags(user.tagsList).all(defer2);
            }).then(function (defer2, tagsList) {
                user.tagsList = tagsList;
                convertUsers(user.followList, 'Uid').all(defer2);
            }).then(function (defer2, followList) {
                user.followList = followList;
                delete user.fansList;
                delete user.articlesList;
                delete user.collectionsList;
                user._id = convertUserID(Uid);
                defer(null, user);
            }).fail(defer);
        } else {
            defer(null, user);
        }
    }).fail(errorHandler);
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
            then.each(UidArray, function (defer2, x) {
                cache(x, function (err, user) {
                    user = user && {
                        _id: convertUserID(user._id),
                        name: user.name,
                        avatar: user.avatar,
                        score: user.score
                    };
                    defer2(err, user || null);
                });
            }).all(function (defer2, err, users) {
                removeItem(users, null);
                defer(err, users);
            });
        }
    }).fail(errorHandler);
}

function calcuScore(user) {
    //UsersScore: [1, 3, 5, 10, 0.5, 1]
    // 用户积分系数，表示评论×1，文章×3，关注×5，粉丝×10，文章热度×0.5，注册时长天数×1
    var UsersScore = jsGen.config.UsersScore;
    user.score = 0;
    user.score += UsersScore[2] * (+user.follow);
    user.score += UsersScore[3] * (+user.fans);
    user.score += UsersScore[5] * Math.floor((Date.now() - user.date) / 86400000);

    return then.each(user.articlesList, function (defer, x) {
        then(function (defer2) {
            redis.articleCache(x, defer2);
        }).all(function (defer2, err, article) {
            if (article) {
                user.score += UsersScore[+(article.status !== -1)];
                user.score += UsersScore[4] * (+article.hots);
            }
            defer();
        });
    }).then(function (defer) {
        user.score = Math.round(user.score);
        cache.update(user, defer);
    }).fail(errorHandler);
}

function setCache(user) {
    user = intersect(union(UserPrivateTpl), user);
    cache.update(user);
    userCache.put(user._id, user);
    return user;
}

function adduser(userObj) {
    return then(function (defer) {
        if (typeof userObj !== 'object') {
            defer(jsGen.Err(msg.USER.userNone));
        } else if (!checkEmail(userObj.email)) {
            defer(jsGen.Err(msg.USER.userEmailErr));
        } else if (!checkUserName(userObj.name)) {
            defer(jsGen.Err(msg.USER.userNameErr));
        } else {
            defer();
        }
    }).then(function (defer) {
        cache.get(userObj.email, function (err, Uid) {
            if (Uid) {
                defer(jsGen.Err(msg.USER.userEmailExist));
            } else {
                defer();
            }
        });
    }).then(function (defer) {
        cache.get(userObj.name, function (err, Uid) {
            if (Uid) {
                defer(jsGen.Err(msg.USER.userNameExist));
            } else {
                defer();
            }
        });
    }).then(function (defer) {
        delete userObj._id;
        userObj.email = userObj.email.toLowerCase();
        userObj.avatar = gravatar(userObj.email);
        userObj.resetDate = Date.now();
        userObj.role = jsGen.config.emailVerification ? 1 : 2;
        userDao.setNewUser(userObj, function (err, user) {
            if (user) {
                user = setCache(user);
                jsGen.config.users = 1;
            }
            defer(err, user);
        });
    }).fail(errorHandler);
}

function setReset(resetObj) {
    // var resetObj = {
    //     u: 61061,
    //     r: 'role|locked|email|passwd',
    //     e: 'email',
    //     k: 'resetKey'
    // };
    var userObj = {};

    userObj._id = resetObj.u;
    userObj.resetDate = Date.now();
    userObj.resetKey = SHA256(userObj.resetDate + '');
    return then(function (defer) {
        userDao.setUserInfo(userObj, defer);
    }).then(function (defer, doc) {
        resetObj.k = HmacMD5(HmacMD5(userObj.resetKey, resetObj.r), resetObj.u, 'base64');
        var resetUrl = new Buffer(JSON.stringify(resetObj)).toString('base64');
        resetUrl = jsGen.config.url + '/reset?req=' + resetUrl;
        var email = resetObj.e || doc.email;
        return jsGen.lib.email.tpl(jsGen.config.title, doc.name, email, resetUrl, resetObj.r).send(defer);
    }).fail(errorHandler);
}

function userLogin(loginObj) {
    var date = Date.now();

    return then(function (defer) {
        if (typeof loginObj !== 'object') {
            defer(jsGen.Err(msg.MAIN.requestDataErr));
        } else if (date - loginObj.logtime > 259200000) {
            defer(jsGen.Err(msg.MAIN.requestOutdate));
        } else if (checkUserID(loginObj.logname)) {
            var Uid = convertUserID(loginObj.logname);
            cache(Uid, function (err, user) {
                if (!user) {
                    defer(jsGen.Err(msg.USER.UidNone));
                } else {
                    defer(null, Uid);
                }
            });
        } else if (loginObj.logname >= 0) {
            defer(null, loginObj.logname);
        } else {
            cache.get(loginObj.logname, function (err, Uid) {
                if (Uid >= 0) {
                    defer(null, Uid);
                } else {
                    if (checkEmail(loginObj.logname)) {
                        defer(jsGen.Err(msg.USER.userEmailNone));
                    } else if (checkUserName(loginObj.logname)) {
                        defer(jsGen.Err(msg.USER.userNameNone));
                    } else {
                        defer(jsGen.Err(msg.USER.logNameErr));
                    }
                }
            });
        }
    }).then(function (defer, Uid) {
        userDao.getAuth(Uid, function (err, user) {
            if (!user) {
                defer(jsGen.Err(msg.MAIN.dbErr));
            } else if (user.locked) {
                defer(jsGen.Err(msg.USER.userLocked, 'locked'));
            } else if (user.loginAttempts >= 5) {
                userDao.setUserInfo({
                    _id: Uid,
                    locked: true
                }, function () {
                    userDao.setLoginAttempt({
                        _id: Uid,
                        loginAttempts: 0
                    });
                });
                defer(jsGen.Err(msg.USER.loginAttempts));
            } else if (loginObj.logpwd === HmacSHA256(user.passwd, loginObj.logname + ':' + loginObj.logtime)) {
                if (user.loginAttempts > 0) {
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
                return defer(jsGen.Err(msg.USER.userPasswd, 'passwd'));
            }
        });
    }).fail(errorHandler);
}

function cookieLoginUpdate(Uid) {
    return then(function (defer) {
        userDao.getAuth(Uid, defer);
    }).then(function (defer, user) {
        var data = {};
        data.n = Uid;
        data.t = Date.now();
        data.p = HmacSHA256(user.passwd, data.n + ':' + data.t);
        defer(null, new Buffer(JSON.stringify(data)).toString('base64'));
    }).fail(errorHandler);
}

function cookieLogin(req) {
    return then(function (defer) {
        var data = new Buffer(req.cookie.autologin, 'base64').toString();
        if (isJSON(data)) {
            data = JSON.parse(data);
            data.logname = data.n;
            data.logtime = data.t;
            data.logpwd = data.p;
            data.ip = req.ip;
            userLogin(data).then(function (defer2, Uid) {
                defer(null, Uid);
            }).fail(function () {
                defer(true);
            });
        } else {
            defer(true);
        }
    });
}

function getUserID(req) {
    var userID = decodeURI(req.path[2]);

    return then(function (defer) {
        var Uid;
        if (checkUserID(userID)) {
            Uid = convertUserID(userID);
            cache(Uid, function (err, user) {
                if (!user) {
                    defer(jsGen.Err(msg.USER.UidNone));
                } else {
                    defer(null, Uid);
                }
            });
        } else if (checkUserName(userID)) {
            cache.get(userID, function (err, _id) {
                if (_id) {
                    Uid = _id;
                    userID = convertUserID(Uid);
                    defer(null, Uid);
                } else {
                    defer(jsGen.Err(msg.USER.userNameNone));
                }
            });
        } else {
            defer(jsGen.Err(msg.USER.UidNone));
        }
    });
}

function logout(req, res) {
    req.delsession();
    res.clearcookie('autologin');
    return res.sendjson(resJson());
}

function login(req, res) {
    var Uid;

    req.apibody.ip = req.ip;
    userLogin(req.apibody).then(function (defer, _id) {
        Uid = _id;
        userCache.getP(Uid).all(defer);
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
    }).fail(res.throwError);
}

function register(req, res) {
    var data = req.apibody;

    function emailToAdmin(doc) {
        if (jsGen.config.email) {
            var url = jsGen.config.url + '/' + doc._id;
            jsGen.lib.email.tpl(jsGen.config.title, doc.name, jsGen.config.email, url, 'register').send();
        }
    }

    then(function (defer) {
        if (!jsGen.config.register) {
            defer(jsGen.Err(msg.MAIN.registerClose));
        } else {
            checkTimeInterval(req, 'Register').all(function (defer2, err, value) {
                if (value) {
                    defer(jsGen.Err(msg.MAIN.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]'));
                } else {
                    defer();
                }
            });
        }
    }).then(function (defer) {
        adduser(data).all(defer);
    }).then(function (defer, doc) {
        checkTimeInterval(req, 'Register', true);
        req.session.Uid = doc._id;
        req.session.role = doc.role;
        doc._id = convertUserID(doc._id);
        if (jsGen.config.emailVerification) {
            setReset({
                u: req.session.Uid,
                r: 'role'
            }).then(function () {
                emailToAdmin(doc);
            });
        } else {
            emailToAdmin(doc);
        }
        return res.sendjson(resJson(null, doc));
    }).fail(res.throwError);
}

function getUser(req, res) {
    getUserID(req).then(function (defer, Uid) {
        var user, publicUser,
            userID = convertUserID(Uid),
            key = 'Public' + userID + req.path[3],
            p = +req.getparam.p || +req.getparam.pageIndex || 1;

        userCache.getP(Uid, false).then(function (defer2, doc) {
            user = doc;
            publicUser = intersect(union(UserPublicTpl), user);
            publicUser._id = userID;
            if (!req.path[3] || req.path[3] === 'index') {
                return res.sendjson(resJson(null, publicUser));
            } else {
                paginationCache.get(key, defer2);
            }
        }).then(function (defer2, list) {
            if (!list || p === 1) {
                if (req.path[3] === 'fans') {
                    list = user.fansList;
                    paginationCache.put(key, list);
                    defer2(null, list, userCache);
                } else {
                    list = [];
                    then.each(user.articlesList.reverse(), function (defer3, ID) {
                        then(function (defer4) {
                            redis.articleCache(ID, defer4);
                        }).all(function (defer4, err, article) {
                            defer3(null, article && article.status > -1 && article.display === 0 ? ID : null);
                        });
                    }).all(function (defer3, err, list) {
                        removeItem(list, null);
                        paginationCache.put(key, list);
                        defer2(null, list, jsGen.cache.list);
                    });
                }
            } else {
                defer2(null, list, req.path[3] === 'fans' ? userCache : jsGen.cache.list);
            }
        }).then(function (defer2, list, listCache) {
            paginationList(req, list, listCache, defer2);
        }).then(function (defer2, data, pagination) {
            return res.sendjson(resJson(null, data, pagination, {
                user: publicUser
            }));
        }).fail(defer);
    }).fail(res.throwError);
}

function setUser(req, res) {
    getUserID(req).then(function (defer, Uid) {
        if (!req.session.Uid) {
            defer(jsGen.Err(msg.USER.userNeedLogin));
        } else if (req.session.Uid === Uid || !req.apibody) {
            defer(jsGen.Err(msg.MAIN.requestDataErr));
        } else {
            checkTimeInterval(req, 'Follow').all(function (defer2, err, value) {
                if (value) {
                    defer(jsGen.Err(msg.MAIN.timeIntervalErr + '[' + jsGen.config.TimeInterval + 's]'));
                } else {
                    defer(null, Uid);
                }
            });
        }
    }).then(function (defer, Uid) {
        var follow = !! req.apibody.follow;
        userCache.getP(req.session.Uid, false).then(function (defer2, user) {
            if (follow && user.followList.indexOf(Uid) >= 0) {
                return defer(jsGen.Err(msg.USER.userFollowed));
            } else if (!follow && user.followList.indexOf(Uid) < 0) {
                return defer(jsGen.Err(msg.USER.userUnfollowed));
            } else {
                userDao.setFollow({
                    _id: req.session.Uid,
                    followList: follow ? Uid : -Uid
                }, defer2);
            }
        }).then(function (defer2) {
            userDao.setFans({
                _id: Uid,
                fansList: follow ? req.session.Uid : -req.session.Uid
            });
            userCache.update(Uid, function (value) {
                if (follow) {
                    value.fansList.push(req.session.Uid);
                } else {
                    removeItem(value.fansList, req.session.Uid);
                }
                return value;
            });
            userCache.update(req.session.Uid, function (value) {
                if (follow) {
                    value.followList.push(Uid);
                } else {
                    removeItem(value.fansList, req.session.Uid);
                }
                return value;
            });
            checkTimeInterval(req, 'Follow', true);
            return res.sendjson(resJson(null, null, null, {
                follow: follow
            }));
        }).fail(defer);
    }).fail(res.throwError);
}

function getUsers(req, res) {
    then(function (defer) {
        if (req.session.role !== 5) {
            defer(jsGen.Err(msg.USER.userRoleErr));
        } else {
            cache.index(0, -1, defer);
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
    }).fail(res.throwError);
}

function getUserInfo(req, res) {
    var key, user, userID,
        p = +req.getparam.p || +req.getparam.pageIndex || 1;

    then(function (defer) {
        if (!req.session.Uid) {
            defer(jsGen.Err(msg.USER.userNeedLogin));
        } else {
            userID = convertUserID(req.session.Uid);
            req.session.paginationKey = req.session.paginationKey || {};
            userCache.getP(req.session.Uid, false).all(defer);
        }
    }).then(function (defer, doc) {
        user = doc;
        paginationCache.get(req.session.paginationKey.home, defer);
    }).then(function (defer, list) {
        if (!list || p === 1) {
            then(function (defer2) {
                redis.articleCache.updateList(0, -1, defer2);
            }).each(null, function (defer2, x) {
                jsGen.cache.list.getP(x, false).all(function (defer3, err, article) {
                    var ok = article && req.session.Uid === article.author || user.followList.indexOf(article.author) >= 0;
                    ok = ok && user.tagsList.some(function (x) {
                        if (article.tagsList.indexOf(x) >= 0) {
                            return true;
                        }
                    });
                    defer2(err, ok ? x : null);
                });
            }).then(function (defer2, list) {
                removeItem(list, null);
                paginationCache.put(req.session.paginationKey.home, list);
                defer(null, list);
            }).fail(defer);
        } else {
            defer(null, list);
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
    }).fail(res.throwError);
}

function editUser(req, res) {
    var defaultObj = {
        name: '',
        passwd: '',
        sex: '',
        avatar: '',
        desc: '',
        tagsList: ['']
    },
        userObj = intersect(union(defaultObj), req.apibody);

    userObj._id = req.session.Uid;
    then(function (defer) {
        if (!req.session.Uid) {
            defer(jsGen.Err(msg.USER.userNeedLogin));
        } else if (userObj.name) {
            if (!checkUserName(userObj.name)) {
                defer(jsGen.Err(msg.USER.userNameErr));
            } else {
                cache.get(userObj.name, function (err, user) {
                    if (user && user._id !== req.session.Uid) {
                        defer(jsGen.Err(msg.USER.userNameExist));
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
            }).then(function (defer2, tagsList) {
                userObj.tagsList = tagsList || [];
                userCache.getP(req.session.Uid, false).all(defer2);
            }).then(function (defer2, user) {
                var tagList = {},
                    setTagList = [];
                each(user.tagsList, function (x) {
                    tagList[x] = -userObj._id;
                });
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
            }).fail(defer);
        } else {
            defer();
        }
    }).then(function (defer) {
        userDao.setUserInfo(userObj, defer);
    }).then(function (defer, user) {
        setCache(user);
        userCache.getP(req.session.Uid).all(defer);
    }).then(function (defer, user) {
        return res.sendjson(resJson(null, user));
    }).fail(res.throwError);
}

function editUsers(req, res) {
    var defaultObj = {
        _id: '',
        locked: false,
        role: 0
    },
        userArray = req.apibody.data;

    then(function (defer) {
        if (req.session.role !== 5) {
            defer(jsGen.Err(msg.USER.userRoleErr));
        } else if (!userArray) {
            defer(jsGen.Err(msg.MAIN.requestDataErr));
        } else {
            defer(null, toArray(userArray));
        }
    }).each(null, function (defer, user) {
        var userID;
        then(function (defer2) {
            user = intersect(union(defaultObj), user);
            if (!user._id) {
                defer2(true);
            } else {
                userID = user._id;
                user._id = convertUserID(userID);
                cache(user._id, defer2);
            }
        }).then(function (defer2) {
            user.role = Math.floor(user.role || -1);
            if (user.role < 0 || user.role > 5) {
                delete user.role;
            }
            userDao.setUserInfo(user, defer2);
        }).then(function (defer2, user) {
            setCache(user);
            var data = intersect(union(UserPublicTpl), user);
            data.email = user.email;
            data._id = userID;
            defer(null, data);
        }).fail(function () {
            defer(null, null);
        });
    }).then(function (defer, users) {
        removeItem(users, null);
        res.sendjson(resJson(null, users));
    }).fail(res.throwError);
}

function getReset(req, res) {
    var resetObj = {};
    resetObj.r = req.apibody.request;
    then(function (defer) {
        if (!resetObj.r || ['locked', 'email', 'passwd', 'role'].indexOf(resetObj.r) === -1) {
            defer(jsGen.Err(msg.MAIN.resetInvalid));
        } else if (resetObj.r === 'email') {
            if (!req.session.Uid) {
                defer(jsGen.Err(msg.USER.userNeedLogin));
            } else if (!checkEmail(req.apibody.email)) {
                defer(jsGen.Err(msg.USER.userEmailErr));
            } else {
                resetObj.e = req.apibody.email;
                cache.get(resetObj.e, function (err, _id) {
                    if (_id) {
                        defer(jsGen.Err(msg.USER.userEmailExist));
                    } else {
                        resetObj.u = req.session.Uid;
                        defer();
                    }
                });
            }
        } else if (resetObj.r === 'role') {
            if (!req.session.Uid) {
                defer(jsGen.Err(msg.USER.userNeedLogin));
            } else {
                resetObj.u = req.session.Uid;
                defer();
            }
        } else {
            then(function (defer2) {
                if (checkUserID(req.apibody.name)) {
                    defer2(null, convertUserID(req.apibody.name));
                } else if (checkUserName(req.apibody.name)) {
                    cache.get(req.apibody.name, function (err, Uid) {
                        defer2(Uid ? null : jsGen.Err(msg.USER.userEmailExist), Uid);
                    });
                } else {
                    defer2(jsGen.Err(msg.USER.userNameNone));
                }
            }).then(function (defer2, Uid) {
                cache(Uid, function (err, user) {
                    defer2(user ? null : jsGen.Err(msg.USER.UidNone), user);
                });
            }).then(function (defer2, user) {
                resetObj.u = user._id;
                resetObj.e = user.email;
                if (req.apibody.email.toLowerCase() !== resetObj.e.toLowerCase()) {
                    defer2(jsGen.Err(msg.USER.userEmailNotMatch));
                } else {
                    defer();
                }
            }).fail(defer);
        }
    }).then(function (defer) {
        setReset(resetObj).all(defer);
    }).then(function () {
        return res.sendjson(resJson());
    }).fail(res.throwError);
}

function resetUser(req, res) {
    var reset;

    then(function (defer) {
        reset = new Buffer(req.path[3], 'base64').toString();
        reset = isJSON(reset) && JSON.parse(reset);
        if (typeof reset !== 'object' || !reset.u || !reset.r || !reset.k) {
            defer(jsGen.Err(msg.MAIN.resetInvalid));
        } else {
            cache(reset.u, function (err, user) {
                if (!user) {
                    defer(jsGen.Err(msg.MAIN.resetInvalid));
                } else {
                    defer(null, user._id);
                }
            });
        }
    }).then(function (defer, Uid) {
        userDao.getAuth(Uid, defer);
    }).then(function (defer, user) {
        var now = Date.now(),
            userObj = {
                _id: user._id
            };

        if (user && user.resetKey && (now - user.resetDate) / 86400000 < 1) {
            if (HmacMD5(HmacMD5(user.resetKey, reset.r), reset.u, 'base64') === reset.k) {
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
                    defer(jsGen.Err(msg.MAIN.resetInvalid));
                }
                userObj.resetDate = now;
                userObj.resetKey = '';
                userDao.setUserInfo(userObj, defer);
            } else {
                defer(jsGen.Err(msg.MAIN.resetInvalid));
            }
        } else {
            defer(jsGen.Err(msg.MAIN.resetOutdate));
        }
    }).then(function (defer, user) {
        setCache(user);
        req.session.Uid = user._id;
        req.session.role = user.role;
        return res.sendjson(resJson());
    }).fail(res.throwError);
}

function getArticles(req, res) {
    var key,
        p = +req.getparam.p || +req.getparam.pageIndex || 1;

    then(function (defer) {
        if (!req.session.Uid) {
            defer(jsGen.Err(msg.USER.userNeedLogin));
        } else {
            key = req.session.Uid + req.path[2];
            paginationCache.get(key, defer);
        }
    }).then(function (defer, list) {
        if (!list || p === 1) {
            userCache.getP(req.session.Uid, false).then(function (defer2, user) {
                if (req.path[2] === 'mark') {
                    list = user.markList.reverse();
                    paginationCache.put(key, list);
                    defer(null, list);
                } else {
                    defer2(null, user);
                }
            }).then(function (defer2, user) {
                var articlesList = [],
                    commentsList = [];
                then.each(user.articlesList, function (defer3, x) {
                    jsGen.cache.list.getP(x, false).then(function (defer4, article) {
                        if (article) {
                            if (article.status > -1) {
                                articlesList.push(x);
                            } else {
                                commentsList.push(x);
                            }
                        }
                        defer3();
                    }, function () {
                        defer3();
                    });
                }).all(function (defer3) {
                    paginationCache.put(req.session.Uid + 'article', articlesList);
                    paginationCache.put(req.session.Uid + 'comment', commentsList);
                    defer(null, req.path[2] === 'article' ? articlesList : commentsList);
                });
            }).fail(defer);
        } else {
            defer(null, list);
        }
    }).then(function (defer, list) {
        paginationList(req, list, jsGen.cache.list, defer);
    }).then(function (defer, data, pagination) {
        return res.sendjson(resJson(null, data, pagination));
    }).fail(res.throwError);
}

function getUsersList(req, res) {
    var list,
        p = +req.getparam.p || +req.getparam.pageIndex || 1;

    then(function (defer) {
        if (!req.session.Uid) {
            defer(jsGen.Err(msg.USER.userNeedLogin));
        } else {
            userCache.getP(req.session.Uid, false).all(defer);
        }
    }).then(function (defer, user) {
        if (req.path[2] === 'fans') {
            list = user.fansList;
        } else if (req.path[2] === 'follow') {
            list = user.followList;
        } else {
            defer(jsGen.Err(msg.MAIN.requestDataErr));
        }
        paginationList(req, list, userCache, defer);
    }).then(function (defer, data, pagination) {
        each(data, function (x, i) {
            var userID = x._id;
            data[i] = intersect(union(UserPublicTpl), x);
            data[i]._id = userID;
        });
        return res.sendjson(resJson(null, data, pagination));
    }).fail(res.throwError);
}

module.exports = {
    GET: function (req, res) {
        switch (req.path[2]) {
        case undefined:
        case 'index':
            return getUserInfo(req, res);
        case 'logout':
            return logout(req, res);
        case 'admin':
            return getUsers(req, res);
        case 'reset':
            return resetUser(req, res);
        case 'article':
        case 'comment':
        case 'mark':
            return getArticles(req, res);
        case 'fans':
        case 'follow':
            return getUsersList(req, res);
        default:
            return getUser(req, res);
        }
    },
    POST: function (req, res) {
        switch (req.path[2]) {
        case undefined:
        case 'index':
            return editUser(req, res);
        case 'login':
            return login(req, res);
        case 'register':
            return register(req, res);
        case 'admin':
            return editUsers(req, res);
        case 'reset':
            return getReset(req, res);
        default:
            return setUser(req, res);
        }
    },
    convertUsers: convertUsers,
    cookieLogin: cookieLogin,
    cookieLoginUpdate: cookieLoginUpdate
};