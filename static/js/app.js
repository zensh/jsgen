'use strict';
/*global angular, _*/

angular.module('jsGen', ['jsGen.tools', 'jsGen.router', 'jsGen.filters', 'jsGen.services', 'jsGen.locale', 'jsGen.directives', 'jsGen.controllers']).
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
                window.setTimeout(function () {
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
                response: function (res) {
                    var error, data = res.data;
                    if (angular.isObject(data)) {
                        app.timestamp = data.timestamp;
                        error = !data.ack && data.error;
                    }
                    if (error) {
                        app.toast.error(error.message, error.name);
                        return app.q.reject(data);
                    } else {
                        return res;
                    }
                },
                responseError: function (res) {
                    var data = res.data;
                    app.toast.error(data.message || data, res.status);
                    return app.q.reject(data);
                }
            };
        });
    }
]).run(['app', '$q', '$rootScope', '$http', '$location', '$timeout', '$filter', '$locale', 'getFile', 'tools', 'toast', 'timing', 'cache', 'restAPI', 'sanitize',
    'mdParse', 'mdEditor', 'CryptoJS', 'promiseGet', 'myConf', 'anchorScroll',
    function (app, $q, $rootScope, $http, $location, $timeout, $filter, $locale,
        getFile, tools, toast, timing, cache, restAPI, sanitize, mdParse, mdEditor, CryptoJS, promiseGet, myConf, anchorScroll) {
        var unSave = {
            stopUnload: false,
            nextUrl: ''
        };

        window.app = app; // for test
        app.q = $q;
        app.http = $http;
        app.toast = toast;
        app.timing = timing;
        app.location = $location;
        app.timeout = $timeout;
        app.timeOffset = 0;
        app.timestamp = Date.now() + 0;
        app.filter = $filter;
        app.locale = $locale;
        app.anchorScroll = anchorScroll;
        app.getFile = getFile;
        app.cache = cache;
        app.restAPI = restAPI;
        app.sanitize = sanitize;
        app.mdParse = mdParse;
        app.mdEditor = mdEditor;
        app.CryptoJS = CryptoJS;
        app.promiseGet = promiseGet;
        app.myConf = myConf;
        app.rootScope = $rootScope;
        angular.extend(app, tools); //添加jsGen系列工具函数

        app.loading = function (value, status) {
            // $rootScope.loading = status;
            $rootScope.loading.show = value;
            if (!$rootScope.$$phase) {
                $rootScope.$apply();
            }
        };
        app.validate = function (scope, turnoff) {
            var collect = [],
                error = [];
            scope.$broadcast('genTooltipValidate', collect, turnoff);
            app.each(collect, function (x) {
                if (x.validate && x.$invalid) {
                    error.push(x);
                }
            });
            if (error.length === 0) {
                app.validate.errorList = null;
                scope.$broadcast('genTooltipValidate', collect, true);
            } else {
                app.validate.errorList = error;
            }
            return !app.validate.errorList;
        };
        app.checkDirty = function (tplObj, pristineObj, Obj) {
            var data = app.union(tplObj);
            if (data && pristineObj && Obj) {
                app.intersect(data, Obj);
                app.each(data, function (x, key, list) {
                    if (angular.equals(x, pristineObj[key])) {
                        delete list[key];
                    }
                });
                unSave.stopUnload = !app.isEmpty(data);
            } else {
                unSave.stopUnload = false;
            }
            return data;
        };
        app.removeItem = function (item, key, list) {
            return app.some(list, function (x, i) {
                if (x[key] === item[key]) {
                    list.splice(i, 1);
                    return true;
                }
            });
        };
        app.checkUser = function () {
            var global = $rootScope.global;
            global.isLogin = !! global.user;
            global.isAdmin = global.user && global.user.role === 5;
            global.isEditor = global.user && global.user.role >= 4;
        };
        app.clearUser = function () {
            $rootScope.global.user = null;
            app.checkUser();
        };
        app.checkFollow = function (user) {
            var me = $rootScope.global.user || {};
            user.isMe = user._id === me._id;
            user.isFollow = !user.isMe && app.some(me.followList, function (x) {
                return x === user._id;
            });
        };
        app.checkAuthor = function (article) {
            var me = $rootScope.global.user || {};
            article.isAuthor = article.author._id === me._id;
        };

        $rootScope.loading = {
            show: false
        };
        $rootScope.global = {
            isAdmin: false,
            isEditor: false,
            isLogin: false
        };
        $rootScope.validateTooltip = {
            validate: true,
            validateMsg: $locale.VALIDATE
        };

        $rootScope.unSaveModal = {
            confirmBtn: $locale.BTN_TEXT.confirm,
            confirmFn: function () {
                $rootScope.$emit('loadNext');
                return true;
            },
            cancelBtn: $locale.BTN_TEXT.cancel,
            cancelFn: true
        };
        $rootScope.$on('$locationChangeStart', function (event, next, current) {
            if (unSave.stopUnload) {
                event.preventDefault();
                unSave.nextUrl = next;
                $rootScope.unSaveModal.modal(true);
            } else {
                unSave.nextUrl = '';
            }
        });
        $rootScope.$on('loadNext', function (event) {
            event.preventDefault();
            if (unSave.stopUnload && unSave.nextUrl) {
                unSave.stopUnload = false;
                window.location.href = unSave.nextUrl;
            }
        });

        $rootScope.goBack = function () {
            window.history.go(-1);
        };

        $rootScope.logout = function () {
            restAPI.user.get({
                ID: 'logout'
            }, function () {
                $rootScope.global.user = null;
                app.checkUser();
                $location.path('/');
            });
        };
        $rootScope.followMe = function (user) {
            restAPI.user.save({
                ID: user._id
            }, {
                follow: !user.isFollow
            }, function (data) {
                if (data.follow) {
                    $rootScope.global.user.followList.push(user._id);
                    app.toast.success($locale.USER.followed + user.name, $locale.RESPONSE.success);
                } else {
                    app.some($rootScope.global.user.followList, function (x, i, list) {
                        if (x === user._id) {
                            list.splice(i, 1);
                            app.toast.success($locale.USER.unfollowed + user.name, $locale.RESPONSE.success);
                            return true;
                        }
                    });
                }
                user.fans += user.isFollow ? -1 : 1;
                user.isFollow = !user.isFollow;
            });
        };
        restAPI.index.get({}, function (data) {
            var global = data.data;
            app.timeOffset = Date.now() - data.timestamp;
            global.title2 = global.description;
            global.info.angularjs = angular.version.full;
            app.union($rootScope.global, global);
            app.checkUser();
        });

        timing(function () { // 保证每300秒内与服务器存在连接，维持session
            if (Date.now() - app.timestamp - app.timeOffset >= 300000) {
                restAPI.index.get({
                    OP: 'time'
                }, function (data) {
                    app.timestamp = data.timestamp;
                });
            }
        }, 300000);
    }
]);