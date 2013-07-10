'use strict';
/*global angular, _*/

angular.module('jsGen.filters', []).
filter('string', function () {
    return function (value) {
        return value === 0 ? '0' : (value && (value + '') || '');
    };
}).
filter('role', function () {
    return function (text) {
        switch (text) {
        case 5:
            return '管理员';
        case 4:
            return '编辑';
        case 3:
            return '组员';
        case 2:
            return '会员';
        case 1:
            return '待验证';
        case 0:
            return '禁言';
        default:
            return text;
        }
    };
}).
filter('sex', function () {
    return function (text) {
        switch (text) {
        case 'male':
            return '男性';
        case 'female':
            return '女性';
        default:
            return text;
        }
    };
}).
filter('boolean', function () {
    return function (text) {
        if (text) {
            return '开启';
        } else {
            return '关闭';
        }
    };
}).
filter('follow', function () {
    return function (text) {
        if (text) {
            return '已关注';
        } else {
            return '关注';
        }
    };
}).
filter('favor', function () {
    return function (text) {
        if (text) {
            return '已支持';
        } else {
            return '支持';
        }
    };
}).
filter('mark', function () {
    return function (text) {
        if (text) {
            return '已标记';
        } else {
            return '标记';
        }
    };
}).
filter('oppose', function () {
    return function (text) {
        if (text) {
            return '已反对';
        } else {
            return '反对';
        }
    };
}).
filter('checkName', ['$filter', function ($filter) {
    return function (text) {
        var reg = /^[(\u4e00-\u9fa5)a-z][(\u4e00-\u9fa5)a-zA-Z0-9_]{1,}$/;
        text = $filter('string')(text);
        return reg.test(text);
    };
}]).
filter('length', ['$filter', 'utf8',
    function ($filter, utf8) {
        return function (text) {
            text = $filter('string')(text);
            return utf8.stringToBytes(text).length;
        };
    }
]).
filter('cutText', ['utf8',
    function (utf8) {
        return function (text, len) {
            if (typeof text !== 'string') {
                return text;
            }
            text = text.replace(/\s+/g, ' ');
            var bytes = utf8.stringToBytes(text);
            len = len || 0;
            if (bytes.length > len) {
                bytes.length = len;
                text = utf8.bytesToString(bytes);
                text = text.slice(0, -2) + '…';
            }
            return text;
        };
    }
]).
filter('formatDate', ['$filter',
    function ($filter) {
        return function (date, full) {
            var o = Date.now() - date;
            if (full) {
                return $filter('date')(date, 'yyyy年MM月dd日 HH:mm');
            } else if (o > 259200000) {
                return $filter('date')(date, 'MM-dd HH:mm');
            } else if (o > 86400000) {
                return Math.floor(o / 86400000) + '天前';
            } else if (o > 3600000) {
                return Math.floor(o / 3600000) + '小时前';
            } else if (o > 60000) {
                return Math.floor(o / 60000) + '分钟前';
            } else {
                return "刚刚";
            }
        };
    }
]);