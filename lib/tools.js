'use strict';
/*global require, module, Buffer, jsGen*/

var crypto = require('crypto'),
    msg = require('./msg.js');

// 默认的callback函数模板

function callbackFn(err, doc) {
    if (err) {
        console.log(err);
    }
    return doc;
}

//定义jsGen的Error对象

function Err(message, name, otherObj) {
    return (function () {
        union(this, otherObj);
        this.name = name || msg.err;
        this.message = message;
        return this;
    }).call(Object.create(Error.prototype));
}

function resJson(error, data, pagination, otherObj) {
    var result = {};
    union(result, otherObj);
    result.ack = !error;
    result.error = error;
    result.timestamp = new Date().getTime();
    result.data = data || null;
    result.pagination = pagination || null;
    return result;
}

//返回 str 的MD5值

function MD5(str, encoding) {
    return crypto.createHash('md5').update(str).digest(encoding || 'hex');
}

function HmacMD5(str, pwd, encoding) {
    return crypto.createHmac('md5', pwd).update(str).digest(encoding || 'hex');
}

//返回 str 的SHA256值

function SHA256(str, encoding) {
    return crypto.createHash('sha256').update(str).digest(encoding || 'hex');
}

//返回 str 的加密SHA256值，加密密码为 pwd

function HmacSHA256(str, pwd, encoding) {
    return crypto.createHmac('sha256', pwd).update(str).digest(encoding || 'hex');
}

function equal(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
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

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function isEmpty(obj) {
    for (var key in obj) {
        if (hasOwn(obj, key)) {
            return false;
        }
    }
    return true;
}

function each(obj, iterator, context, right) {
    if (!obj) {
        return;
    } else if (obj.length === +obj.length) {
        var i, l;
        if (!right) {
            for (i = 0, l = obj.length; i < l; i++) {
                iterator.call(context, obj[i], i, obj);
            }
        } else {
            for (i = obj.length - 1; i >= 0; i--) {
                iterator.call(context, obj[i], i, obj);
            }
        }
    } else {
        for (var key in obj) {
            if (hasOwn(obj, key)) {
                iterator.call(context, obj[key], key, obj);
            }
        }
    }
}

function checkType(obj) {
    var type = typeof obj;
    if (obj === null) {
        return 'null';
    } else if (type === 'object' && Array.isArray(obj)) {
        return 'array';
    } else {
        return type;
    }
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

//深度补集运算，用于获取对象修改后的值。a为目标对象，b为对比对象。
//a的某属性值与b的对应属性值全等时，删除a的该属性，运算直接修改a，返回值也是a。
//ignore，不参与对比的属性模板;
//keyMode为true时，对属性进行补集元算，即a的属性名在b中也存在时，则删除a中该属性。

function complement(a, b, ignore, keyMode) {
    if (a && b) {
        var typeA = checkType(a),
            typeB = checkType(b),
            ignore = ignore || undefined;
        keyMode = keyMode || undefined;
        if (typeA !== typeB || (typeA !== 'object' && typeA !== 'array')) {
            return a;
        }
        if (ignore) {
            if (typeof ignore === 'object') {
                return complement(a, complement(b, ignore, true), keyMode);
            } else {
                if (!keyMode) {
                    keyMode = true;
                }
            }
        }
        if (!keyMode) {
            if (typeB === 'array' && b.length === 1) {
                var o = union(b[0]);
                for (var i = a.length - 1; i >= 0; i--) {
                    if (a[i] === o) {
                        delete a[i];
                    } else if (o && typeof o === 'object') {
                        complement(a[i], o);
                    }
                }
            } else {
                for (var key in a) {
                    if (a[key] === b[key]) {
                        delete a[key];
                    } else if (b[key] && typeof b[key] === 'object') {
                        complement(a[key], b[key]);
                    }
                }
            }
        } else {
            if (typeB === 'array' && b.length === 1) {
                var o = union(b[0]);
                for (var i = a.length - 1; i >= 0; i--) {
                    if (o && typeof o === 'object') {
                        complement(a[i], o, true);
                    } else if (typeof a[i] === typeof o) {
                        delete a[i];
                    }
                }
            } else {
                for (var key in a) {
                    if (b[key] && typeof b[key] === 'object') {
                        complement(a[key], b[key], true);
                    } else if (typeof a[key] === typeof b[key]) {
                        delete a[key];
                    }
                }
            }
        }
        digestArray(a);
    }
    return a;
}
//数组去重，返回新数组，新数组中没有重复值。

function uniqueArray(a) {
    if (!Array.isArray(a)) {
        return a;
    }

    var o = {},
        re = [];
    each(a, function (x) {
        if (o[typeof x + x] !== 1) {
            o[typeof x + x] = 1;
            re.push(x);
        }
    });
    return re;
}
//数组去undefined，修改原数组，去除undefined值的元素。

function digestArray(a) {
    if (!Array.isArray(a)) {
        return a;
    }
    each(a, function (x, i, list) {
        if (x === undefined) {
            list.splice(i, 1);
        }
    }, null, true);
    return a;
}

function formatBytes(bytes) {
    if (bytes < 1024) {
        return bytes + ' bytes';
    } else if (bytes < 1048576) {
        return (bytes / 1024).toFixed(3) + ' KiB';
    } else if (bytes < 1073741824) {
        return (bytes / 1048576).toFixed(3) + ' MiB';
    } else {
        return (bytes / 1073741824).toFixed(3) + ' GiB';
    }
}

function formatTime(seconds) {
    var re = '',
        q = 0,
        o = seconds || Math.floor(Date.now() / 1000);

    function calculate(base) {
        q = o % base;
        o = (o - q) / base;
        return o;
    }
    calculate(60);
    re = q + '秒';
    if (o === 0) {
        return re;
    }
    calculate(60);
    re = q + '分' + re;
    if (o === 0) {
        return re;
    }
    calculate(24);
    re = q + '时' + re;
    if (o === 0) {
        return re;
    } else {
        return o + '天' + re;
    }
}

//根据email返回gravatar.com的头像链接，returnUrl+'?s=200'则可获取size为200×200的头像

function gravatar(email) {
    var gravatarUrl = 'http://www.gravatar.com/avatar/$hex';
    if (checkEmail(email)) {
        return gravatarUrl.replace('$hex', MD5(email.toLowerCase()));
    } else {
        return false;
    }
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
    var len = Buffer.byteLength(str, 'utf8');
    minLen = minLen || jsGen.config.UserNameMinLen;
    maxLen = maxLen || jsGen.config.UserNameMaxLen;
    return reg.test(str) && len >= minLen && len <= maxLen;
}

function checkID(str, idPre) {
    var reg = new RegExp('^' + idPre + '[0-9A-Za-z]{3,}$');
    return reg.test(str);
}

function filterTag(str) {
    if (typeof str !== 'string') {
        return '';
    }
    str = str.replace(/[,，、]/g, '');
    str = str.replace(/^[\s]+/, '');
    str = str.replace(/\s+/g, ' ');
    var len = Buffer.byteLength(str, 'utf8');
    if (len < 3) {
        return '';
    } else if (len <= 18) {
        return str;
    } else {
        var buf = new Buffer(24);
        buf.write(str, 0, 'utf8');
        str = buf.toString('utf8');
        return str.slice(0, -2);
    }
}

function filterTitle(str) {
    var options = {
        whiteList: {},
        onIgnoreTag: function (tag, html) {
            return '';
        }
    };
    if (typeof str !== 'string') {
        return '';
    }
    str = str.replace(/\s/g, ' ');
    str = jsGen.module.xss(str, options);
    var len = Buffer.byteLength(str, 'utf8');
    if (len < jsGen.config.TitleMinLen) {
        return '';
    }
    if (len <= jsGen.config.TitleMaxLen) {
        return str;
    }
    var buf = new Buffer(jsGen.config.TitleMaxLen + 2);
    buf.write(str, 0, 'utf8');
    str = buf.toString('utf8');
    return str.slice(0, -2);
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
    if (typeof str !== 'string') {
        return '';
    }
    str = jsGen.module.marked(str);
    str = jsGen.module.xss(str, options);
    var len = Buffer.byteLength(str, 'utf8');
    if (len <= jsGen.config.SummaryMaxLen) {
        return str;
    }
    var buf = new Buffer(jsGen.config.SummaryMaxLen + 2);
    buf.write(str, 0, 'utf8');
    str = buf.toString('utf8');
    return str.slice(0, -2) + '…';
}

function filterContent(str) {
    if (typeof str !== 'string') {
        return '';
    }
    var len = Buffer.byteLength(str, 'utf8');
    if (len < jsGen.config.ContentMinLen) {
        return '';
    }
    if (len <= jsGen.config.ContentMaxLen) {
        return str;
    }
    var buf = new Buffer(jsGen.config.ContentMaxLen + 2);
    buf.write(str, 0, 'utf8');
    str = buf.toString('utf8');
    return str.slice(0, -2);
}

function paginationList(req, list, cache, callback) {
    var param = req.getparam,
        p = param.p || param.pageIndex || 1,
        s = param.s || param.pageSize || 10,
        pagination = {},
        data = [];
    callback = callback || jsGen.lib.tools.callbackFn;

    p = p >= 1 ? Math.floor(p) : 1;
    s = s >= 10 && s <= 500 ? Math.floor(s) : 10;
    pagination.total = list.length;
    list = list.slice((p - 1) * s, p * s);
    pagination.pageIndex = p;
    pagination.pageSize = s;
    list.reverse();
    next();

    function next() {
        var ID;
        if (list.length === 0) {
            return callback(null, data, pagination);
        }
        ID = list.pop();
        if (!ID) {
            return next();
        }
        cache.getP(ID, function (err, doc) {
            if (err) {
                return callback(err, data, pagination);
            }
            if (doc) {
                data.push(doc);
            }
            next();
        });
    }
}

function checkTimeInterval(req, type, set) {
    if (set) {
        jsGen.cache.timeInterval.put(req.session._id + type, null);
        return;
    } else if (jsGen.cache.timeInterval.get(req.session._id + type)) {
        return true;
    }
}

module.exports = {
    callbackFn: callbackFn,
    Err: Err,
    resJson: resJson,
    MD5: MD5,
    HmacMD5: HmacMD5,
    SHA256: SHA256,
    HmacSHA256: HmacSHA256,
    isJSON: isJSON,
    isEmpty: isEmpty,
    checkType: checkType,
    each: each,
    union: union,
    intersect: intersect,
    equal: equal,
    uniqueArray: uniqueArray,
    digestArray: digestArray,
    formatBytes: formatBytes,
    formatTime: formatTime,
    gravatar: gravatar,
    checkEmail: checkEmail,
    checkUrl: checkUrl,
    checkUserID: checkUserID,
    checkUserName: checkUserName,
    checkID: checkID,
    filterTag: filterTag,
    filterTitle: filterTitle,
    filterSummary: filterSummary,
    filterContent: filterContent,
    paginationList: paginationList,
    checkTimeInterval: checkTimeInterval
};