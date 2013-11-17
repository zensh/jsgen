'use strict';
/*global require, module, Buffer, process, jsGen*/

var crypto = require('crypto'),
    then = require('thenjs'),
    msg = require('./msg.js'),
    isArray = Array.isArray,
    breaker = {};

function noop() {}

// 默认的callback函数模板

function callbackFn(err, doc) {
    return err ? console.log(err) : doc;
}

function wrapCallback(callback) {
    callback = callback || callbackFn;
    return function (err, reply) {
        if (reply === null && err === null) {
            callback(Err('NULL'), null);
        } else {
            callback(err, reply);
        }
    };
}

function errorHandler(defer, err) {
    defer(err);
}

//定义jsGen的Error对象

function Err(message, name) {
    var err = new Error();
    err.name = name || msg.MAIN.err;
    err.message = message;
    return err;
}

function resJson(error, data, pagination, otherObj) {
    var result = union({}, otherObj);
    result.ack = !error;
    result.error = error;
    result.timestamp = Date.now();
    result.data = data || null;
    result.pagination = pagination || null;
    return result;
}

function equal(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function isFunction(fn) {
    return typeof fn === 'function';
}

function isJSON(str) {
    var JSON_START = /^\s*(\[|\{[^\{])/,
        JSON_END = /[\}\]]\s*$/;
    if (checkType(str) === 'string' && JSON_START.test(str) && JSON_END.test(str)) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    } else {
        return false;
    }
}

function isNull(obj) {
    return obj === null || obj === undefined || obj !== obj;
}

function isEmpty(obj) {
    if (obj) {
        for (var key in obj) {
            return !hasOwn(obj, key);
        }
    }
    return true;
}

function toStr(value) {
    return (value || value === 0) ? (value + '') : '';
}

function toArray(value) {
    if (!isArray(value)) {
        value = value === undefined ? [] : [value];
    }
    return value;
}

function trim(str, strict) {
    return toStr(str).
    replace(strict ? (/\s+/g) : (/ +/g), ' ').
    replace(/^\s+/, '').
    replace(/\s+$/, '');
}

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function each(obj, iterator, context, arrayLike, right) {
    var i, l, key;
    iterator = iterator || noop;
    if (!obj) {
        return;
    } else if (arrayLike || isArray(obj)) {
        if (!right) {
            for (i = 0, l = obj.length; i < l; i++) {
                if (iterator.call(context, obj[i], i, obj) === breaker) {
                    return;
                }
            }
        } else {
            for (i = obj.length - 1; i >= 0; i--) {
                if (iterator.call(context, obj[i], i, obj) === breaker) {
                    return;
                }
            }
        }
    } else {
        for (key in obj) {
            if (hasOwn(obj, key)) {
                if (iterator.call(context, obj[key], key, obj) === breaker) {
                    return;
                }
            }
        }
    }
}

function checkType(obj) {
    var type = typeof obj;
    if (obj === null) {
        return 'null';
    } else if (isArray(obj)) {
        return 'array';
    } else {
        return type;
    }
}

function removeItem(list, item) {
    var removed = 0;
    if (isArray(list)) {
        each(list, function (x, i) {
            if (x === item) {
                list.splice(i, 1);
                removed += 1;
            }
        }, null, true, true);
    } else {
        each(list, function (x, i) {
            if (x === item) {
                delete list[i];
                removed += 1;
            }
        }, null, false);
    }
    return removed;
}

function extend(dst, src) {
    each(src, function (x, i) {
        dst[i] = x;
    });
}

//深度并集复制，用于数据对象复制、数据对象更新，若同时提供参数 a 对象和 b 对象，则将 b 对象所有属性（原始类型，忽略函数）复制给 a 对象（同名则覆盖），
//返回值为深度复制了 b 后的 a，注意 a 和 b 必须同类型;
//若只提供参数 a，则 union 函数返回 a 的克隆，与JSON.parse(JSON.stringify(a))相比，克隆效率略高。

function union(a, b) {
    var type = checkType(a);

    if (b === undefined) {
        b = a;
        a = type === 'object' ? {} : [];
    }
    if (type === checkType(b)) {
        if (type === 'object' || type === 'array') {
            each(b, function (x, i) {
                var type = checkType(x);
                if (type === 'object' || type === 'array') {
                    a[i] = type === checkType(a[i]) ? a[i] : (type === 'object' ? {} : []);
                    union(a[i], x);
                } else {
                    a[i] = type === 'function' ? null : x;
                }
            });
        } else {
            a = type === 'function' ? null : b;
        }
    }
    return a;
}

//深度交集复制，用于数据对象校验，即以 a 为模板，当a 和 b 共有属性且属性值类型一致时，将 b 的属性值复制给 a，对于 a 有 b 没有或 b 有 a 没有的属性，均删除，返回相交复制后的 a;
// var a = {q:0,w:'',e:{a:0,b:[0,0,0]}}, b = {r:10,w:'hello',e:{a:99,b:[1,2,3,4,5]}};
// intersect(a, b);  // a 变成{w:'hello',e:{a:99,b:[1,2,3]}}
//如果 a 或其属性是 null，则完全复制 b 或其对应属性
//如果 a 或其属性是 {} 或 [], 且 b 或其对应属性类型一致（即对象类型或数组类型），则完全复制
//如果 a 的某属性是数组，且只有一个值，则以该值为模板，将 b 对应的该属性的数组的值校检并复制
// var a = {q:0,w:null,e:{a:0,b:[0]}}, b = {r:10,w:'hello',e:{a:99,b:[function(){},1,2,3,'4',5]}};
// intersect(a, b);  // 注意a与上面的区别
// var a = {q:0,w:null,e:{a:0,b:[null]}}, b = {r:10,w:'hello',e:{a:99,b:[function(){},1,2,3,'4',5]}};
// intersect(a, b);  // 注意a与上面的区别

function intersect(a, b) {
    var type = checkType(a);

    if (type === checkType(b) && (type === 'array' || type === 'object')) {
        if (isEmpty(a)) {
            union(a, b);
        } else if (type === 'array' && a.length === 1) {
            var o = a[0],
                typeK = checkType(o);
            a.length = 0;
            if (typeK !== 'function') {
                each(b, function (x) {
                    var typeB = checkType(x);
                    if (typeK === 'null' || typeK === typeB) {
                        if (typeK === 'object' || typeK === 'array') {
                            a.push(intersect(union(o), x));
                        } else {
                            a.push(union(x));
                        }
                    }
                });
            }
        } else {
            each(a, function (x, i) {
                var typeK = checkType(x);
                if (type === 'array' || hasOwn(b, i)) {
                    if (typeK === 'function' && type === 'array') {
                        a[i] = null;
                    } else if (typeK === 'null') {
                        a[i] = union(b[i]);
                    } else if (typeK === checkType(b[i])) {
                        if (typeK === 'object' || typeK === 'array') {
                            intersect(a[i], b[i]);
                        } else {
                            a[i] = b[i];
                        }
                    } else {
                        delete a[i];
                    }
                } else {
                    delete a[i];
                }
            });
        }
    }
    return a;
}

//数组去重，返回新数组，新数组中没有重复值。

function uniqueArray(a) {
    var o = {},
        result = [];
    if (isArray(a)) {
        each(a, function (x) {
            var key = typeof x + x;
            if (o[key] !== 1) {
                o[key] = 1;
                result.push(x);
            }
        }, null, true);
    }
    return result;
}

// throttle form underscore.js

function throttle(fn, wait, options) {
    var context, args, result,
        timeout = null,
        previous = 0;

    function later() {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = fn.apply(context, args);
    }

    options = options || {};
    return function () {
        var remaining,
            now = Date.now();
        if (!previous && options.leading === false) {
            previous = now;
        }
        remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0) {
            clearTimeout(timeout);
            timeout = null;
            previous = now;
            result = fn.apply(context, args);
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };
}

function formatMsg(tplStr, contentObj) {
    tplStr = toStr(tplStr);
    each(contentObj, function (value, key) {
        tplStr = tplStr.replace(new RegExp('%' + key, 'gi'), toStr(value));
    });
    return tplStr;
}

function bufferStr(value) {
    return Buffer.isBuffer(value) ? value : toStr(value);
}

function base64(str) {
    var buf = Buffer.isBuffer(str) ? str : new Buffer(toStr(str));
    return buf.toString('base64');
}
//返回 str 的MD5值

function MD5(str, encoding) {
    return crypto.createHash('md5').update(bufferStr(str)).digest(encoding || 'hex');
}

function HmacMD5(str, pwd, encoding) {
    return crypto.createHmac('md5', bufferStr(pwd)).update(bufferStr(str)).digest(encoding || 'hex');
}

//返回 str 的SHA256值

function SHA256(str, encoding) {
    return crypto.createHash('sha256').update(bufferStr(str)).digest(encoding || 'hex');
}

//返回 str 的加密SHA256值，加密密码为 pwd

function HmacSHA256(str, pwd, encoding) {
    return crypto.createHmac('sha256', bufferStr(pwd)).update(bufferStr(str)).digest(encoding || 'hex');
}

//根据email返回gravatar.com的头像链接，returnUrl+'?s=200'则可获取size为200×200的头像

function gravatar(email) {
    return checkEmail(email) && 'http://www.gravatar.com/avatar/$hex'.replace('$hex', MD5(email.toLowerCase()));
}

//检测 str 是否为合法的email格式，返回 true/false

function checkEmail(str) {
    var reg = /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/;
    return reg.test(str) && str.length >= 6 && str.length <= 64;
}

//检测 str 是否为合法的Url格式，返回 true/false

function checkUrl(str) {
    var reg = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;
    return reg.test(str) && str.length <= 2083;
}

function checkUserID(str) {
    var reg = /^U[a-z]{5,}$/;
    return reg.test(str);
}

function checkUserName(str, minLen, maxLen) {
    var reg = /^[(\u4e00-\u9fa5)a-z][(\u4e00-\u9fa5)a-zA-Z0-9_]{1,15}$/;
    var len = Buffer.byteLength(toStr(str), 'utf8');
    minLen = minLen || jsGen.config.UserNameMinLen;
    maxLen = maxLen || jsGen.config.UserNameMaxLen;
    return reg.test(str) && len >= minLen && len <= maxLen;
}

function checkID(str, idPre) {
    var reg = new RegExp('^' + idPre + '[0-9A-Za-z]{3,}$');
    return reg.test(str);
}

function cutStr(str, maxLen, minLen) {
    str = toStr(str);
    maxLen = maxLen > 0 ? maxLen : 0;
    minLen = minLen > 0 ? minLen : 0;
    var length = Buffer.byteLength(str, 'utf8');
    if (length < minLen) {
        str = '';
    } else if (length > maxLen) {
        var buf = new Buffer(maxLen + 3);
        buf.write(str, 0, 'utf8');
        str = buf.toString('utf8');
        str = str.slice(0, -2) + '…';
    }
    return str;
}

function filterTag(str) {
    str = trim(str, true);
    str = str.replace(/[,，、]/g, '');
    return cutStr(str, 25, 3);
}

function filterTitle(str) {
    var options = {
        whiteList: {},
        onIgnoreTag: function (tag, html) {
            return '';
        }
    };
    str = trim(str, true);
    str = jsGen.module.xss(str, options);
    return cutStr(str, jsGen.config.TitleMaxLen, jsGen.config.TitleMinLen);
}

function filterSummary(str) {
    var options = {
        whiteList: {
            strong: [],
            b: [],
            i: [],
            em: []
        },
        onIgnoreTag: function (tag, html) {
            return '';
        }
    };
    str = jsGen.module.xss(toStr(str), options);
    return cutStr(str, jsGen.config.SummaryMaxLen);
}

function filterContent(str) {
    return cutStr(str, jsGen.config.ContentMaxLen, jsGen.config.ContentMinLen);
}

function paginationList(req, list, cache, callback, errorHandler) {
    var param = req.getparam,
        p = +param.p || +param.pageIndex || 1,
        s = +param.s || +param.pageSize || 10,
        pagination = {},
        data = [];
    callback = callback || callbackFn;
    list = list || [];

    p = p >= 1 ? Math.floor(p) : 1;
    s = s >= 10 && s <= 500 ? Math.floor(s) : 10;
    pagination.total = list.length;
    list = list.slice((p - 1) * s, p * s);
    pagination.pageSize = s;
    pagination.pageIndex = p;
    then.each(list, function (defer, id) {
        cache.getP(+id).all(function (defer2, err, doc) {
            if (err && typeof errorHandler === 'function') {
                errorHandler(err, id);
            }
            defer(null, doc || null);
        });
    }).all(function (defer, err, data) {
        removeItem(data, null);
        callback(null, data, pagination);
    });
}

function checkTimeInterval(req, type, set) {
    return then(function (defer) {
        jsGen.cache.timeInterval[set ? 'put' : 'get'](req.session._id + type, set ? 1 : defer, defer);
    });
}

module.exports = {
    MD5: MD5,
    Err: Err,
    noop: noop,
    each: each,
    trim: trim,
    union: union,
    equal: equal,
    toStr: toStr,
    base64: base64,
    SHA256: SHA256,
    isJSON: isJSON,
    extend: extend,
    isEmpty: isEmpty,
    HmacMD5: HmacMD5,
    resJson: resJson,
    toArray: toArray,
    checkID: checkID,
    throttle: throttle,
    gravatar: gravatar,
    checkUrl: checkUrl,
    checkType: checkType,
    formatMsg: formatMsg,
    intersect: intersect,
    filterTag: filterTag,
    checkEmail: checkEmail,
    HmacSHA256: HmacSHA256,
    callbackFn: callbackFn,
    removeItem: removeItem,
    filterTitle: filterTitle,
    uniqueArray: uniqueArray,
    checkUserID: checkUserID,
    wrapCallback: wrapCallback,
    errorHandler: errorHandler,
    filterSummary: filterSummary,
    filterContent: filterContent,
    checkUserName: checkUserName,
    paginationList: paginationList,
    checkTimeInterval: checkTimeInterval
};
