'use strict';
/*global angular, _*/

angular.module('jsGen.locale', []).
run(['$locale',
    function ($locale) {
        angular.extend($locale, {
            RESET: {
                locked: '申请解锁',
                passwd: '找回密码',
                email: '请求信息已发送到您的邮箱，请查收。'
            },
            RESPONSE: {
                success: '请求成功',
                error: '请求失败'
            },
            VALIDATE: {
                required: '必填！',
                minlength: '太短！',
                maxlenght: '太长！',
                min: '太小！',
                max: '太大！',
                more: '太多！',
                email: 'Email无效！',
                pattern: '格式无效！',
                username: '有效字符为汉字、字母、数字、下划线，以汉字或小写字母开头！',
                minname: '长度应大于5字节，一个汉字3字节！',
                maxname: '长度应小于15字节，一个汉字3字节！',
                repasswd: '密码不一致！',
                url: 'URL无效！'
            },
            BTN_TEXT: {
                confirm: '确定',
                cancel: '取消',
                remove: '删除',
                goBack: '立刻返回'
            },
            TIMING: {
                goHome: '秒钟后自动返回主页'
            },
            HOME_TITLE: {
                index: ' 更新，阅读时间线：',
                mark: '我的收藏',
                article: '我的文章',
                comment: '我的评论',
                follow: '我的关注',
                fans: '我的粉丝'
            },
            USER_TITLE: {
                article: '的文章',
                fans: '的粉丝'
            },
            ARTICLE: {
                removed: '成功删除 ',
                updated: '成功更新 ',
                added: '成功保存 '
            },
            USER: {
                followed: '成功关注 ',
                unfollowed: '成功取消关注 ',
                email: '验证邮件已发送到新邮箱，通过验证后才保存修改',
                updated: '用户信息更新成功',
                noUpdate: '用户信息暂无变更'
            }
        });
    }
]);