'use strict';

/* Filters */
angular.module('jsGen.filters', []).
  filter('role', function() {
    return function(text) {
      switch (text) {
        case 'admin': return '管理员';
        case 'editor': return '编辑';
        case 'author': return '作者';
        case 'user': return '会员';
        case 'guest': return '待验证';
        case 'forbid': return '禁言';
        default: return text;
      }
    };
  }).
  filter('sex', function() {
    return function(text) {
      switch (text) {
        case 'male': return '男性';
        case 'female': return '女性';
        default: return text;
      }
    };
  }).
  filter('boolean', function() {
    return function(text) {
      if (text) return '开启';
      return '关闭';
    };
  }).
  filter('follow', function() {
    return function(text) {
      if (text) return '已关注';
      return '关注';
    };
  }).
  filter('favor', function() {
    return function(text) {
      if (text) return '已支持';
      return '支持';
    };
  }).
  filter('mark', function() {
    return function(text) {
      if (text) return '已标记';
      return '标记';
    };
  }).
  filter('oppose', function() {
    return function(text) {
      if (text) return '已反对';
      return '反对';
    };
  }).
  filter('checkName', function() {
    return function(text) {
        if(text) {
        var reg = /^[(\u4e00-\u9fa5)a-z][(\u4e00-\u9fa5)a-z0-9_]{1,15}$/;
        var len = utf8.stringToBytes(text).length;
        if (!reg.test(text)) return '支持汉字、小写字母a-z、数字0-9、或下划线_';
        else if (len > 0 && len < 5) return '长度必须大于5字节，一个汉字3字节';
        else if (len > 15) return '长度必须小于15字节，一个汉字3字节';
        } else return false;
    };
  }).
  filter('length', function() {
    return function(text) {
        if(text) return utf8.stringToBytes(text).length;
        return 0;
    };
  }).
  filter('cutText', function() {
    return function(text, len) {
        var bytes = utf8.stringToBytes(text);
        len = len || 0;
        if (bytes.length > len) {
            bytes.length = len;
            text = utf8.bytesToString(bytes);
            text = text.slice(0, -1) + '…';
        }
        return text;
    };
  }).
  filter('formatDate', ['$filter', function($filter) {
    return function(date) {
        var o = Date.now() - date;
        if (o > 259200000) return $filter('date')(date, 'yy-MM-dd HH:mm'); // 三天前直接显示标准日期格式
        if (o > 86400000) return Math.floor(o / 86400000) + '天前';
        if (o > 3600000) return Math.floor(o / 3600000) + '小时前';
        if (o > 60000) return Math.floor(o / 60000) + '分钟前';
        return "刚刚";
    };
  }]);
