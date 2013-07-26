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
                maxlength: '太长！',
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
                goBack: '返回'
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
                preview: '预览：',
                reply: '评论：',
                removed: '成功删除 ',
                updated: '成功更新 ',
                added: '成功保存 ',
                markdown: 'Markdown简明语法',
                marked: '已收藏 ',
                unmarked: '已取消收藏 ',
                favored: '已支持 ',
                unfavored: '已取消支持 ',
                opposed: '已反对 ',
                unopposed: '已取消反对 ',
                highlight: '置顶 ',
                unhighlight: '取消置顶 '
            },
            USER: {
                followed: '已关注 ',
                unfollowed: '已取消关注 ',
                email: '验证邮件已发送到新邮箱，通过验证后才保存修改',
                updated: '用户信息更新成功',
                noUpdate: '用户信息暂无变更',
                noLogin: '您还未登录'
            },
            FILTER: {
                role: ['禁言', '待验证', '会员', '组员', '编辑', '管理员'],
                follow: ['关注', '已关注'],
                favor: ['支持', '已支持'],
                mark: ['收藏', '已收藏'],
                oppose: ['反对', '已反对'],
                highlight: ['置顶', '取消置顶'],
                turn: ['开启', '关闭'],
                edit: ['添加', '编辑'],
                gender: {
                    male: '男',
                    female: '女'
                }
            },
            DATETIME: {
                full: 'yyyy年MM月dd日 HH:mm',
                short: 'MM-dd HH:mm',
                dayAgo: '天前',
                hourAgo: '小时前',
                minuteAgo: '分钟前',
                secondAgo: '刚刚'
            }
        });
    }
]);