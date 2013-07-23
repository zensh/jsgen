'use strict';
/*global angular, _*/

angular.module('jsGen.locale', []).
run(['$locale',
    function ($locale) {
        angular.extend($locale, {
            RESET: {
                locked: '申请解锁',
                passwd: '找回密码',
                email: '相关信息已发送到您的邮箱'
            },
            RESPONSE: {
                success: '请求成功',
                error: '请求失败'
            }
        });
    }
]);