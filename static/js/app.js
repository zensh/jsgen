'use strict';
// 注册全局变量jsGen
window.jsGen = jsGen || {};

angular.module('jsGen', ['jsGen.filters', 'jsGen.services', 'jsGen.directives', 'jsGen.controllers', 'jsGen.tools']).
provider('newVersion', function () {
    var get = function (url) {
        return url + '?v=' + (jsGen.version || '');
    };
    this.$get = function () {
        return get;
    };
    this.get = get;
}).
config(['$routeProvider', '$locationProvider', 'newVersionProvider',

function ($routeProvider, $locationProvider, newVersionProvider) {
    $routeProvider.
    when('/', {
        templateUrl: newVersionProvider.get('/static/tpl/index.html'),
        controller: 'indexCtrl'
    }).
    when('/login', {
        templateUrl: newVersionProvider.get('/static/tpl/login.html'),
        controller: 'userLoginCtrl'
    }).
    when('/register', {
        templateUrl: newVersionProvider.get('/static/tpl/register.html'),
        controller: 'userRegisterCtrl'
    }).
    when('/home', {
        templateUrl: newVersionProvider.get('/static/tpl/user.html'),
        controller: 'homeCtrl'
    }).
    when('/admin', {
        templateUrl: newVersionProvider.get('/static/tpl/admin.html'),
        controller: 'adminCtrl'
    }).
    when('/add', {
        templateUrl: newVersionProvider.get('/static/tpl/article-editor.html'),
        controller: 'articleEditorCtrl'
    }).
    when('/tag', {
        templateUrl: newVersionProvider.get('/static/tpl/tag.html'),
        controller: 'tagCtrl'
    }).
    when('/reset/:RE', {
        templateUrl: newVersionProvider.get('/static/tpl/reset.html'),
        controller: 'userResetCtrl'
    }).
    when('/U:ID', {
        templateUrl: newVersionProvider.get('/static/tpl/user.html'),
        controller: 'userCtrl'
    }).
    when('/user/:UID', {
        templateUrl: newVersionProvider.get('/static/tpl/user.html'),
        controller: 'userCtrl'
    }).
    when('/A:ID/edit', {
        templateUrl: newVersionProvider.get('/static/tpl/article-editor.html'),
        controller: 'articleEditorCtrl'
    }).
    when('/A:ID', {
        templateUrl: newVersionProvider.get('/static/tpl/article.html'),
        controller: 'articleCtrl'
    }).
    when('/C:ID', {
        templateUrl: newVersionProvider.get('/static/tpl/collection.html'),
        controller: 'collectionCtrl'
    }).
    when('/tag/:TAG', {
        templateUrl: newVersionProvider.get('/static/tpl/index.html'),
        controller: 'indexCtrl'
    }).
    when('/:OP', {
        templateUrl: newVersionProvider.get('/static/tpl/index.html'),
        controller: 'indexCtrl'
    }).
    otherwise({
        redirectTo: '/'
    });
    $locationProvider.html5Mode(true);
}]).
run(['$rootScope', '$http', '$location', '$timeout', '$filter', '$anchorScroll', 'newVersion', 'tools', 'cache', 'rest', 'sanitize',
    'MdParse', 'MdEditor', 'getArticle', 'getUser', 'getList', 'getMarkdown', function ($rootScope, $http, $location, $timeout, $filter,
$anchorScroll, newVersion, tools, cache, rest, sanitize, MdParse, MdEditor, getArticle, getUser, getList, getMarkdown) {

    jsGen = tools(jsGen); //添加jsGen系列工具函数
    jsGen.http = $http;
    jsGen.location = $location;
    jsGen.timeout = $timeout;
    jsGen.filter = $filter;
    jsGen.anchorScroll = $anchorScroll;
    jsGen.newVersion = newVersion;
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
    jsGen.timer = null;

    $rootScope.global = {
        isAdmin: false,
        isEditor: false,
        isLogin: false,
        loading: false,
        fullWidth: ''
    }

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
            $rootScope.global.isLogin = true;
            if ($rootScope.global.user.role === 5) {
                $rootScope.global.isAdmin = true;
            } else {
                $rootScope.global.isAdmin = false;
            }
            if ($rootScope.global.user.role >= 4) {
                $rootScope.global.isEditor = true;
            } else {
                $rootScope.global.isEditor = false;
            }
        } else {
            $rootScope.global.isLogin = false;
            $rootScope.global.isAdmin = false;
            $rootScope.global.isEditor = false;
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
    $rootScope.global.loading = true;

    function getServTime() {
        var result = jsGen.rest.index.get({
            OP: 'time'
        }, function () {
            if (result.timestamp) {
                $rootScope.global.timestamp = result.timestamp;
            }
        });
        $timeout(getServTime, 300000);
    };
    var result = jsGen.rest.index.get({}, function () {
        angular.extend($rootScope.global, result);
        $rootScope.global.loading = false;
        $rootScope.global.title2 = $rootScope.global.description;
        $rootScope.global.info.angularjs = angular.version.full;
        $rootScope.checkUser();
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
    }, function (path) {
        var reg = /\/add|^\/A.+\/edit$/;
        if (!reg.test(path)) {
            $rootScope.global.fullWidth = '';
        }
    });
    $rootScope.$watch('global.loading', function (value) {
        if (value) {
            $timeout(function () {
                $rootScope.global.loadingOn = $rootScope.global.loading;
            }, 1000);
        } else {
            $rootScope.global.loadingOn = false;
        }
    });
    $rootScope.$watch('msg', function (msg) {
        var dom;
        if ($) {
            dom = $('#msg-modal');
        }
        if (dom && dom.modal && msg && (msg.name || msg.message)) {
            if (msg.type === 'error') {
                $rootScope.msgmodal = 'text-error';
            } else {
                $rootScope.msgmodal = 'text-success';
            }
            dom.modal('show');
            $rootScope.timeout = 5;
            $rootScope.$on('timeout', function (event) {
                event.stopPropagation();
                var url = null;
                if ($rootScope.msg && $rootScope.msg.url) {
                    url = $rootScope.msg.url;
                }
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
