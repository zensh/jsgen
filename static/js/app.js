'use strict';

angular.module('jsGen', ['jsGen.filters', 'jsGen.services', 'jsGen.directives', 'jsGen.controllers', 'jsGen.tools']).
config(['$routeProvider', '$locationProvider',

function ($routeProvider, $locationProvider) {
    $routeProvider.
    when('/', {
        templateUrl: '/static/tpl/index.html',
        controller: 'indexCtrl'
    }).
    when('/login', {
        templateUrl: '/static/tpl/login.html',
        controller: 'userLoginCtrl'
    }).
    when('/register', {
        templateUrl: '/static/tpl/register.html',
        controller: 'userRegisterCtrl'
    }).
    when('/home', {
        templateUrl: '/static/tpl/user.html',
        controller: 'homeCtrl'
    }).
    when('/admin', {
        templateUrl: '/static/tpl/admin.html',
        controller: 'adminCtrl'
    }).
    when('/add', {
        templateUrl: '/static/tpl/article-editor.html',
        controller: 'articleEditorCtrl'
    }).
    when('/tag', {
        templateUrl: '/static/tpl/tag.html',
        controller: 'tagCtrl'
    }).
    when('/reset/:RE', {
        templateUrl: '/static/tpl/reset.html',
        controller: 'userResetCtrl'
    }).
    when('/U:ID', {
        templateUrl: '/static/tpl/user.html',
        controller: 'userCtrl'
    }).
    when('/A:ID/edit', {
        templateUrl: '/static/tpl/article-editor.html',
        controller: 'articleEditorCtrl'
    }).
    when('/A:ID', {
        templateUrl: '/static/tpl/article.html',
        controller: 'articleCtrl'
    }).
    when('/C:ID', {
        templateUrl: '/static/tpl/collection.html',
        controller: 'collectionCtrl'
    }).
    when('/:OP', {
        templateUrl: '/static/tpl/index.html',
        controller: 'indexCtrl'
    }).
    otherwise({
        redirectTo: '/'
    });
    $locationProvider.html5Mode(true);
}]).
run(['$rootScope', '$http', '$location', '$timeout', '$filter', '$anchorScroll', 'tools', 'cache', 'rest', 'sanitize',
    'MdParse', 'MdEditor', 'getArticle', 'getUser', 'getList', 'getMarkdown', function ($rootScope, $http, $location, $timeout, $filter,
    $anchorScroll, tools, cache, rest, sanitize, MdParse, MdEditor, getArticle, getUser, getList, getMarkdown) {
    // 注册全局变量jsGen
    window.jsGen = {};

    jsGen = tools(jsGen); //添加jsGen系列工具函数
    jsGen.http = $http;
    jsGen.location = $location;
    jsGen.timeout = $timeout;
    jsGen.filter = $filter;
    jsGen.anchorScroll = $anchorScroll;
    jsGen.cache = cache;
    jsGen.rest = rest;
    jsGen.sanitize = sanitize;
    jsGen.MdParse = MdParse;
    jsGen.MdEditor = MdEditor;
    jsGen.getArticle = getArticle;
    jsGen.getUser = getUser;
    jsGen.getList = getList;
    jsGen.getMarkdown = getMarkdown;
    jsGen.rootScope = $rootScope;

    $rootScope.isAdmin = false;
    $rootScope.isLogin = false;
    $rootScope.logout = function () {
        var doc = jsGen.rest.user.get({
            Uid: 'logout'
        }, function () {
            if (doc.logout) {
                delete $rootScope.global.user;
            }
            $rootScope.checkUser();
            jsGen.location.path('/');
        });
    };
    $rootScope.clearUser = function () {
        delete $rootScope.global.user;
        $rootScope.checkUser();
    };
    $rootScope.checkUser = function () {
        if ($rootScope.global.user && $rootScope.global.user.role) {
            $rootScope.isLogin = true;
            if ($rootScope.global.user.role === 5) {
                $rootScope.isAdmin = true;
            } else {
                $rootScope.isAdmin = false;
            }
        } else {
            $rootScope.isLogin = false;
            $rootScope.isAdmin = false;
        }
    };
    $rootScope.checkIsFollow = function (user) {
        var me = $rootScope.global.user || {
            followList: []
        };
        if (user._id === me._id) {
            user.isMe = true;
        }
        user.isFollow = me.followList.some(function (x) {
            return x === user._id;
        });
    };
    $rootScope.followMe = function (user) {
        var result;
        result = jsGen.rest.user.save({
            Uid: user._id
        }, {
            follow: !user.isFollow
        }, function () {
            if (!result.err) {
                if (result.follow) {
                    $rootScope.global.user.followList.push(user._id);
                } else {
                    $rootScope.global.user.followList.some(function (x, i, a) {
                        if (x === user._id) {
                            a.splice(i, 1);
                            return true;
                        }
                    });
                }
                if (user.fans) {
                    user.fans += user.isFollow ? -1 : 1;
                }
                user.isFollow = !user.isFollow;
            } else {
                $rootScope.msg = result.err;
            }
        });
    };
    $rootScope.global = jsGen.rest.index.get({}, function () {
        $rootScope.checkUser();
        $rootScope.global.info.angularjs = angular.version.full;
        if (!$rootScope.global.date) {
            $rootScope.msg = {
                name: '错误提示',
                message: '网页初始化出错',
                type: 'error'
            };
        }
    });
    $rootScope.$watch(function () {
        return $location.path();
    }, function (path, goBack) {
        jsGen.goBack = goBack || '/';
        var element = angular.element(document.getElementById('main'));
        var reg = /\/add|^\/A.+\/edit$/;
        if (reg.test(path)) {
            element.addClass('container-large');
        } else {
            element.removeClass('container-large');
        }
    });
    $rootScope.$watch('msg', function (msg) {
        if (msg && (msg.name || msg.message)) {
            if (msg.type === 'error') {
                $rootScope.msgmodal = 'text-error';
            } else {
                $rootScope.msgmodal = 'text-success';
            }
            var dom = angular.element(document.getElementById('msg-modal'));
            dom.modal('show');
            $rootScope.timeout = 5;
            $rootScope.$on('timeout', function (event) {
                event.stopPropagation();
                var url = null;
                if (msg && msg.url) {
                    url = msg.url;
                }
                msg = null;
                $rootScope.msg = null;
                $rootScope.timeout = undefined;
                dom.modal('hide');
                if (url) {
                    $location.path(url);
                }
            });
        }
    }, true);
}]);
