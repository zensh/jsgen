'use strict';

/* Filters */

angular.module('jsGen.filters', []).
  filter('role', function() {
    return function(text) {
      switch (text) {
        case 'admin': return '管理员';
        case 'editor': return '编辑';
        case 'author': return '特约作者';
        case 'user': return '普通会员';
        case 'guest': return '未验证会员';
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
  });
