'use strict';

angular.module('jsGen', ['jsGen.filters', 'jsGen.services', 'jsGen.directives', 'jsGen.controllers', 'jsGen.tools']).
config(['$routeProvider', '$locationProvider',

function ($routeProvider, $locationProvider) {
    $routeProvider.
    when('/', {
        templateUrl: '/static/tpl/index.html',
        controller: 'indexCtrl'
    }).
    when('/err', {
        templateUrl: '/static/tpl/err.html',
        controller: 'errCtrl'
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
    when('/T:ID', {
        templateUrl: '/static/tpl/tag.html',
        controller: 'tagCtrl'
    }).
    when('/O:ID', {
        templateUrl: '/static/tpl/collection.html',
        controller: 'collectionCtrl'
    }).
    otherwise({
        redirectTo: '/'
    });
    $locationProvider.html5Mode(true);
}]).
run(['$rootScope', '$http', '$location', '$timeout', '$filter', '$anchorScroll', 'tools', 'cache', 'rest', 'sanitize',
    'MdParse', 'MdEditor', 'getArticle', 'getMarkdown', function ($rootScope, $http, $location, $timeout, $filter,
    $anchorScroll, tools, cache, rest, sanitize, MdParse, MdEditor, getArticle, getMarkdown) {
    // 注册全局变量jsGen
    window.jsGen = {
        global: {}
    };

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
    jsGen.getMarkdown = getMarkdown;
    jsGen.rootScope = $rootScope;

    $rootScope.isAdmin = false;
    $rootScope.isLogin = false;
    $rootScope.logout = function () {
        var doc = jsGen.rest.logout.get({}, function () {
            if (doc.logout) delete $rootScope.global.user;
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
            if ($rootScope.global.user.role === 'admin') $rootScope.isAdmin = true;
            else $rootScope.isAdmin = false;
        } else {
            $rootScope.isLogin = false;
            $rootScope.isAdmin = false;
        }
    };
    $rootScope.followMe = function (user) {
        var result;
        result = jsGen.rest.user.save({
            Uid: user._id
        }, {
            follow: !user.isFollow
        }, function () {
            if (!result.err) {
                if (result.follow) $rootScope.global.user.followList.push(result.follow);
                else $rootScope.global.user.followList.some(function (x, i, a) {
                    if (x._id === user._id) {
                        a.splice(i, 1);
                        return true;
                    }
                });
                if (user.fans) user.fans += user.isFollow ? -1 : 1;
                user.isFollow = !user.isFollow;
            }
        });
    };
    $rootScope.global = jsGen.rest.index.get({}, function () {
        $rootScope.checkUser();
        $rootScope.global.ArticleTagsMax = $rootScope.global.ArticleTagsMax || 5;
        $rootScope.global.UserTagsMax = $rootScope.global.UserTagsMax || 5;
        $rootScope.global.TitleMinLen = $rootScope.global.TitleMinLen || 9;
        $rootScope.global.TitleMaxLen = $rootScope.global.TitleMaxLen || 180;
        $rootScope.global.SummaryMaxLen = $rootScope.global.SummaryMaxLen || 480;
        $rootScope.global.ContentMinLen = $rootScope.global.ContentMinLen || 18;
        $rootScope.global.ContentMaxLen = $rootScope.global.ContentMaxLen || 50000;
        $rootScope.global.UserNameMinLen = $rootScope.global.UserNameMinLen || 5;
        $rootScope.global.UserNameMaxLen = $rootScope.global.UserNameMaxLen || 20;
        $rootScope.global.info.angularjs = angular.version.full;
    });
    $rootScope.$watch(function () {
        return $location.path();
    }, function (path, goBack) {
        jsGen.goBack = goBack;
        var element = angular.element(document.getElementById('main'));
        var reg = /\/add|^\/A.+\/edit$/;
        if (reg.test(path)) element.addClass('container-large');
        else element.removeClass('container-large');
    });
    $rootScope.$watch('err', function (err) {
        if (err && err.message) {
            var dom = angular.element(document.getElementById('err-modal'));
            dom.modal('show');
            $rootScope.timeout = 5;
            $rootScope.$on('timeout', function (event) {
                event.stopPropagation();
                $rootScope.err = null;
                $rootScope.timeout = undefined;
                dom.modal('hide');
            });
        }
    });
}]);
