'use strict';
/*global angular, _*/

angular.module('jsGen.filters', []).
filter('match', ['$locale',
    function ($locale) {
        return function (value, type) {
            return $locale.FILTER[type] && $locale.FILTER[type][value] || '';
        };
    }
]).
filter('switch', ['$locale',
    function ($locale) {
        return function (value, type) {
            return $locale.FILTER[type] && $locale.FILTER[type][+ !! value] || '';
        };
    }
]).
filter('checkName', ['tools',
    function (tools) {
        return function (text) {
            var reg = /^[(\u4e00-\u9fa5)a-z][(\u4e00-\u9fa5)a-zA-Z0-9_]{1,}$/;
            text = tools.toStr(text);
            return reg.test(text);
        };
    }
]).
filter('length', ['utf8', 'tools',
    function (utf8, tools) {
        return function (text) {
            text = tools.toStr(text);
            return utf8.stringToBytes(text).length;
        };
    }
]).
filter('cutText', ['utf8', 'tools',
    function (utf8, tools) {
        return function (text, len) {
            text = tools.toStr(text);
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
filter('formatDate', ['$filter', '$locale',
    function ($filter, $locale) {
        return function (date, full) {
            var o = Date.now() - date,
                dateFilter = $filter('date');
            if (full) {
                return dateFilter(date, $locale.DATETIME.full);
            } else if (o > 259200000) {
                return dateFilter(date, $locale.DATETIME.short);
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
]);