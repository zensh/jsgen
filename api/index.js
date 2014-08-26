'use strict';
/*global require, module, Buffer, process, jsGen*/

var tagAPI = jsGen.api.tag,
    userAPI = jsGen.api.user,
    jsGenCache = jsGen.cache,
    os = jsGen.module.os,
    then = jsGen.module.then,
    jsGenConfig = jsGen.config,
    userCache = jsGenCache.user,
    msg = jsGen.lib.msg,
    redis = jsGen.lib.redis,
    tools = jsGen.lib.tools,
    each = tools.each,
    union = tools.union,
    resJson = tools.resJson,
    toArray = tools.toArray,
    checkUrl = tools.checkUrl,
    intersect = tools.intersect,
    checkEmail = tools.checkEmail,
    removeItem = tools.removeItem,
    errorHandler = tools.errorHandler,
    configSetTpl = jsGen.lib.json.ConfigSetTpl,
    configPublicTpl = jsGen.lib.json.ConfigPublicTpl;

function getIndex(req, res) {
    var Uid;

    then(function (cont) {
        if (req.session.Uid) {
            userCache.getP(req.session.Uid).fin(cont);
        } else if (req.cookie.autologin) {
            userAPI.cookieLogin(req).then(function (cont2, _id) {
                Uid = _id;
                userAPI.cookieLoginUpdate(Uid).fin(cont2);
            }).then(function (cont2, cookie) {
                res.cookie('autologin', cookie, {
                    maxAge: 259200000,
                    path: '/',
                    httpOnly: true
                });
                userCache.getP(Uid).fin(cont);
            }).fail(cont);
        } else {
            cont();
        }
    }).fin(function (cont, err, user) {
        var config = union(configPublicTpl);

        // 自动登录更新session
        if (Uid && !req.session.Uid && user) {
            req.session.Uid = Uid;
            req.session.role = user.role;
            req.session.logauto = true;
        }
        if (user) {
            var upyun = union(jsGen.conf.upyun);
            upyun.expiration += Math.ceil(Date.now() / 1000);
            upyun['save-key'] = '/' + user._id + upyun['save-key'];
            user.upyun = {
                url: jsGenConfig.upyun.url + (jsGenConfig.upyun.bucket || upyun.bucket),
                policy: tools.base64(JSON.stringify(upyun)),
                allowFileType: jsGen.conf.upyun['allow-file-type']
            };
            user.upyun.signature = tools.MD5(user.upyun.policy + '&' + jsGenConfig.upyun.form_api_secret);
        }

        // 更新在线用户
        then(function (cont2) {
            redis.onlineCache(req, cont2);
        }).then(function (cont2, onlineUser, onlineNum) {
            jsGenConfig.onlineUsers = onlineUser > 1 ? onlineUser : 2;
            jsGenConfig.onlineNum = onlineNum > 1 ? onlineNum : 2;
            if (jsGenConfig.onlineNum > jsGenConfig.maxOnlineNum) {
                jsGenConfig.maxOnlineNum = jsGenConfig.onlineNum;
                jsGenConfig.maxOnlineTime = Date.now();
            }
        });

        then(function (cont2) {
            intersect(config, jsGenConfig);
            redis.tagCache.index(0, 20, cont2);
        }).fin(function (cont2, err, tags) {
            tagAPI.convertTags(tags).fin(cont2);
        }).fin(function (cont2, err, tags) {
            config.tagsList = tags || [];
            config.user = user || null;
            return res.sendjson(resJson(null, config));
        });
    }).fail(res.throwError);
}

function getGlobal(req, res) {
    var config = union(jsGenConfig);
    then(function (cont) {
        if (req.session.role >= 4) {
            config.sys = {
                uptime: Math.round(process.uptime()),
                cpus: os.cpus(),
                platform: process.platform,
                node: process.versions,
                memory: process.memoryUsage(),
                user: userCache.info(),
                article: jsGenCache.article.info(),
                comment: jsGenCache.comment.info(),
                list: jsGenCache.list.info(),
                tag: jsGenCache.tag.info(),
                collection: jsGenCache.collection.info(),
                message: jsGenCache.message.info()
            };
            jsGenCache.pagination.info(cont);
        } else {
            cont(null, jsGen.Err(msg.USER.userRoleErr));
        }
    }).then(function (cont, info) {
        config.sys.pagination = info;
        jsGenCache.timeInterval.info(cont);
    }).then(function (cont, info) {
        config.sys.timeInterval = info;
        delete config.smtp.auth.pass;
        return res.sendjson(resJson(null, config, null, {
            configTpl: union(configSetTpl)
        }));
    }).fail(res.throwError);
}

function setGlobal(req, res) {
    var body = {},
        defaultObj = union(configSetTpl),
        setObj = intersect(union(configSetTpl), req.apibody);

    function checkArray(x, i, list) {
        x = x > 0 ? +x : 0;
        list[i] = x;
    }

    then(function (cont) {
        if (req.session.role !== 5) {
            cont(jsGen.Err(msg.USER.userRoleErr));
        }
        if (setObj.domain && !checkUrl(setObj.domain)) {
            cont(jsGen.Err(msg.MAIN.globalDomainErr));
        }
        if (setObj.url) {
            if (!checkUrl(setObj.url)) {
                cont(jsGen.Err(msg.MAIN.globalUrlErr));
            } else {
                setObj.url = setObj.url.replace(/(\/)+$/, '');
            }
        }
        if (setObj.email && !checkEmail(setObj.email)) {
            cont(jsGen.Err(msg.MAIN.globalEmailErr));
        }
        if (setObj.TimeInterval && setObj.TimeInterval < 5) {
            setObj.TimeInterval = 5;
        }
        each(['UsersScore', 'ArticleStatus', 'ArticleHots', 'paginationCache'], function (x) {
            each(setObj[x], checkArray);
        });
        if (setObj.robots) {
            jsGen.robotReg = new RegExp(setObj.robots, 'i');
        }
        if (setObj.smtp) {
            setObj.smtp = union(jsGenConfig.smtp, setObj.smtp);
        }
        if (setObj.upyun) {
            setObj.upyun = union(jsGenConfig.upyun, setObj.upyun);
        }
        userCache.capacity = setObj.userCache || userCache.capacity;
        jsGenCache.article.capacity = setObj.articleCache || jsGenCache.article.capacity;
        jsGenCache.comment.capacity = setObj.commentCache || jsGenCache.comment.capacity;
        jsGenCache.list.capacity = setObj.listCache || jsGenCache.list.capacity;
        jsGenCache.tag.capacity = setObj.tagCache || jsGenCache.tag.capacity;
        jsGenCache.collection.capacity = setObj.collectionCache || jsGenCache.collection.capacity;
        jsGenCache.message.capacity = setObj.messageCache || jsGenCache.message.capacity;
        jsGenCache.pagination.timeLimit = setObj.paginationCache || jsGenCache.pagination.timeLimit;
        jsGenCache.timeInterval.timeLimit = setObj.TimeInterval || jsGenCache.timeInterval.timeLimit;
        each(setObj, function (value, key, list) {
            jsGenConfig[key] = value;
        });
        intersect(defaultObj, jsGenConfig);
        delete defaultObj.smtp.auth.pass;
        return res.sendjson(resJson(null, defaultObj));
    }).fail(res.throwError);
}

module.exports = {
    GET: function (req, res) {
        switch (req.path[2]) {
        case 'admin':
            return getGlobal(req, res);
        default:
            return getIndex(req, res);
        }
    },
    POST: function (req, res) {
        switch (req.path[2]) {
        case 'admin':
            return setGlobal(req, res);
        }
    }
};
