'use strict';
/*global angular, _, jsGenVersion*/

angular.module('jsGen', ['jsGen.filters', 'jsGen.services', 'jsGen.directives', 'jsGen.controllers', 'jsGen.tools']).
constant('app', {
    version: jsGenVersion // 注册内部全局变量app
}).
config(['$httpProvider', 'app',
    function ($httpProvider, app) {
        // global loading status
        var count = 0,
            loading = false,
            status = {
                count: 0,
                total: 0
            };

        status.cancel = function () {
            count = 0;
            loading = false;
            this.count = 0;
            this.total = 0;
            app.loading(false, this); // end loading
        };

        // global loading start
        $httpProvider.defaults.transformRequest.push(function (data) {
            count += 1;
            status.count = count;
            status.total += 1;
            if (!loading) {
                setTimeout(function () {
                    if (!loading && count > 0) {
                        loading = true;
                        app.loading(true, status);
                    }
                }, 1000); // if no response in 1000ms, begin loading
            }
            return data;
        });
        // global loading end
        $httpProvider.defaults.transformResponse.push(function (data) {
            count -= 1;
            status.count = count;
            if (loading && count === 0) {
                status.cancel();
            }
            return data;
        });
        // global error handling
        $httpProvider.interceptors.push(function () {
            return {
                response: function (response) {
                    if (response.headers()['content-type'] === "application/json; charset=utf-8") {
                        if (response.data && response.data.error) {
                            return app.q.reject(response);
                        }
                    }
                    return response;
                },
                responseError: function (response) {
                    app.toast.error(response.data.error);
                    return app.q.reject(response);
                }
            };
        });
    }
]).
provider('getFile', ['app',
    function (app) {
        var self = this;
        this.html = function (fileName) {
            return '/static/tpl/' + fileName + '?v=' + (app.version || '');
        };
        this.md = function (fileName) {
            return '/static/md/' + fileName + '?v=' + (app.version || '');
        };
        this.$get = function () {
            return {
                html: self.html,
                md: self.md
            };
        };
    }
]).
config(['$routeProvider', '$locationProvider', 'getFileProvider',

    function ($routeProvider, $locationProvider, getFileProvider) {
        var index = {
            templateUrl: getFileProvider.html('index.html'),
            controller: 'indexCtrl'
        },
            login = {
                templateUrl: getFileProvider.html('login.html'),
                controller: 'userLoginCtrl'
            },
            register = {
                templateUrl: getFileProvider.html('register.html'),
                controller: 'userRegisterCtrl'
            },
            home = {
                templateUrl: getFileProvider.html('user.html'),
                controller: 'homeCtrl'
            },
            admin = {
                templateUrl: getFileProvider.html('admin.html'),
                controller: 'adminCtrl'
            },
            edit = {
                templateUrl: getFileProvider.html('article-editor.html'),
                controller: 'articleEditorCtrl'
            },
            tag = {
                templateUrl: getFileProvider.html('tag.html'),
                controller: 'tagCtrl'
            },
            reset = {
                templateUrl: getFileProvider.html('reset.html'),
                controller: 'userResetCtrl'
            },
            user = {
                templateUrl: getFileProvider.html('user.html'),
                controller: 'userCtrl'
            },
            article = {
                templateUrl: getFileProvider.html('article.html'),
                controller: 'articleCtrl'
            },
            collection = {
                templateUrl: getFileProvider.html('collection.html'),
                controller: 'collectionCtrl'
            };
        $routeProvider.
        when('/', index).
        when('/hots', index).
        when('/update', index).
        when('/latest', index).
        when('/T:ID', index).
        when('/tag/:TAG', index).
        when('/login', login).
        when('/register', register).
        when('/home', home).
        when('/admin', admin).
        when('/add', edit).
        when('/tag', tag).
        when('/reset/:RE', reset).
        when('/user/:UID', user).
        when('/A:ID/edit', edit).
        when('/U:ID', user).
        when('/A:ID', article).
        when('/C:ID', collection).
        otherwise({
            redirectTo: '/'
        });
        $locationProvider.html5Mode(true);
    }
]).
run(['app', '$q', '$rootScope', '$http', '$location', '$timeout', '$filter', '$anchorScroll', 'getFile', 'tools', 'toast', 'timing', 'cache', 'rest', 'sanitize',
        'mdParse', 'mdEditor', 'promiseGet', 'custom', 'getArticle', 'getUser', 'getList', 'getMarkdown',
    function (app, $q, $rootScope, $http, $location, $timeout, $filter,
        $anchorScroll, getFile, tools, toast, timing, cache, rest, sanitize, mdParse, mdEditor, promiseGet, custom, getArticle, getUser, getList, getMarkdown) {

        window.app = app; // for test
        tools(app); //添加jsGen系列工具函数
        app.q = $q;
        app.http = $http;
        app.toast = toast;
        app.timing = timing;
        app.location = $location;
        app.timeout = $timeout;
        app.filter = $filter;
        app.anchorScroll = $anchorScroll;
        app.getFile = getFile;
        app.cache = cache;
        app.rest = rest;
        app.sanitize = sanitize;
        app.mdParse = mdParse;
        app.mdEditor = mdEditor;
        app.promiseGet = promiseGet;
        app.custom = custom;
        app.getArticle = getArticle;
        app.getUser = getUser;
        app.getList = getList;
        app.getMarkdown = getMarkdown;
        app.rootScope = $rootScope;
        app.timer = null;

        app.validate = function (scope, turnoff, whiteList) {
            var collect = [],
                error;
            whiteList = _.isArray(whiteList) ? whiteList : [];
            scope.$broadcast('srsTooltipValidate', collect, turnoff);
            error = _.filter(collect, function (value) {
                return value.validate && value.$invalid && whiteList.indexOf(value.$name) < 0;
            });
            if (error.length === 0) {
                app.validate.errorList = null;
                scope.$broadcast('srsTooltipValidate', collect, true);
            } else {
                app.validate.errorList = error;
            }
            return !app.validate.errorList;
        };
        app.checkDirty = function (tplObj, pristineObj, Obj) {
            if (Obj) {
                var data = app.union(tplObj);
                app.intersect(data, Obj);
                $rootScope.stopUnload = !angular.equals(data, pristineObj);
            }
        };

        $rootScope.global = {
            isAdmin: false,
            isEditor: false,
            isLogin: false,
            loading: false,
            fullWidth: ''
        };

        $rootScope.validateTooltip = {
            validate: true,
            validateMsg: {
                required: '必填！',
                minlength: '太短！',
                maxlenght: '太长！',
                min: '太小！',
                max: '太大！',
                email: '格式无效！',
                username: '汉字、小写字母a-z、数字0-9、或下划线_，请以汉字或小写字母开头',
                minname: '长度必须大于5字节，一个汉字3字节',
                maxname: '长度必须小于15字节，一个汉字3字节',
                repassword: '两次输入密码必须一致！'
            }
        };

        $rootScope.logout = function () {
            var doc = app.rest.user.get({
                Uid: 'logout'
            }, function () {
                if (doc.logout) {
                    delete $rootScope.global.user;
                }
                $rootScope.checkUser();
                app.location.path('/');
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
            result = app.rest.user.save({
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
            var result = app.rest.index.get({
                OP: 'time'
            }, function () {
                if (result.timestamp) {
                    $rootScope.global.timestamp = result.timestamp;
                }
            });
            $timeout(getServTime, 300000);
        }

        var result = app.rest.index.get({}, function () {
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
    }
]);