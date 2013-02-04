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
    }
  });
