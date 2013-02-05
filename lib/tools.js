var crypto = require('crypto'),
    globalConfig = require('../dao/json.js').GlobalConfig,
    xss = require('xss');

/**
 * Return md5 hash of the given string and optional encoding,
 * defaulting to hex.
 *
 *     utils.md5('wahoo');
 *     // => "e493298061761236c96b02ea6aa8a2ad"
 *
 * @param {String} str
 * @param {String} encoding
 * @return {String}
 * @api public
 */

// 默认的callback函数模板
function callbackFn(err, doc) {
    if(err) console.log(err);
    return doc;
};

//返回 str 的MD5值
function MD5(str, encoding) {
    return crypto.createHash('md5').update(str).digest(encoding || 'hex');
}

//返回 str 的SHA256值
function SHA256(str, encoding) {
    return crypto.createHash('sha256').update(str).digest(encoding || 'hex');
}
//返回 str 的加密SHA256值，加密密码为 pwd
function HmacSHA256(str, pwd, encoding) {
    return crypto.createHmac('sha256', pwd).update(str).digest(encoding || 'hex');
}

//检测 obj 类型，可能返回值为'Null','Undefined','Object','Array','Function','String','Number','Boolean','Regexp','Date','Window'...
function checkClass(obj) {
    if(obj === null) return 'Null';
    if(obj === undefined) return 'Undefined';
    return Object.prototype.toString.call(obj).slice(8, -1);
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

//深度对象复制函数，若同时提供参数 a 对象和 b 对象，则将 b 对象所有属性和方法复制给 a对象，返回值为深度复制了 b 后的 a，注意 a 和 b 必须同为对象类型或同为数组类型（此处为提高效率不做检测）;
//若只提供参数 a，则 merge 函数返回 a 的克隆，与JSON.parse(JSON.stringify(a))相比，merge是a的原版克隆，包括克隆a的方法等，克隆效率也略高。
function merge(a, b) {
    if(a && b) {
        for(var key in b) {
            if(checkClass(b[key]) === 'Object') {
                a[key] = {};
                merge(a[key], b[key]);
            } else if(checkClass(b[key]) === 'Array') {
                a[key] = [];
                merge(a[key], b[key]);
            } else a[key] = b[key];
        }
    } else if(a && b === undefined) {
        switch (checkClass(a)){
            case 'Object': var s = {}; break;
            case 'Array': var s = []; break;
            default: return a;
        }
        for(var key in a) {
            if(typeof a[key] === 'object' && a[key] !== null) {
                s[key] = merge(a[key]);
            } else s[key] = a[key];
        }
        return s;
    }
    return a;
}

//深度相交复制函数，用于对象校检赋值。即以 a 为模板，当a 和 b 共有属性且属性值类型一致时，将 b 的属性值复制给 a，对于 a 有 b 没有或 b 有 a 没有的属性，均删除，返回相交复制后的 a;
// var a = {q:0,w:'',e:{a:0,b:[0,0,0]}}, b = {r:10,w:'hello',e:{a:99,b:[1,2,3,4,5]}};
// intersect(a, b);  // a 变成{w:'hello',e:{a:99,b:[1,2,3]}}
//如果 a 的某属性是数组，且只有一个值，则以它为模板，将 b 对应的该属性的数组的值校检比复制
// var a = {q:0,w:'',e:{a:0,b:[0]}}, b = {r:10,w:'hello',e:{a:99,b:[1,2,3,4,5]}};
// intersect(a, b);  // a 变成{w:'hello',e:{a:99,b:[1,2,3,4,5]}} 注意a.e.b与上面的区别
function intersect(a, b) {
    if(a && b) {
        if(checkClass(a) === 'Array' && a.length === 1 && checkClass(b) === 'Array') {
            var o = merge(a[0]);
            for(var i = 0; i < b.length; i++) {
                if(checkClass(a[0]) === checkClass(b[i])) {
                    if(typeof b[i] === 'object' && b[i] !== null) {
                        a[i] = merge(o);
                        intersect(a[i], b[i]);
                    } else a[i] = b[i];
                } else break;
            }
        } else {
            for(var key in a) {
                if(b.hasOwnProperty(key) && checkClass(a[key]) === checkClass(b[key])) {
                    if(typeof b[key] === 'object' && b[key] !== null) {
                        intersect(a[key], b[key]);
                    } else a[key] = b[key];
                } else delete a[key];
            }
        }
    }
    return a;
}

//根据email返回gravatar.com的头像链接
function gravatar(email) {
    var gravatarUrl = 'http://www.gravatar.com/avatar/$hex';
    if(checkEmail(email)) {
        return gravatarUrl.replace('$hex', MD5(email.toLowerCase()));
    } else return false;
}

function checkUserID(str) {
    var reg = /^U[a-z]{5,}$/;
    return reg.test(str);
}

function checkUserName(str) {
    var reg = /^[(\u4e00-\u9fa5)a-z0-9_]{2,15}$/;
    var len = Buffer.byteLength(str, 'utf8');
    return reg.test(str) && len >= globalConfig.UserNameMinLen && len <= globalConfig.UserNameMaxLen;
}

function checkID(idPre, str) {
    var reg = /^[0-9A-Za-z]{3,}$/;
    return str[0] === idPre && reg.test(str.slice(1));
}

function filterTitle(str) {
    var options = {
        whiteList: {
            strong: ['class'],
            b: ['class'],
            i: ['class'],
            em: ['class']
        },
        onIgnoreTag: function(tag, html) {
            return '';
        }
    };
    str = str.replace(/\s/g, ' ');
    str = xss(str, options);
    var len = Buffer.byteLength(str, 'utf8');
    if(len < globalConfig.TitleMinLen) return null;
    if(len <= globalConfig.TitleMaxLen) return str;
    var buf = new Buffer(globalConfig.TitleMaxLen + 2);
    buf.write(str, 0, 'utf8');
    str = buf.toString('utf8');
    return str.slice(0, -2);
}

function filterSummary(str) {
    var options = {
        whiteList: {
            span: ['class'],
            strong: ['class'],
            b: ['class'],
            i: ['class'],
            br: [],
            p: ['class'],
            pre: ['class'],
            code: ['class'],
            a: ['class', 'href', 'title'],
            ul: ['class'],
            li: ['class'],
            ol: ['class'],
            dl: ['class'],
            dt: ['class'],
            em: ['class'],
            blockquote: ['class']
        },
        onIgnoreTag: function(tag, html) {
            return '';
        }
    };
    str = str.replace(/\s/g, ' ');
    str = xss(str, options);
    var len = Buffer.byteLength(str, 'utf8');
    if(len < globalConfig.SummaryMinLen) return null;
    if(len <= globalConfig.SummaryMaxLen) return str;
    var buf = new Buffer(globalConfig.SummaryMaxLen + 2);
    buf.write(str, 0, 'utf8');
    str = buf.toString('utf8');
    return str.slice(0, -2);
}

function filterComment(str) {
    var options = {
        whiteList: {
            h1: ['class'],
            h2: ['class'],
            h3: ['class'],
            h4: ['class'],
            h5: ['class'],
            h6: ['class'],
            span: ['class'],
            strong: ['class'],
            b: ['class'],
            i: ['class'],
            br: [],
            p: ['class'],
            pre: ['class'],
            code: ['class'],
            a: ['class', 'href', 'title'],
            img: ['class', 'src', 'alt', 'title'],
            table: ['class', 'width', 'border'],
            tr: ['class'],
            td: ['class', 'width', 'colspan'],
            th: ['class', 'width', 'colspan'],
            tbody: ['class'],
            ul: ['class'],
            li: ['class'],
            ol: ['class'],
            dl: ['class'],
            dt: ['class'],
            em: ['class'],
            cite: ['class'],
            blockquote: ['class']
        },
        onIgnoreTag: function(tag, html) {
            return '';
        }
    };
    str = xss(str, options);
    var len = Buffer.byteLength(str, 'utf8');
    if(len < globalConfig.CommentMinLen) return null;
    if(len <= globalConfig.CommentMaxLen) return str;
    var buf = new Buffer(globalConfig.CommentMaxLen + 2);
    buf.write(str, 0, 'utf8');
    str = buf.toString('utf8');
    return str.slice(0, -2);
}

function filterContent(str) {
    str = xss(str);
    var len = Buffer.byteLength(str, 'utf8');
    if(len < globalConfig.ContentMinLen) return null;
    if(len <= globalConfig.ContentMaxLen) return str;
    var buf = new Buffer(globalConfig.ContentMaxLen + 2);
    buf.write(str, 0, 'utf8');
    str = buf.toString('utf8');
    return str.slice(0, -2);
}

module.exports = {
    callbackFn: callbackFn,
    MD5: MD5,
    SHA256: SHA256,
    HmacSHA256: HmacSHA256,
    checkClass: checkClass,
    checkEmail: checkEmail,
    checkUrl: checkUrl,
    merge: merge,
    intersect: intersect,
    gravatar: gravatar,
    checkUserID: checkUserID,
    checkUserName: checkUserName,
    checkID: checkID,
    filterTitle: filterTitle,
    filterSummary: filterSummary,
    filterComment: filterComment,
    filterContent: filterContent
};
