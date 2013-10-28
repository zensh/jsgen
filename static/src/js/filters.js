'use strict';
/*global angular*/

angular.module('jsGen.filters', []).
filter('placeholder', ['tools',
    function (tools) {
        return function (str) {
            return tools.toStr(str) || '-';
        };
    }
]).filter('match', ['$locale',
    function ($locale) {
        return function (value, type) {
            return $locale.FILTER[type] && $locale.FILTER[type][value] || '';
        };
    }
]).filter('switch', ['$locale',
    function ($locale) {
        return function (value, type) {
            return $locale.FILTER[type] && $locale.FILTER[type][+ !! value] || '';
        };
    }
]).filter('checkName', ['tools',
    function (tools) {
        return function (text) {
            var reg = /^[(\u4e00-\u9fa5)a-z][(\u4e00-\u9fa5)a-zA-Z0-9_]{1,}$/;
            text = tools.toStr(text);
            return reg.test(text);
        };
    }
]).filter('length', ['utf8', 'tools',
    function (utf8, tools) {
        return function (text) {
            text = tools.toStr(text);
            return utf8.stringToBytes(text).length;
        };
    }
]).filter('cutText', ['utf8', 'tools',
    function (utf8, tools) {
        return function (text, len) {
            text = tools.trim(text);
            var bytes = utf8.stringToBytes(text);
            len = len > 0 ? len : 0;
            if (bytes.length > len) {
                bytes.length = len;
                text = utf8.bytesToString(bytes);
                text = text.slice(0, -2) + '…';
            }
            return text;
        };
    }
]).filter('formatDate', ['$filter', '$locale',
    function ($filter, $locale) {
        return function (date, full) {
            var o = Date.now() - date,
                dateFilter = $filter('date');
            if (full) {
                return dateFilter(date, $locale.DATETIME.fullD);
            } else if (o > 259200000) {
                return dateFilter(date, $locale.DATETIME.shortD);
            } else if (o > 86400000) {
                return Math.floor(o / 86400000) + $locale.DATETIME.dayAgo;
            } else if (o > 3600000) {
                return Math.floor(o / 3600000) + $locale.DATETIME.hourAgo;
            } else if (o > 60000) {
                return Math.floor(o / 60000) + $locale.DATETIME.minuteAgo;
            } else {
                return $locale.DATETIME.secondAgo;
            }
        };
    }
]).filter('formatTime', ['$locale',
    function ($locale) {
        return function (seconds) {
            var re = '',
                q = 0,
                o = seconds > 0 ? Math.round(+seconds) : Math.floor(Date.now() / 1000),
                TIME = $locale.DATETIME;

            function calculate(base) {
                q = o % base;
                o = (o - q) / base;
                return o;
            }
            calculate(60);
            re = q + TIME.second;
            calculate(60);
            re = (q > 0 ? (q + TIME.minute) : '') + re;
            calculate(24);
            re = (q > 0 ? (q + TIME.hour) : '') + re;
            return o > 0 ? (o + TIME.day + re) : re;
        };
    }
]).filter('formatBytes', ['$locale',
    function ($locale) {
        return function (bytes) {
            bytes = bytes > 0 ? bytes : 0;
            if (!bytes) {
                return '-';
            } else if (bytes < 1024) {
                return bytes + 'B';
            } else if (bytes < 1048576) {
                return (bytes / 1024).toFixed(3) + ' KiB';
            } else if (bytes < 1073741824) {
                return (bytes / 1048576).toFixed(3) + ' MiB';
            } else {
                return (bytes / 1073741824).toFixed(3) + ' GiB';
            }
        };
    }
]);