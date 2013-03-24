var crypto = require('crypto');

// 默认的callback函数模板

function callbackFn(err, doc) {
    if (err) {
        console.log(err);
    }
    return doc;
};

//生成一个Error对象，其name属性为‘错误提示’，message属性为参数message

function Err(message, name) {
    return (function () {
        this.name = name || jsGen.lib.msg.err;
        this.message = message;
        return this;
    }).call(Object.create(Error.prototype));
};

//返回 str 的MD5值

function MD5(str, encoding) {
    return crypto.createHash('md5').update(str).digest(encoding || 'hex');
};

function HmacMD5(str, pwd, encoding) {
    return crypto.createHmac('md5', pwd).update(str).digest(encoding || 'hex');
};

//返回 str 的SHA256值

function SHA256(str, encoding) {
    return crypto.createHash('sha256').update(str).digest(encoding || 'hex');
};

//返回 str 的加密SHA256值，加密密码为 pwd

function HmacSHA256(str, pwd, encoding) {
    return crypto.createHmac('sha256', pwd).update(str).digest(encoding || 'hex');
};

function checkType(obj) {
    var type = typeof obj;
    if (obj === null) {
        return 'null';
    } else if (type !== 'object') {
        return type;
    } else if (Array.isArray(obj)) {
        return 'array';
    } else return type;
};

function equal(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
};

//深度并集复制，用于数据对象复制、数据对象更新，若同时提供参数 a 对象和 b 对象，则将 b 对象所有属性（原始类型，忽略函数）复制给 a对象（同名则覆盖），
//返回值为深度复制了 b 后的 a，注意 a 和 b 必须同类型;
//若只提供参数 a，则 union 函数返回 a 的克隆，与JSON.parse(JSON.stringify(a))相比，克隆效率略高。

function union(a, b) {
    if (b === undefined) {
        var s, type = checkType(a);
        if (type === 'object') {
            s = {};
        } else if (type === 'array') {
            s = [];
        } else if (type === 'function') {
            return undefined;
        } else {
            return a;
        }
        for (var key in a) {
            if (!a.hasOwnProperty(key)) {
                continue;
            }
            if (typeof a[key] === 'object' && a[key] !== null) {
                s[key] = union(a[key]);
            } else {
                s[key] = a[key];
            }
        }
        return s;
    }
    if (checkType(a) !== checkType(b)) {
        return a;
    }
    for (var key in b) {
        if (!b.hasOwnProperty(key)) {
            continue;
        }
        var typeBkey = checkType(b[key]);
        if (typeBkey === 'object') {
            if (checkType(a[key]) !== 'object') {
                a[key] = {};
            }
            union(a[key], b[key]);
        } else if (typeBkey === 'array') {
            if (checkType(a[key]) !== 'array') {
                a[key] = [];
            }
            union(a[key], b[key]);
        } else if (typeBkey !== 'function') {
            a[key] = b[key];
        }
    }
    return a;
};

//深度交集复制，用于数据对象校验，即以 a 为模板，当a 和 b 共有属性且属性值类型一致时，将 b 的属性值复制给 a，对于 a 有 b 没有或 b 有 a 没有的属性，均删除，返回相交复制后的 a;
// var a = {q:0,w:'',e:{a:0,b:[0,0,0]}}, b = {r:10,w:'hello',e:{a:99,b:[1,2,3,4,5]}};
// intersect(a, b);  // a 变成{w:'hello',e:{a:99,b:[1,2,3]}}
//如果 a 的某属性是数组，且只有一个值，则以它为模板，将 b 对应的该属性的数组的值校检比复制
// var a = {q:0,w:'',e:{a:0,b:[0]}}, b = {r:10,w:'hello',e:{a:99,b:[1,2,3,4,5]}};
// intersect(a, b);  // a 变成{w:'hello',e:{a:99,b:[1,2,3,4,5]}} 注意a.e.b与上面的区别

function intersect(a, b) {
    if (a && b) {
        var typeA = checkType(a),
            typeB = checkType(b);
        if (typeA === 'array' && typeB === 'array' && a.length <= 1) {
            if (a.length === 0) {
                union(a, b);
            } else {
                var o = union(a[0]);
                var typeAkey = checkType(o);
                if (typeAkey !== 'function' && b.length > 0) {
                    for (var i = b.length - 1; i >= 0; i--) {
                        typeBkey = checkType(b[i]);
                        if (typeBkey === typeAkey) {
                            if (typeBkey === 'object' || typeBkey === 'array') {
                                a[i] = union(o);
                                intersect(a[i], b[i]);
                            } else {
                                a[i] = b[i];
                            }
                        } else {
                            delete a[i];
                        }
                    }
                } else {
                    delete a[0];
                }
            }
        } else if (typeA === 'object' && typeB === 'object' && Object.keys(a).length === 0) {
            union(a, b);
        } else {
            for (var key in a) {
                var typeBkey = checkType(b[key]);
                if (b.hasOwnProperty(key) && checkType(a[key]) === typeBkey && typeBkey !== 'function') {
                    if (typeBkey === 'object' || typeBkey === 'array') {
                        intersect(a[key], b[key]);
                    } else {
                        a[key] = b[key];
                    }
                } else {
                    delete a[key];
                }
            }
        }
        digestArray(a);
    }
    return a;
};

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
};
//数组去重，返回新数组，新数组中没有重复值。

function uniqueArray(a) {
    if (!Array.isArray(a)) {
        return a;
    }

    var o = {},
    re = [];
    for (var i = a.length - 1; i >= 0; i--) {
        if (o[typeof a[i] + a[i]] !== 1) {
            o[typeof a[i] + a[i]] = 1;
            re.push(a[i]);
        }
    };

    return re.reverse();
};
//数组去undefined，修改原数组，去除undefined值的元素。

function digestArray(a) {
    if (!Array.isArray(a)) {
        return a;
    }
    for (var i = a.length - 1; i >= 0; i--) {
        if (a[i] === undefined) {
            a.splice(i, 1);
        }
    };
    return a;
};

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
};

function formatTime(seconds) {
    var re = '',
        q = 0,
        o = seconds || Math.floor(Date.now() / 1000);

    function calculate(base) {
        q = o % base;
        o = (o - q) / base;
        return o
    };
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
};

//根据email返回gravatar.com的头像链接，returnUrl+'?s=200'则可获取size为200×200的头像

function gravatar(email) {
    var gravatarUrl = 'http://www.gravatar.com/avatar/$hex';
    if (checkEmail(email)) {
        return gravatarUrl.replace('$hex', MD5(email.toLowerCase()));
    } else {
        return false;
    }
};

//检测 str 是否为合法的email格式，返回 true/false

function checkEmail(str) {
    var reg = /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/;
    return reg.test(str) && str.length >= 6 && str.length <= 64;
};

//检测 str 是否为合法的Url格式，返回 true/false

function checkUrl(str) {
    var reg = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;
    return reg.test(str) && str.length <= 2083;
};

function checkUserID(str) {
    var reg = /^U[a-z]{5,}$/;
    return reg.test(str);
};

function checkUserName(str) {
    var reg = /^[(\u4e00-\u9fa5)a-z][(\u4e00-\u9fa5)a-z0-9_]{1,15}$/;
    var len = Buffer.byteLength(str, 'utf8');
    return reg.test(str) && len >= jsGen.config.UserNameMinLen && len <= jsGen.config.UserNameMaxLen;
};

function checkID(str, idPre) {
    var reg = new RegExp('^' + idPre + '[0-9A-Za-z]{3,}$');
    return reg.test(str);
};

function filterTag(str) {
    str = str.replace(/^[_,，\s]+/, '');
    str = str.replace(/[,，\s]/g, '');
    var len = Buffer.byteLength(str, 'utf8');
    if (len < 3) {
        return undefined;
    } else if (len <= 18) {
        return str;
    } else {
        var buf = new Buffer(20);
        buf.write(str, 0, 'utf8');
        str = buf.toString('utf8');
        return str.slice(0, -2);
    }
};

function filterTitle(str) {
    var options = {
        whiteList: {},
        onIgnoreTag: function (tag, html) {
            return '';
        }
    };
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
};

function filterSummary(str) {
    var options = {
        whiteList: {
            span: [],
            strong: [],
            b: [],
            i: [],
            code: [],
            a: ['href', 'title'],
            em: []
        },
        onIgnoreTag: function (tag, html) {
            return '';
        }
    };
    str = str.replace(/\s/g, ' ');
    str = jsGen.module.xss(str, options);
    var len = Buffer.byteLength(str, 'utf8');
    if (len <= jsGen.config.SummaryMaxLen) {
        return str;
    }
    var buf = new Buffer(jsGen.config.SummaryMaxLen + 2);
    buf.write(str, 0, 'utf8');
    str = buf.toString('utf8');
    return str.slice(0, -2);
};

function filterContent(str) {
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
};

function pagination(req, list, cache, callback) {
    var p = req.getparam.p || req.getparam.page || 1,
        n = req.getparam.n || req.getparam.num || 10,
        result = {
            pagination: {},
            data: []
        };
    callback = callback || jsGen.lib.tools.callbackFn;

    p = +p;
    n = +n;
    if (n >= 10 && n <= 500) {
        n = Math.floor(n);
    } else {
        n = 10;
    }
    if (p >= 1) {
        p = Math.floor(p);
    } else {
        p = 1;
    }
    result.pagination.total = list.length;
    list = list.slice((p - 1) * n, p * n);
    result.pagination.now = p;
    result.pagination.num = n;
    if (result.pagination.total <= result.pagination.num) {
        delete result.pagination;
    }
    list.reverse();
    next();

    function next() {
        var ID = list.pop();
        if (!ID) {
            return callback(null, result);
        }
        cache.getP(ID, function (err, doc) {
            if (err) {
                return callback(err, result);
            }
            if (doc) {
                result.data.push(doc);
            }
            next();
        });
    };
};

function checkTimeInterval(req, type, dm) {
    if (dm) {
        jsGen.cache.timeInterval.put(req.session._id + type, null, dm);
        return;
    }
    if (jsGen.cache.timeInterval.get(req.session._id + type)) {
        return true;
    }
};

module.exports = {
    callbackFn: callbackFn,
    Err: Err,
    MD5: MD5,
    HmacMD5: HmacMD5,
    SHA256: SHA256,
    HmacSHA256: HmacSHA256,
    checkType: checkType,
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
    pagination: pagination,
    checkTimeInterval: checkTimeInterval
};
