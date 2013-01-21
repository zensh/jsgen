var crypto = require('crypto'),
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

function MD5(str, encoding) {
    return crypto.createHash('md5').update(str).digest(encoding || 'hex');
}

function SHA256(str, encoding) {
    return crypto.createHash('sha256').update(str).digest(encoding || 'hex');
}

function HmacSHA256(str, pwd, encoding) {
    return crypto.createHmac('sha256', pwd).update(str).digest(encoding || 'hex');
}

function checkClass(obj) {
    if(obj === null) return 'Null';
    if(obj === undefined) return 'Undefined';
    return Object.prototype.toString.call(obj).slice(8, -1);
}

function checkEmail(str) {
    var reg = /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/;
    return reg.test(str) && str.length >= 6 && str.length <= 64;
}

function checkUrl(str) {
    var reg = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;
    return reg.test(str) && str.length <= 2083;
}

function merge(a, b) {
    if(a && b) {
        for(var key in b) {
            if(typeof b[key] === 'object' && b[key] !== null) {
                a[key] = b[key];
                merge(a[key], b[key]);
            } else a[key] = b[key];
        }
    }
    return a;
}

function intersect(a, b) {
    if(a && b) {
        for(var key in a) {
            if(b.hasOwnProperty(key)) {
                if(typeof b[key] === 'object' && b[key] !== null) {
                    intersect(a[key], b[key]);
                } else a[key] = b[key];
            } else delete a[key];
        }
    }
    return a;
}

function gravatar(email, size) {
    var size = size || 80;
    if(typeof size !== 'number' || size < 1 || size > 2048) return false;

    var gravatarUrl = 'http://www.gravatar.com/avatar/$hex?s=' + size;
    if(checkEmail(email)) {
        return gravatarUrl.replace('$hex', md5(email.trim().toLowerCase()));
    } else return false;
}

function checkUserID(str) {
    var reg = /^U[a-z]{5,}$/;
    return reg.test(str);
}

function checkUserName(str) {
    var reg = /^[(\u4e00-\u9fa5)a-z0-9_]{2,15}$/;
    var len = Buffer.byteLength(str, 'utf8');
    return reg.test(str) && len >= 5 && len <= 15;
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
    if(Buffer.byteLength(str, 'utf8') <= 90) return str;
    var buf = new Buffer(92);
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
    if(Buffer.byteLength(str, 'utf8') <= 240) return str;
    var buf = new Buffer(242);
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
    if(Buffer.byteLength(str, 'utf8') <= 420) return str;
    var buf = new Buffer(422);
    buf.write(str, 0, 'utf8');
    str = buf.toString('utf8');
    return str.slice(0, -2);
}

function filterContent(str) {
    str = xss(str);
    if(Buffer.byteLength(str, 'utf8') <= 20480) return str;
    var buf = new Buffer(20482);
    buf.write(str, 0, 'utf8');
    str = buf.toString('utf8');
    return str.slice(0, -2);
}

module.exports = {
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

//console.log(typeof []);
