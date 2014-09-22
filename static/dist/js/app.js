'use strict';
/*global angular*/
var jsGen = angular.module('jsGen', [
    'ngLocale',
    'ngRoute',
    'ngAnimate',
    'ngResource',
    'ngCookies',
    'ui.validate',
    'angularFileUpload']);

jsGen.config(['$httpProvider', 'app',
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
                    var data = res.data || res,
                        status = res.status || '',
                        message = data.message || (angular.isObject(data) ? 'Error!' : data);

                    app.toast.error(message, status);
                    return app.q.reject(data);
                }
            };
        });
    }
])
.run(['app', '$q', '$rootScope', '$location', '$timeout', '$filter', 'getFile', 'JSONKit', 'toast', 'timing', 'cache', 'restAPI', 'sanitize',
    'mdParse', 'mdEditor', 'CryptoJS', 'promiseGet', 'myConf', 'anchorScroll', 'isVisible', 'applyFn', 'param', 'store', 'i18n-zh',
    function (app, $q, $rootScope, $location, $timeout, $filter, getFile, JSONKit, toast, timing, cache, restAPI, sanitize, mdParse,
        mdEditor, CryptoJS, promiseGet, myConf, anchorScroll, isVisible, applyFn, param, store, $locale) {
        var unSave = {
                stopUnload: false,
                nextUrl: ''
            },
            global = $rootScope.global = {
                isAdmin: false,
                isEditor: false,
                isLogin: false,
                info: {}
            },
            jqWin = $(window);

        function resize() {
            var viewWidth = global.viewWidth = jqWin.width();
            global.viewHeight = jqWin.height();
            global.isPocket = viewWidth < 480;
            global.isPhone = viewWidth < 768;
            global.isTablet = !global.isPhone && viewWidth < 980;
            global.isDesktop = viewWidth >= 980;
        }

        function init() {
            restAPI.index.get({}, function (data) {
                app.timeOffset = Date.now() - data.timestamp;
                data = data.data;
                data.title2 = data.description;
                data.info.angularjs = angular.version.full.replace(/\-build.*$/, '');
                app.union(global, data);
                app.version = global.info.version || '';
                app.upyun = global.user && global.user.upyun;
                app.checkUser();
            });
        }

        app.q = $q;
        app.store = store;
        app.toast = toast;
        app.param = param;
        app.timing = timing;
        app.location = $location;
        app.timeout = $timeout;
        app.timeOffset = 0;
        app.timestamp = Date.now();
        app.filter = $filter;
        app.locale = $locale;
        app.anchorScroll = anchorScroll;
        app.isVisible = isVisible;
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
        angular.extend(app, JSONKit); //添加 JSONKit 系列工具函数

        app.loading = function (value, status) {
            // $rootScope.loading = status;
            $rootScope.loading.show = value;
            applyFn();
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
                app.removeItem(data, undefined);
                unSave.stopUnload = !app.isEmpty(data);
            } else {
                unSave.stopUnload = false;
            }
            return unSave.stopUnload ? data : null;
        };
        app.checkUser = function () {
            global.isLogin = !! global.user;
            global.isAdmin = global.user && global.user.role === 5;
            global.isEditor = global.user && global.user.role >= 4;
        };
        app.clearUser = function () {
            global.user = null;
            app.checkUser();
        };
        app.checkFollow = function (user) {
            var me = global.user || {};
            user.isMe = user._id === me._id;
            user.isFollow = !user.isMe && !!app.findItem(me.followList, function (x) {
                return x === user._id;
            });
        };

        $rootScope.loading = {
            show: false
        };
        $rootScope.validateTooltip = {
            validate: true,
            validateMsg: $locale.VALIDATE
        };
        $rootScope.unSaveModal = {
            confirmBtn: $locale.BTN_TEXT.confirm,
            confirmFn: function () {
                if (unSave.stopUnload && unSave.nextUrl) {
                    unSave.stopUnload = false;
                    $timeout(function () {
                        window.location.href = unSave.nextUrl;
                    }, 100);
                }
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

        $rootScope.goBack = function () {
            window.history.go(-1);
        };
        $rootScope.logout = function () {
            restAPI.user.get({
                ID: 'logout'
            }, function () {
                global.user = null;
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
                    global.user.followList.push(user._id);
                    app.toast.success($locale.USER.followed + user.name, $locale.RESPONSE.success);
                } else {
                    app.findItem(global.user.followList, function (x, i, list) {
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

        jqWin.resize(applyFn.bind(null, resize));
        timing(function () { // 保证每360秒内与服务器存在连接，维持session
            if (Date.now() - app.timestamp - app.timeOffset >= 240000) {
                init();
            }
        }, 120000);
        resize();
        init();

    }
]);
'use strict';
/*global angular, jsGen*/

jsGen
.factory('i18n-zh', ['$locale',
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
                url: 'URL无效！',
                tag: '标签错误，不能包含“,”、“，”和“、”'
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
            HOME: {
                title: '我的主页',
                index: ' 更新，阅读时间线：',
                mark: '我的收藏',
                article: '我的文章',
                comment: '我的评论',
                follow: '我的关注',
                fans: '我的粉丝'
            },
            ADMIN: {
                index: '网站信息',
                user: '用户管理',
                tag: '标签管理',
                article: '文章管理',
                comment: '评论管理',
                message: '消息管理',
                global: '网站设置',
                updated: '成功更新 ',
                noUpdate: '设置暂无变更'
            },
            ARTICLE: {
                title: '添加/编辑文章',
                preview: '预览：',
                reply: '评论：',
                removed: '成功删除 ',
                updated: '成功更新 ',
                noUpdate: '文章暂无变更',
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
                title: '的主页',
                login: '用户登录',
                reset: '用户信息找回',
                register: '用户注册',
                article: '的文章',
                fans: '的粉丝',
                followed: '已关注 ',
                unfollowed: '已取消关注 ',
                email: '验证邮件已发送到新邮箱，通过验证后才保存修改',
                updated: '用户信息更新成功',
                noUpdate: '用户信息暂无变更',
                noLogin: '您还未登录'
            },
            TAG: {
                title: '热门标签',
                removed: '成功删除 ',
                updated: '成功更新 ',
                noUpdate: '标签暂无变更'
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
                second: '秒',
                minute: '分',
                hour: '时',
                day: '天',
                month: '月',
                year: '年',
                fullD: 'yyyy年MM月dd日 HH:mm',
                shortD: 'MM-dd HH:mm',
                dayAgo: '天前',
                hourAgo: '小时前',
                minuteAgo: '分钟前',
                secondAgo: '刚刚'
            },
            UPLOAD: {
                fileType: '文件类型无效，仅允许png、gif、jpg文件！'
            }
        });
        return $locale;
    }
]);
'use strict';
/*global angular, jsGen*/

jsGen
.constant('app', {
    version: Date.now()
})
.provider('getFile', ['app',
    function (app) {
        this.html = function (fileName) {
            return '/static/tpl/' + fileName + '?v=' + app.version;
        };
        this.md = function (fileName) {
            return '/static/md/' + fileName + '?v=' + app.version;
        };
        this.$get = function () {
            return {
                html: this.html,
                md: this.md
            };
        };
    }
])
.config(['$routeProvider', '$locationProvider', 'getFileProvider',

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
                templateUrl: getFileProvider.html('index.html'),
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
        when('/hots', index).
        when('/update', index).
        when('/latest', index).
        when('/T:ID', index).
        when('/tag/:TAG', index).
        when('/login', login).
        when('/register', register).
        when('/reset', reset).
        when('/home', home).
        when('/home/:OP', home).
        when('/admin', admin).
        when('/admin/:OP', admin).
        when('/tag', tag).
        when('/add', edit).
        when('/A:ID/edit', edit).
        when('/user/U:ID', user).
        when('/user/U:ID/:OP', user).
        when('/U:ID', user).
        when('/U:ID/:OP', user).
        when('/A:ID', article).
        when('/C:ID', collection).
        when('/', index).
        otherwise({
            redirectTo: '/'
        });
        $locationProvider.html5Mode(true).hashPrefix('!');
    }
]);
'use strict';
/*global angular, jsGen, marked, Sanitize, Markdown, prettyPrint, toastr, CryptoJS, utf8, store, JSONKit*/

jsGen
.factory('restAPI', ['$resource',
    function ($resource) {
        return {
            index: $resource('/api/index/:OP'),
            user: $resource('/api/user/:ID/:OP'),
            article: $resource('/api/article/:ID/:OP'),
            tag: $resource('/api/tag/:ID/:OP')
        };
    }
])
.factory('cache', ['$cacheFactory',
    function ($cacheFactory) {
        return {
            user: $cacheFactory('user', {
                capacity: 20
            }),
            article: $cacheFactory('article', {
                capacity: 100
            }),
            comment: $cacheFactory('comment', {
                capacity: 500
            }),
            list: $cacheFactory('list', {
                capacity: 100
            })
        };
    }
])
.factory('myConf', ['$cookieStore', 'JSONKit',
    function ($cookieStore, JSONKit) {
        function checkValue(value, defaultValue) {
            return value == null ? defaultValue : value;
        }

        function myCookies(name, initial) {
            return function (value, pre, defaultValue) {
                pre = JSONKit.toStr(pre) + name;
                defaultValue = checkValue(defaultValue, initial);
                var result = checkValue($cookieStore.get(pre), defaultValue);
                if ((value != null) && result !== checkValue(value, defaultValue)) {
                    $cookieStore.put(pre, value);
                    result = value;
                }
                return result;
            };
        }
        return {
            pageSize: myCookies('PageSize', 10),
            sumModel: myCookies('sumModel', false)
        };
    }
])
.factory('anchorScroll', function () {
    function toView(element, top, height) {
        var winHeight = $(window).height();

        element = $(element);
        height = height > 0 ? height : winHeight / 10;
        $('html, body').animate({
            scrollTop: top ? (element.offset().top - height) : (element.offset().top + element.outerHeight() + height - winHeight)
        }, {
            duration: 200,
            easing: 'linear',
            complete: function () {
                if (!inView(element)) {
                    element[0].scrollIntoView( !! top);
                }
            }
        });
    }

    function inView(element) {
        element = $(element);

        var win = $(window),
            winHeight = win.height(),
            eleTop = element.offset().top,
            eleHeight = element.outerHeight(),
            viewTop = win.scrollTop(),
            viewBottom = viewTop + winHeight;

        function isInView(middle) {
            return middle > viewTop && middle < viewBottom;
        }

        if (isInView(eleTop + (eleHeight > winHeight ? winHeight : eleHeight) / 2)) {
            return true;
        } else if (eleHeight > winHeight) {
            return isInView(eleTop + eleHeight - winHeight / 2);
        } else {
            return false;
        }
    }

    return {
        toView: toView,
        inView: inView
    };
})
.factory('isVisible', function () {
    return function (element) {
        var rect = element[0].getBoundingClientRect();
        return Boolean(rect.bottom - rect.top);
    };
})
.factory('applyFn', ['$rootScope',
    function ($rootScope) {
        return function (fn, scope) {
            fn = angular.isFunction(fn) ? fn : angular.noop;
            scope = scope && scope.$apply ? scope : $rootScope;
            fn();
            if (!scope.$$phase) {
                scope.$apply();
            }
        };
    }
])
.factory('timing', ['$rootScope', '$q', '$exceptionHandler',
    function ($rootScope, $q, $exceptionHandler) {
        function timing(fn, delay, times) {
            var timingId, count = 0,
                defer = $q.defer(),
                promise = defer.promise;

            fn = angular.isFunction(fn) ? fn : angular.noop;
            delay = parseInt(delay, 10);
            times = parseInt(times, 10);
            times = times >= 0 ? times : 0;
            timingId = window.setInterval(function () {
                count += 1;
                if (times && count >= times) {
                    window.clearInterval(timingId);
                    defer.resolve(fn(count, times, delay));
                } else {
                    try {
                        fn(count, times, delay);
                    } catch (e) {
                        defer.reject(e);
                        $exceptionHandler(e);
                    }
                }
                if (!$rootScope.$$phase) {
                    $rootScope.$apply();
                }
            }, delay);

            promise.$timingId = timingId;
            return promise;
        }
        timing.cancel = function (promise) {
            if (promise && promise.$timingId) {
                clearInterval(promise.$timingId);
                return true;
            } else {
                return false;
            }
        };
        return timing;
    }
])
.factory('promiseGet', ['$q',
    function ($q) {
        return function (param, restAPI, cacheId, cache) {
            var result, defer = $q.defer();

            result = cacheId && cache && cache.get(cacheId);
            if (result) {
                defer.resolve(result);
            } else {
                restAPI.get(param, function (data) {
                    if (cacheId && cache) {
                        cache.put(cacheId, data);
                    }
                    defer.resolve(data);
                }, function (data) {
                    defer.reject(data.error);
                });
            }
            return defer.promise;
        };
    }
])
.factory('getList', ['restAPI', 'cache', 'promiseGet',
    function (restAPI, cache, promiseGet) {
        return function (listType) {
            return promiseGet({
                ID: listType,
                s: 10
            }, restAPI.article, listType, cache.list);
        };
    }
])
.factory('getArticle', ['restAPI', 'cache', 'promiseGet',
    function (restAPI, cache, promiseGet) {
        return function (ID) {
            return promiseGet({
                ID: ID
            }, restAPI.article, ID, cache.article);
        };
    }
])
.factory('getUser', ['restAPI', 'cache', 'promiseGet',
    function (restAPI, cache, promiseGet) {
        return function (ID) {
            return promiseGet({
                ID: ID
            }, restAPI.user, ID, cache.user);
        };
    }
])
.factory('getMarkdown', ['$http',
    function ($http) {
        return $http.get('/static/md/markdown.md', {
            cache: true
        });
    }
])
.factory('toast', ['$log', 'JSONKit',
    function ($log, JSONKit) {
        var toast = {},
            methods = ['info', 'error', 'success', 'warning'];

        angular.forEach(methods, function (x) {
            toast[x] = function (message, title) {
                var log = $log[x] || $log.log;
                title = JSONKit.toStr(title);
                log(message, title);
                message = angular.isObject(message) ? angular.toJson(message) : JSONKit.toStr(message);
                toastr[x](message, title);
            };
        });
        toastr.options = angular.extend({
            positionClass: 'toast-bottom-full-width'
        }, toast.options);
        toast.clear = toastr.clear;
        return toast;
    }
])
.factory('pretty', function () {
    return window.prettyPrint;
})
.factory('param', function () {
    return $.param;
})
.factory('CryptoJS', function () {
    return window.CryptoJS;
})
.factory('utf8', function () {
    return window.utf8;
})
.factory('store', function () {
    return window.store;
})
.factory('JSONKit', function () {
    return window.JSONKit;
})
.factory('mdParse', ['JSONKit',
    function (JSONKit) {
        return function (html) {
            return window.marked(JSONKit.toStr(html));
        };
    }
])
.factory('sanitize', ['JSONKit',
    function (JSONKit) {
        var San = Sanitize,
            config = San.Config,
            sanitize = [
                new San({}),
                new San(config.RESTRICTED),
                new San(config.BASIC),
                new San(config.RELAXED)
            ];
        // level: 0, 1, 2, 3
        return function (html, level) {
            var innerDOM = document.createElement('div'),
                outerDOM = document.createElement('div');
            level = level >= 0 ? level : 3;
            innerDOM.innerHTML = JSONKit.toStr(html);
            outerDOM.appendChild(sanitize[level].clean_node(innerDOM));
            return outerDOM.innerHTML;
        };
    }
])
.factory('mdEditor', ['mdParse', 'sanitize', 'pretty', 'JSONKit',
    function (mdParse, sanitize, pretty, JSONKit) {
        return function (idPostfix, level) {
            idPostfix = JSONKit.toStr(idPostfix);
            var editor = new Markdown.Editor({
                makeHtml: function (text) {
                    return sanitize(mdParse(text), level);
                }
            }, idPostfix);
            var element = angular.element(document.getElementById('wmd-preview' + idPostfix));
            editor.hooks.chain('onPreviewRefresh', function () {
                angular.forEach(element.find('code'), function (value) {
                    value = angular.element(value);
                    if (!value.parent().is('pre')) {
                        value.addClass('prettyline');
                    }
                });
                element.find('pre').addClass('prettyprint'); // linenums have bug!
                pretty();
            });
            return editor;
        };
    }
]);
'use strict';
/*global angular, jsGen*/

jsGen
.filter('placeholder', ['JSONKit',
    function (JSONKit) {
        return function (str) {
            return JSONKit.toStr(str) || '-';
        };
    }
])
.filter('match', ['$locale',
    function ($locale) {
        return function (value, type) {
            return $locale.FILTER[type] && $locale.FILTER[type][value] || '';
        };
    }
])
.filter('switch', ['$locale',
    function ($locale) {
        return function (value, type) {
            return $locale.FILTER[type] && $locale.FILTER[type][+ !! value] || '';
        };
    }
])
.filter('checkName', ['JSONKit',
    function (JSONKit) {
        return function (text) {
            var reg = /^[(\u4e00-\u9fa5)a-z][(\u4e00-\u9fa5)a-zA-Z0-9_]{1,}$/;
            text = JSONKit.toStr(text);
            return reg.test(text);
        };
    }
])
.filter('length', ['utf8', 'JSONKit',
    function (utf8, JSONKit) {
        return function (text) {
            text = JSONKit.toStr(text);
            return utf8.stringToBytes(text).length;
        };
    }
])
.filter('cutText', ['utf8', 'JSONKit',
    function (utf8, JSONKit) {
        return function (text, len) {
            text = JSONKit.toStr(text).trim();
            var bytes = utf8.stringToBytes(text);
            len = len > 0 ? len : 0;
            if (bytes.length > len) {
                bytes.length = len;
                text = utf8.bytesToString(bytes);
                text = text.slice(0, -2) + '…';
            }
            return text;
        };
    }
])
.filter('formatDate', ['$filter', '$locale',
    function ($filter, $locale) {
        return function (date, full) {
            var o = Date.now() - date,
                dateFilter = $filter('date');
            if (full) {
                return dateFilter(date, $locale.DATETIME.fullD);
            } else if (o > 259200000) {
                return dateFilter(date, $locale.DATETIME.shortD);
            } else if (o > 86400000) {
                return Math.floor(o / 86400000) + $locale.DATETIME.dayAgo;
            } else if (o > 3600000) {
                return Math.floor(o / 3600000) + $locale.DATETIME.hourAgo;
            } else if (o > 60000) {
                return Math.floor(o / 60000) + $locale.DATETIME.minuteAgo;
            } else {
                return $locale.DATETIME.secondAgo;
            }
        };
    }
])
.filter('formatTime', ['$locale',
    function ($locale) {
        return function (seconds) {
            var re = '',
                q = 0,
                o = seconds > 0 ? Math.round(+seconds) : Math.floor(Date.now() / 1000),
                TIME = $locale.DATETIME;

            function calculate(base) {
                q = o % base;
                o = (o - q) / base;
                return o;
            }
            calculate(60);
            re = q + TIME.second;
            calculate(60);
            re = (q > 0 ? (q + TIME.minute) : '') + re;
            calculate(24);
            re = (q > 0 ? (q + TIME.hour) : '') + re;
            return o > 0 ? (o + TIME.day + re) : re;
        };
    }
])
.filter('formatBytes', ['$locale',
    function ($locale) {
        return function (bytes) {
            bytes = bytes > 0 ? bytes : 0;
            if (!bytes) {
                return '-';
            } else if (bytes < 1024) {
                return bytes + 'B';
            } else if (bytes < 1048576) {
                return (bytes / 1024).toFixed(3) + ' KiB';
            } else if (bytes < 1073741824) {
                return (bytes / 1048576).toFixed(3) + ' MiB';
            } else {
                return (bytes / 1073741824).toFixed(3) + ' GiB';
            }
        };
    }
]);
'use strict';
/*global angular, $, jsGen*/

jsGen
.directive('genParseMd', ['mdParse', 'sanitize', 'pretty', 'isVisible', '$timeout',
    function (mdParse, sanitize, pretty, isVisible, $timeout) {
        // <div gen-parse-md="document"></div>
        // document是Markdown格式或一般文档字符串，解析成DOM后插入<div>
        return function (scope, element, attr) {
            scope.$watch(attr.genParseMd, function (value) {
                if (isVisible(element)) {
                    parseDoc(value);
                } else {
                    $timeout(function () {
                        parseDoc(value);
                    }, 500);
                }
            });

            function parseDoc(value) {
                if (angular.isDefined(value)) {
                    value = mdParse(value);
                    value = sanitize(value);
                    element.html(value);
                    angular.forEach(element.find('code'), function (value) {
                        value = angular.element(value);
                        if (!value.parent().is('pre')) {
                            value.addClass('prettyline');
                        }
                    });
                    element.find('pre').addClass('prettyprint'); // linenums have bug!
                    element.find('a').attr('target', function () {
                        if (this.host !== location.host) {
                            return '_blank';
                        }
                    });
                    pretty();
                }
            }
        };
    }
])
.directive('genTabClick', function () {
    //<ul>
    //<li gen-tab-click="className"></li>
    //<li gen-tab-click="className"></li>
    //</ul>
    // 点击li元素时，该元素将赋予className类，并移除其它兄弟元素的className类
    return {
        link: function (scope, element, attr) {
            var className = attr.genTabClick;
            element.bind('click', function () {
                element.parent().children().removeClass(className);
                element.addClass(className);
            });
        }
    };
})
.directive('genPagination', ['getFile',
    function (getFile) {
        // <div gen-pagination="options"></div>
        // HTML/CSS修改于Bootstrap框架
        // options = {
        //     path: 'pathUrl',
        //     sizePerPage: [25, 50, 100],
        //     pageSize: 25,
        //     pageIndex: 1,
        //     total: 10
        // };
        return {
            scope: true,
            templateUrl: getFile.html('gen-pagination.html'),
            link: function (scope, element, attr) {
                scope.$watchCollection(attr.genPagination, function (value) {
                    if (!angular.isObject(value)) {
                        return;
                    }
                    var pageIndex = 1,
                        showPages = [],
                        lastPage = Math.ceil(value.total / value.pageSize) || 1;

                    pageIndex = value.pageIndex >= 1 ? value.pageIndex : 1;
                    pageIndex = pageIndex <= lastPage ? pageIndex : lastPage;

                    showPages[0] = pageIndex;
                    if (pageIndex <= 6) {
                        while (showPages[0] > 1) {
                            showPages.unshift(showPages[0] - 1);
                        }
                    } else {
                        showPages.unshift(showPages[0] - 1);
                        showPages.unshift(showPages[0] - 1);
                        showPages.unshift('…');
                        showPages.unshift(2);
                        showPages.unshift(1);
                    }

                    if (lastPage - pageIndex <= 5) {
                        while (showPages[showPages.length - 1] < lastPage) {
                            showPages.push(showPages[showPages.length - 1] + 1);
                        }
                    } else {
                        showPages.push(showPages[showPages.length - 1] + 1);
                        showPages.push(showPages[showPages.length - 1] + 1);
                        showPages.push('…');
                        showPages.push(lastPage - 1);
                        showPages.push(lastPage);
                    }

                    scope.prev = pageIndex > 1 ? pageIndex - 1 : 0;
                    scope.next = pageIndex < lastPage ? pageIndex + 1 : 0;
                    scope.total = value.total;
                    scope.pageIndex = pageIndex;
                    scope.showPages = showPages;
                    scope.pageSize = value.pageSize;
                    scope.perPages = value.sizePerPage || [10, 20, 50];
                    scope.path = value.path && value.path + '?p=';
                });
                scope.paginationTo = function (p, s) {
                    if (!scope.path && p > 0) {
                        s = s || scope.pageSize;
                        scope.$emit('genPagination', p, s);
                    }
                };
            }
        };
    }
])
.directive('genModal', ['getFile', '$timeout',
    function (getFile, $timeout) {
        //<div gen-modal="msgModal">[body]</div>
        // scope.msgModal = {
        //     id: 'msg-modal',    [option]
        //     title: 'message title',    [option]
        //     width: 640,    [option]
        //     confirmBtn: 'confirm button name',    [option]
        //     confirmFn: function () {},    [option]
        //     cancelBtn: 'cancel button name',    [option]
        //     cancelFn: function () {}    [option]
        //     deleteBtn: 'delete button name',    [option]
        //     deleteFn: function () {}    [option]
        // };
        var uniqueModalId = 0;
        return {
            scope: true,
            transclude: true,
            templateUrl: getFile.html('gen-modal.html'),
            link: function (scope, element, attr) {
                var modalStatus,
                    modalElement = element.children(),
                    list = ['Confirm', 'Cancel', 'Delete'],
                    options = scope.$eval(attr.genModal),
                    isFunction = angular.isFunction;

                function wrap(fn) {
                    return function () {
                        var value = isFunction(fn) ? fn() : true;
                        showModal(!value);
                    };
                }

                function resize() {
                    var jqWin = $(window),
                        element = modalElement.children(),
                        top = (jqWin.height() - element.outerHeight()) * 0.382,
                        css = {};

                    css.marginTop = top > 0 ? top : 0;
                    element.css(css);
                }

                function showModal(value) {
                    modalElement.modal(value ? 'show' : 'hide');
                    if (value) {
                        $timeout(resize);
                    }
                }

                options.cancelFn = options.cancelFn || true;
                options.backdrop = options.backdrop || true;
                options.show = options.show || false;
                options.modal = showModal;

                scope.$watch(function () {
                    return options;
                }, function (value) {
                    angular.extend(scope, value);
                }, true);

                scope.id = scope.id || attr.genModal + '-' + (uniqueModalId++);
                angular.forEach(list, function (name) {
                    var x = name.toLowerCase(),
                        cb = x + 'Cb',
                        fn = x + 'Fn',
                        btn = x + 'Btn';
                    scope[cb] = options[fn] && wrap(options[fn]);
                    scope[btn] = options[btn] || (options[fn] && name);
                });

                modalElement.on('shown.bs.modal', function (event) {
                    modalStatus = true;
                });
                modalElement.on('hidden.bs.modal', function (event) {
                    if (modalStatus && isFunction(options.cancelFn)) {
                        options.cancelFn(); // when hide by other way, run cancelFn;
                    }
                    modalStatus = false;
                });
                modalElement.modal(options);
            }
        };
    }
])
.directive('genTooltip', ['$timeout', 'isVisible',
    function ($timeout, isVisible) {
        //<div data-original-title="tootip title" gen-tooltip="tootipOption"></div>
        // tootipOption = {
        //     validate: false, // if true, use for AngularJS validation
        //     validateMsg : {
        //         required: 'Required!',
        //         minlength: 'Too short!'
        //     }
        //     ...other bootstrap tooltip options
        // }
        return {
            require: '?ngModel',
            link: function (scope, element, attr, ctrl) {
                var enable = false,
                    option = scope.$eval(attr.genTooltip) || {};

                function invalidMsg(invalid) {
                    ctrl.validate = enable && option.validate && isVisible(element);
                    if (ctrl.validate) {
                        var title = (ctrl.$name && ctrl.$name + ' ') || '';
                        if (invalid && option.validateMsg) {
                            angular.forEach(ctrl.$error, function (value, key) {
                                title += (value && option.validateMsg[key] && option.validateMsg[key] + ', ') || '';
                            });
                        }
                        title = title.slice(0, -2) || attr.originalTitle || attr.title;
                        attr.$set('dataOriginalTitle', title ? title : '');
                        showTooltip( !! invalid);
                    } else {
                        showTooltip(false);
                    }
                }

                function validateFn(value) {
                    $timeout(function () {
                        invalidMsg(ctrl.$invalid);
                    });
                    return value;
                }

                function initTooltip() {
                    element.off('.tooltip').removeData('bs.tooltip');
                    element.tooltip(option);
                }

                function showTooltip(show) {
                    if (element.hasClass('invalid-error') !== show) {
                        element[show ? 'addClass' : 'removeClass']('invalid-error');
                        element.tooltip(show ? 'show' : 'hide');
                    }
                }

                if (option.container === 'inner') {
                    option.container = element;
                } else if (option.container === 'ngView') {
                    option.container = element.parents('.ng-view')[0] || element.parents('[ng-view]')[0];
                }
                // use for AngularJS validation
                if (option.validate) {
                    option.template = '<div class="tooltip validate-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>';
                    option.trigger = 'manual';
                    option.placement = option.placement || 'right';
                    if (ctrl) {
                        ctrl.$formatters.push(validateFn);
                        ctrl.$parsers.push(validateFn);
                    } else {
                        scope.$watch(function () {
                            return attr.originalTitle || attr.dataOriginalTitle;
                        }, showTooltip);
                    }
                    element.bind('focus', function () {
                        element.trigger('input');
                        element.trigger('change');
                    });
                    scope.$on('genTooltipValidate', function (event, collect, turnoff) {
                        enable = !turnoff;
                        if (ctrl) {
                            if (angular.isArray(collect)) {
                                collect.push(ctrl);
                            }
                            invalidMsg(ctrl.$invalid);
                        }
                    });
                } else if (option.click) {
                    // option.click will be 'show','hide','toggle', or 'destroy'
                    element.bind('click', function () {
                        element.tooltip(option.click);
                    });
                }
                element.bind('hidden.bs.tooltip', initTooltip);
                initTooltip();
            }
        };
    }
])
.directive('genMoving', ['anchorScroll',
    function (anchorScroll) {
        return {
            link: function (scope, element, attr) {
                var option = scope.$eval(attr.genMoving);

                function resetTextarea() {
                    var textarea = element.find('textarea');
                    if (textarea.is(textarea)) {
                        textarea.css({
                            height: 'auto',
                            width: '100%'
                        });
                    }
                }

                option.appendTo = function (selector) {
                    element.appendTo($(selector));
                    resetTextarea();
                };
                option.prependTo = function (selector) {
                    element.prependTo($(selector));
                    resetTextarea();
                };
                option.childrenOf = function (selector) {
                    return $(selector).find(element).is(element);
                };
                option.scrollIntoView = function (top, height) {
                    anchorScroll.toView(element, top, height);
                };
                option.inView = function () {
                    return anchorScroll.inView(element);
                };
            }
        };
    }
])
.directive('genSrc', ['isVisible',
    function (isVisible) {
        return {
            priority: 99,
            link: function (scope, element, attr) {
                attr.$observe('genSrc', function (value) {
                    if (value && isVisible(element)) {
                        var img = new Image();
                        img.onload = function () {
                            attr.$set('src', value);
                        };
                        img.src = value;
                    }
                });
            }
        };
    }
])
.directive('genUploader', ['getFile', '$fileUploader', 'app',
    function (getFile, $fileUploader, app) {
        // <div gen-pagination="options"></div>
        // HTML/CSS修改于Bootstrap框架
        // options = {
        //     path: 'pathUrl',
        //     sizePerPage: [25, 50, 100],
        //     pageSize: 25,
        //     pageIndex: 1,
        //     total: 10
        // };
        return {
            scope: true,
            templateUrl: getFile.html('gen-uploader.html'),
            link: function (scope, element, attr) {
                var options = scope.$eval(attr.genUploader);
                var fileType = options.fileType;
                scope.triggerUpload = function () {
                    setTimeout(function () {
                        element.find('.upload-input').click();
                    });
                };
                scope.clickImage = options.clickImage || angular.noop;
                var uploaded = scope.uploaded = [];

                // create a uploader with options
                var uploader = scope.uploader = $fileUploader.create({
                    scope: options.scope || scope,
                    url: options.url,
                    formData: [{
                        policy: options.policy,
                        signature: options.signature
                    }],
                    filters: [
                        function (file) {
                            var judge = true,
                                parts = file.name.split('.');
                            parts = parts.length > 1 ? parts.slice(-1)[0] : '';
                            if (!parts || options.allowFileType.indexOf(parts.toLowerCase()) < 0) {
                                judge = false;
                                app.toast.warning(app.locale.UPLOAD.fileType);
                            }
                            return judge;
                        }
                    ]
                });

                uploader.bind('complete', function (event, xhr, item) {
                    var response = app.parseJSON(xhr.response) || {};
                    if (~[200, 201].indexOf(xhr.status)) {
                        var file = app.union(item.file, response);
                        file.url = options.baseUrl + file.url;
                        uploaded.push(file);
                        item.remove();
                    } else {
                        item.progress = 0;
                        app.toast.warning(response.message, response.code);
                    }
                });
            }
        };
    }
]);
'use strict';
/*global angular, jsGen*/

jsGen
.controller('indexCtrl', ['app', '$scope', '$routeParams', 'getList',
    function (app, $scope, $routeParams, getList) {
        var ID = '',
            restAPI = app.restAPI.article,
            myConf = app.myConf,
            global = app.rootScope.global;

        function checkRouteParams() {
            var path = app.location.path().slice(1).split('/');
            if ($routeParams.TAG || (/^T[0-9A-Za-z]{3,}$/).test(path[0])) {
                restAPI = app.restAPI.tag;
                $scope.other._id = path[0];
                $scope.other.title = $routeParams.TAG || path[0];
                $scope.parent.viewPath = '';
            } else {
                restAPI = app.restAPI.article;
                $scope.parent.viewPath = path[0] || 'latest';
            }
            ID = $routeParams.TAG || path[0] || 'latest';
        }

        function getArticleList() {
            var params = {
                ID: ID,
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'index', 20)
            };

            app.promiseGet(params, restAPI, app.param(params), app.cache.list).then(function (data) {
                var pagination = data.pagination || {};
                if (data.tag) {
                    $scope.other.title = data.tag.tag;
                    $scope.other._id = data.tag._id;
                }
                pagination.path = app.location.path();
                pagination.pageSize = myConf.pageSize(pagination.pageSize, 'index');
                $scope.pagination = pagination;
                $scope.articleList = data.data;
            });
        }

        global.title2 = global.description;
        $scope.parent = {
            getTpl: app.getFile.html('index-article.html'),
            viewPath: 'latest',
            sumModel: myConf.sumModel(null, 'index', false)
        };
        $scope.other = {};
        $scope.pagination = {};

        $scope.setListModel = function () {
            var parent = $scope.parent;
            parent.sumModel = myConf.sumModel(!parent.sumModel, 'index');
            myConf.pageSize(parent.sumModel ? 20 : 10, 'index');
            app.location.search({});
        };

        checkRouteParams();
        getArticleList();
        getList('comment').then(function (data) {
            data = app.union(data.data);
            app.each(data, function (x, i) {
                x.content = app.filter('cutText')(x.content, 180);
            });
            $scope.hotComments = data.slice(0, 6);
        });
    }
])
.controller('tagCtrl', ['app', '$scope', '$routeParams', 'getList',
    function (app, $scope, $routeParams, getList) {
        var restAPI = app.restAPI.tag,
            myConf = app.myConf,
            params = {
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'tag', 50)
            };

        app.rootScope.global.title2 = app.locale.TAG.title;
        $scope.parent = {
            getTpl: app.getFile.html('index-tag.html')
        };
        $scope.pagination = {};

        app.promiseGet(params, restAPI, app.param(params), app.cache.list).then(function (data) {
            var pagination = data.pagination || {};
            pagination.path = app.location.path();
            pagination.pageSize = myConf.pageSize(pagination.pageSize, 'tag');
            pagination.sizePerPage = [50, 100, 200];
            $scope.pagination = pagination;
            $scope.tagList = data.data;
        });

        getList('comment').then(function (data) {
            data = app.union(data.data);
            app.each(data, function (x, i) {
                x.content = app.filter('cutText')(x.content, 180);
            });
            $scope.hotComments = data.slice(0, 6);
        });
    }
])
.controller('userLoginCtrl', ['app', '$scope',
    function (app, $scope) {
        app.clearUser();
        app.rootScope.global.title2 = app.locale.USER.login;
        $scope.login = {
            logauto: true,
            logname: '',
            logpwd: ''
        };
        $scope.reset = {
            title: '',
            type: ''
        };

        $scope.submit = function () {
            if (app.validate($scope)) {
                var data = app.union($scope.login);
                data.logtime = Date.now() - app.timeOffset;
                data.logpwd = app.CryptoJS.SHA256(data.logpwd).toString();
                data.logpwd = app.CryptoJS.HmacSHA256(data.logpwd, 'jsGen').toString();
                data.logpwd = app.CryptoJS.HmacSHA256(data.logpwd, data.logname + ':' + data.logtime).toString();

                app.restAPI.user.save({
                    ID: 'login'
                }, data, function (data) {
                    app.rootScope.global.user = data.data;
                    app.checkUser();
                    $scope.$destroy();
                    app.location.path('/home');
                }, function (data) {
                    $scope.reset.type = data.error.name;
                    $scope.reset.title = app.locale.RESET[data.error.name];
                });
            }
        };
    }
])
.controller('userResetCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var timing,
            locale = app.locale;

        function showModal() {
            $scope.timingModal.modal(true);
            timing = app.timing(function (count, times) {
                $scope.parent.timing = times - count;
            }, 1000, $scope.parent.timing);
            timing.then(function () {
                $scope.timingModal.modal(false);
                app.location.search({}).path('/');
            });
        }

        app.rootScope.global.title2 = locale.USER.reset;
        $scope.reset = {
            name: '',
            email: '',
            request: $routeParams.type
        };
        $scope.parent = {
            title: locale.RESET[$routeParams.type],
            timing: 5
        };
        $scope.timingModal = {
            confirmBtn: locale.BTN_TEXT.goBack,
            confirmFn: function () {
                app.timing.cancel(timing);
                app.timing(null, 100, 1).then(function () {
                    app.location.search({}).path('/');
                });
                return true;
            },
            cancelBtn: locale.BTN_TEXT.cancel,
            cancelFn: function () {
                return app.timing.cancel(timing);
            }
        };
        $scope.submit = function () {
            if (app.validate($scope)) {
                app.restAPI.user.save({
                    ID: 'reset'
                }, $scope.reset, function (data) {
                    app.toast.success(locale.RESET.email, locale.RESPONSE.success);
                    showModal();
                });
            }
        };
        if (['locked', 'passwd'].indexOf($routeParams.type) < 0) {
            app.restAPI.user.get({
                ID: 'reset',
                OP: $routeParams.req
            }, function () {
                app.toast.success(3 + locale.TIMING.goHome, locale.RESPONSE.success);
                app.timing(null, 1000, 3).then(function () {
                    app.location.search({}).path('/home');
                });
            }, showModal);
        }
    }
])
.controller('userRegisterCtrl', ['app', '$scope',
    function (app, $scope) {
        var filter = app.filter,
            lengthFn = filter('length'),
            global = app.rootScope.global;

        app.clearUser();
        global.title2 = app.locale.USER.register;
        $scope.user = {
            name: '',
            email: '',
            passwd: '',
            passwd2: ''
        };

        $scope.checkName = function (scope, model) {
            return filter('checkName')(model.$value);
        };
        $scope.checkMin = function (scope, model) {
            return lengthFn(model.$value) >= 5;
        };
        $scope.checkMax = function (scope, model) {
            return lengthFn(model.$value) <= 15;
        };
        $scope.submit = function () {
            var user = $scope.user;
            if (app.validate($scope)) {
                var data = {
                    name: user.name,
                    email: user.email
                };
                data.passwd = app.CryptoJS.SHA256(user.passwd).toString();
                data.passwd = app.CryptoJS.HmacSHA256(data.passwd, 'jsGen').toString();

                app.restAPI.user.save({
                    ID: 'register'
                }, data, function (data) {
                    app.rootScope.global.user = data.data;
                    app.checkUser();
                    $scope.$destroy();
                    app.location.path('/home');
                });
            }
        };
    }
])
.controller('homeCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var global = app.rootScope.global;

        if (!global.isLogin) {
            return app.location.search({}).path('/');
        }

        function tplName(path) {
            switch (path) {
            case 'follow':
            case 'fans':
                return 'user-list.html';
            case 'detail':
                return 'user-edit.html';
            case 'article':
            case 'comment':
            case 'mark':
                return 'user-article.html';
            default:
                return 'user-article.html';
            }
        }

        global.title2 = app.locale.HOME.title;
        $scope.user = global.user;
        $scope.parent = {
            getTpl: app.getFile.html(tplName($routeParams.OP)),
            isMe: true,
            viewPath: $routeParams.OP || 'index'
        };
    }
])
.controller('userCtrl', ['app', '$scope', '$routeParams', 'getUser',
    function (app, $scope, $routeParams, getUser) {

        function tplName() {
            switch ($routeParams.OP) {
            case 'fans':
                return 'user-list.html';
            case 'article':
                return 'user-article.html';
            default:
                return 'user-article.html';
            }
        }

        app.rootScope.global.title2 = app.locale.USER.title;
        $scope.parent = {
            getTpl: app.getFile.html(tplName()),
            isMe: false,
            viewPath: $routeParams.OP || 'index'
        };

        getUser('U' + $routeParams.ID).then(function (data) {
            $scope.user = data.data;
            app.rootScope.global.title2 = $scope.user.name + app.locale.USER.title;
        });
    }
])
.controller('userListCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var restAPI = app.restAPI.user,
            myConf = app.myConf,
            locale = app.locale,
            params = {
                ID: $routeParams.ID && 'U' + $routeParams.ID || $routeParams.OP,
                OP: $routeParams.OP || 'fans',
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'user', 20)
            };

        $scope.parent = {
            title: ''
        };

        app.promiseGet(params, restAPI, app.param(params), app.cache.list).then(function (data) {
            var pagination = data.pagination || {};

            pagination.path = app.location.path();
            pagination.pageSize = myConf.pageSize(pagination.pageSize, 'user');
            $scope.pagination = pagination;
            app.each(data.data, function (x) {
                app.checkFollow(x);
            });
            if (!$routeParams.ID) {
                $scope.parent.title = locale.HOME[params.OP];
            } else {
                $scope.parent.title = data.user.name + locale.USER[params.OP];
            }
            $scope.userList = data.data;
        });
    }
])
.controller('userArticleCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var restAPI = app.restAPI.user,
            myConf = app.myConf,
            locale = app.locale,
            global = app.rootScope.global;

        function getArticleList() {
            var params = {
                ID: $routeParams.ID && 'U' + $routeParams.ID || $routeParams.OP,
                OP: $routeParams.OP || ($routeParams.ID ? 'article' : 'index'),
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'home', 20)
            };
            app.promiseGet(params, restAPI, app.param(params), app.cache.list).then(function (data) {
                var newArticles = 0,
                    pagination = data.pagination || {};

                pagination.path = app.location.path();
                pagination.pageSize = myConf.pageSize(pagination.pageSize, 'home');
                $scope.pagination = pagination;
                if (!$routeParams.ID) {
                    var user = global.user || {};
                    app.each(data.data, function (x) {
                        if (data.readtimestamp > 0) {
                            x.read = x.updateTime < data.readtimestamp;
                            newArticles += !x.read;
                        }
                        x.isAuthor = x.author._id === user._id;
                    });
                    $scope.parent.title = params.OP !== 'index' ? locale.HOME[params.OP] : newArticles + locale.HOME.index + app.filter('date')(data.readtimestamp, 'medium');
                } else {
                    $scope.parent.title = data.user.name + locale.USER[params.OP];
                }
                $scope.articleList = data.data;
            });
        }

        $scope.parent = {
            sumModel: myConf.sumModel(null, 'index', false),
            title: ''
        };
        $scope.pagination = {};
        $scope.removeArticle = null;

        $scope.removeArticleModal = {
            confirmBtn: locale.BTN_TEXT.confirm,
            confirmFn: function () {
                var article = $scope.removeArticle;
                app.restAPI.article.remove({
                    ID: article._id
                }, function () {
                    app.findItem($scope.articleList, function (x, i, list) {
                        if (x._id === article._id) {
                            list.splice(i, 1);
                            app.toast.success(locale.ARTICLE.removed + article.title, locale.RESPONSE.success);
                            return true;
                        }
                    });
                    $scope.removeArticle = null;
                });
                return true;
            },
            cancelBtn: locale.BTN_TEXT.cancel,
            cancelFn: function () {
                $scope.removeArticle = null;
                return true;
            }
        };
        $scope.setListModel = function () {
            var parent = $scope.parent;
            parent.sumModel = myConf.sumModel(!parent.sumModel, 'home');
            myConf.pageSize(parent.sumModel ? 20 : 10, 'home');
            app.location.search({});
        };
        $scope.remove = function (article) {
            if (article.isAuthor || global.isEditor) {
                $scope.removeArticle = article;
                $scope.removeArticleModal.modal(true);
            }
        };

        getArticleList();
    }
])
.controller('userEditCtrl', ['app', '$scope',
    function (app, $scope) {
        var originData = {},
            tagsArray = [],
            locale = app.locale,
            filter = app.filter,
            global = app.rootScope.global,
            lengthFn = filter('length'),
            user = {
                avatar: '',
                name: '',
                sex: '',
                email: '',
                desc: '',
                passwd: '',
                tagsList: ['']
            };

        function initUser() {
            originData = app.union(global.user);
            app.each(originData.tagsList, function (x, i, list) {
                list[i] = x.tag;
            });
            originData = app.intersect(app.union(user), originData);
            $scope.user = app.union(originData);
            app.checkDirty(user, originData, $scope.user);
        }

        $scope.sexArray = ['male', 'female'];

        $scope.checkName = function (scope, model) {
            return filter('checkName')(model.$value);
        };
        $scope.checkMin = function (scope, model) {
            return lengthFn(model.$value) >= 5;
        };
        $scope.checkMax = function (scope, model) {
            return lengthFn(model.$value) <= 15;
        };
        $scope.checkDesc = function (scope, model) {
            return lengthFn(model.$value) <= global.SummaryMaxLen;
        };
        $scope.checkTag = function (scope, model) {
            var list = model.$value || '';
            list = angular.isString(list) ? list.split(/[,，、]/) : list;
            return list.length <= global.UserTagsMax;
        };
        $scope.checkPwd = function (scope, model) {
            var passwd = model.$value || '';
            return passwd === ($scope.user.passwd || '');
        };
        $scope.getTag = function (tag) {
            var tagsList = $scope.user.tagsList;
            if (tagsList.indexOf(tag.tag) < 0 && tagsList.length < global.UserTagsMax) {
                $scope.user.tagsList = tagsList.concat(tag.tag); // 此处push方法不会更新tagsList视图
            }
        };
        $scope.reset = function () {
            $scope.user = app.union(originData);
        };
        $scope.verifyEmail = function () {
            var verify = app.restAPI.user.save({
                ID: 'reset'
            }, {
                request: 'role'
            }, function () {
                app.toast.success(locale.RESET.email, locale.RESPONSE.success);
            });
        };
        $scope.submit = function () {
            var data = app.union($scope.user);
            if (app.validate($scope)) {
                data = app.checkDirty(user, originData, data);
                if (app.isEmpty(data)) {
                    app.toast.info(locale.USER.noUpdate);
                } else {
                    if (data.passwd) {
                        data.passwd = app.CryptoJS.SHA256(data.passwd).toString();
                        data.passwd = app.CryptoJS.HmacSHA256(data.passwd, 'jsGen').toString();
                    }
                    if (data.email) {
                        app.restAPI.user.save({
                            ID: 'reset'
                        }, {
                            email: data.email,
                            request: 'email'
                        }, function () {
                            app.toast.success(locale.USER.email, locale.RESPONSE.success);
                        });
                        delete data.email;
                    }
                    if (!app.isEmpty(data)) {
                        app.restAPI.user.save({}, data, function (data) {
                            app.union(global.user, data.data);
                            initUser();
                            app.toast.success(locale.USER.updated, locale.RESPONSE.success);
                        });
                    } else {
                        initUser();
                    }
                }
            }
        };

        $scope.$watchCollection('user', function (value) {
            app.checkDirty(user, originData, value);
        });
        initUser();
    }
])
.controller('articleCtrl', ['app', '$scope', '$routeParams', 'mdEditor', 'getList', 'getMarkdown',
    function (app, $scope, $routeParams, mdEditor, getList, getMarkdown) {
        var ID = 'A' + $routeParams.ID,
            myConf = app.myConf,
            locale = app.locale,
            global = app.rootScope.global,
            filter = app.filter,
            lengthFn = filter('length'),
            cutTextFn = filter('cutText'),
            commentCache = app.cache.comment,
            listCache = app.cache.list,
            restAPI = app.restAPI.article,
            user = global.user || {};

        user = {
            _id: user._id,
            name: user.name,
            avatar: user.avatar
        };

        function checkArticleIs(article) {
            var _id = user._id;
            if (!angular.isObject(article)) {
                return;
            }
            article.isAuthor = _id === article.author._id;
            article.isMark = !!app.findItem(article.markList, function (x) {
                return x._id === _id;
            });
            article.isFavor = !!app.findItem(article.favorsList, function (x) {
                return x._id === _id;
            });
            article.isOppose = !!app.findItem(article.opposesList, function (x) {
                return x._id === _id;
            });
            app.each(article.commentsList, function (x) {
                checkArticleIs(x);
            });
        }

        function checkLogin() {
            if (!global.isLogin) {
                app.toast.error(locale.USER.noLogin);
            }
            return global.isLogin;
        }

        function initReply() {
            var comment = $scope.comment,
                article = $scope.article;
            comment.replyToComment = '';
            comment.title = '评论：' + cutTextFn(article.title, global.TitleMaxLen - 9);
            comment.content = '';
            comment.refer = article._id;
            $scope.replyMoving.prependTo('#comments');
        }

        $scope.parent = {
            wmdPreview: false,
            contentBytes: 0,
            markdownHelp: ''
        };
        $scope.comment = {
            title: '',
            content: '',
            refer: '',
            replyToComment: ''
        };
        $scope.replyMoving = {};
        $scope.commentMoving = {};
        $scope.markdownModal = {
            title: locale.ARTICLE.markdown,
            cancelBtn: locale.BTN_TEXT.goBack
        };
        $scope.validateTooltip = app.union(app.rootScope.validateTooltip);
        $scope.validateTooltip.placement = 'bottom';
        $scope.removeCommentModal = {
            confirmBtn: locale.BTN_TEXT.confirm,
            confirmFn: function () {
                var comment = $scope.removeComment;
                app.restAPI.article.remove({
                    ID: comment._id
                }, function () {
                    app.findItem($scope.article.commentsList, function (x, i, list) {
                        if (x._id === comment._id) {
                            list.splice(i, 1);
                            $scope.article.comments = list.length;
                            app.toast.success(locale.ARTICLE.removed + comment.title, locale.RESPONSE.success);
                            return true;
                        }
                    });
                    $scope.removeComment = null;
                });
                return true;
            },
            cancelBtn: locale.BTN_TEXT.cancel,
            cancelFn: function () {
                $scope.removeComment = null;
                return true;
            }
        };
        $scope.remove = function (comment) {
            if (comment.isAuthor || global.isEditor) {
                $scope.removeComment = comment;
                $scope.removeCommentModal.modal(true);
            }
        };

        $scope.wmdHelp = function () {
            getMarkdown.success(function (data) {
                $scope.parent.markdownHelp = data;
                $scope.markdownModal.modal(true);
            });
        };
        $scope.wmdPreview = function () {
            $scope.parent.wmdPreview = !$scope.parent.wmdPreview;
            $scope.replyMoving.scrollIntoView(true);
        };
        $scope.checkContentMin = function (scope, model) {
            var length = lengthFn(model.$value);
            $scope.parent.contentBytes = length;
            return length >= global.ContentMinLen;
        };
        $scope.checkContentMax = function (scope, model) {
            return lengthFn(model.$value) <= global.ContentMaxLen;
        };
        $scope.reply = function (article) {
            var comment = $scope.comment;
            comment.refer = article._id;
            $scope.parent.wmdPreview = false;
            if (article._id === $scope.article._id) {
                initReply();
            } else {
                comment.replyToComment = article._id;
                comment.title = locale.ARTICLE.reply + cutTextFn(app.sanitize(app.mdParse(article.content), 0), global.TitleMaxLen - 9);
                $scope.replyMoving.appendTo('#' + article._id);
            }
            $scope.replyMoving.scrollIntoView();
        };
        $scope.getComments = function (idArray, to) {
            var idList = [],
                result = {};

            function getResult() {
                var list = [];
                app.each(idArray, function (x) {
                    if (result[x]) {
                        list.push(result[x]);
                    }
                });
                return list;
            }

            $scope.referComments = [];
            if (to && idArray && idArray.length > 0) {
                if ($scope.commentMoving.childrenOf('#' + to._id)) {
                    $scope.commentMoving.appendTo('#comments');
                    return;
                } else {
                    $scope.commentMoving.appendTo('#' + to._id);
                }
                app.each(idArray, function (x) {
                    var comment = commentCache.get(x);
                    if (comment) {
                        result[x] = comment;
                    } else {
                        idList.push(x);
                    }
                });
                $scope.referComments = getResult();
                if (idList.length > 0) {
                    restAPI.save({
                        ID: 'comment'
                    }, {
                        data: idList
                    }, function (data) {
                        app.each(data.data, function (x) {
                            checkArticleIs(x);
                            commentCache.put(x._id, x);
                            result[x._id] = x;
                        });
                        $scope.referComments = getResult();
                    });
                }
            }
        };
        $scope.highlight = function (article) {
            // this is todo
            article.status = article.status === 2 ? 1 : 2;
        };
        $scope.setMark = function (article) {
            if (checkLogin()) {
                restAPI.save({
                    ID: article._id,
                    OP: 'mark'
                }, {
                    mark: !article.isMark
                }, function () {
                    article.isMark = !article.isMark;
                    if (article.isMark) {
                        article.markList.push(user);
                    } else {
                        app.removeItem(article.markList, user._id);
                    }
                    app.toast.success(locale.ARTICLE[article.isMark ? 'marked' : 'unmarked']);
                });
            }
        };
        $scope.setFavor = function (article) {
            if (checkLogin()) {
                restAPI.save({
                    ID: article._id,
                    OP: 'favor'
                }, {
                    favor: !article.isFavor
                }, function () {
                    article.isFavor = !article.isFavor;
                    if (article.isFavor) {
                        article.favorsList.push(user);
                        app.removeItem(article.opposesList, user._id);
                        article.isOppose = false;
                    } else {
                        app.removeItem(article.favorsList, user._id);
                    }
                    app.toast.success(locale.ARTICLE[article.isFavor ? 'favored' : 'unfavored']);
                });
            }
        };
        $scope.setOppose = function (article) {
            if (checkLogin()) {
                restAPI.save({
                    ID: article._id,
                    OP: 'oppose'
                }, {
                    oppose: !article.isOppose
                }, function () {
                    article.isOppose = !article.isOppose;
                    if (article.isOppose) {
                        article.opposesList.push(user);
                        app.removeItem(article.favorsList, user._id);
                        article.isFavor = false;
                    } else {
                        app.removeItem(article.opposesList, user._id);
                    }
                    app.toast.success(locale.ARTICLE[article.isOppose ? 'opposed' : 'unopposed']);
                });
            }
        };
        $scope.submit = function () {
            if (checkLogin() && app.validate($scope)) {
                var data = app.union($scope.comment),
                    article = $scope.article;
                restAPI.save({
                    ID: article._id,
                    OP: 'comment'
                }, data, function (data) {
                    var comment = data.data,
                        replyToComment = $scope.comment.replyToComment;
                    article.commentsList.unshift(comment);
                    article.comments += 1;
                    article.updateTime = Date.now();
                    if (replyToComment) {
                        app.findItem(article.commentsList, function (x, i, list) {
                            if (replyToComment === x._id) {
                                x.commentsList.push(comment._id);
                                return true;
                            }
                        });
                    }
                    commentCache.put(comment._id, comment);
                    initReply();
                });
            }
        };
        $scope.$on('genPagination', function (event, p, s) {
            event.stopPropagation();
            var params = {
                ID: ID,
                OP: 'comment',
                p: p,
                s: myConf.pageSize(s, 'comment', 10)
            };
            app.promiseGet(params, restAPI, app.param(params), listCache).then(function (data) {
                var pagination = data.pagination || {},
                    commentsList = data.data;
                pagination.pageSize = myConf.pageSize(pagination.pageSize, 'comment');
                $scope.pagination = pagination;
                app.each(commentsList, function (x) {
                    checkArticleIs(x);
                    commentCache.put(x._id, x);
                });
                $scope.article.commentsList = commentsList;
                app.anchorScroll.toView('#comments', true);
            });
        });

        mdEditor().run();
        app.promiseGet({
            ID: ID
        }, restAPI, ID, app.cache.article).then(function (data) {
            var pagination = data.pagination || {},
                article = data.data;
            pagination.pageSize = myConf.pageSize(pagination.pageSize, 'comments');
            checkArticleIs(article);
            app.each(article.commentsList, function (x) {
                commentCache.put(x._id, x);
            });
            global.title2 = article.title;
            $scope.pagination = pagination;
            $scope.article = article;
            initReply();

            app.promiseGet({
                ID: article.author._id,
                OP: 'article'
            }, app.restAPI.user, article.author._id, listCache).then(function (data) {
                var user = data.user,
                    author = $scope.article.author;
                app.checkFollow(user);
                app.union(author, user);
                author.articlesList = data.data;
            });
        });
        getList('hots').then(function (data) {
            $scope.hotArticles = data.data.slice(0, 10);
        });
    }
])
.controller('articleEditorCtrl', ['app', '$scope', '$routeParams', 'mdEditor', 'getMarkdown',
    function (app, $scope, $routeParams, mdEditor, getMarkdown) {
        var oldArticle,
            ID = $routeParams.ID && 'A' + $routeParams.ID,
            toStr = app.toStr,
            locale = app.locale,
            global = app.rootScope.global,
            filter = app.filter,
            upyun = app.upyun,
            lengthFn = filter('length'),
            cutTextFn = filter('cutText'),
            restAPI = app.restAPI.article,
            articleCache = app.cache.article,
            article = {
                title: '',
                content: '',
                refer: '',
                tagsList: []
            },
            originData = app.union(article);

        if (!global.isLogin) {
            return app.location.search({}).path('/');
        }

        function initArticle(data) {
            originData = app.union(article);
            if (data) {
                data = app.union(data);
                app.each(data.tagsList, function (x, i, list) {
                    list[i] = x.tag;
                });
                data.refer = data.refer && data.refer.url;
                app.intersect(originData, data);
                $scope.article = app.union(originData);
                app.checkDirty(article, originData, $scope.article);
            } else {
                $scope.article = {};
                app.each(article, function (value, key) {
                    $scope.article[key] = app.store.get('article.' + key) || value;
                });
            }
            preview(data);
        }

        function preview(value) {
            var parent = $scope.parent,
                article = $scope.article;
            if (value) {
                parent.title = locale.ARTICLE.preview + toStr(article.title);
                parent.content = article.content;
            } else {
                getMarkdown.success(function (data) {
                    parent.title = locale.ARTICLE.markdown;
                    parent.content = data;
                });
            }
        }

        global.title2 = app.locale.ARTICLE.title;
        $scope.parent = {
            edit: !! ID,
            wmdPreview: true,
            contentBytes: 0,
            titleBytes: 0,
            title: '',
            content: ''
        };
        var baseUrl = global.cloudDomian || global.url;
        $scope.uploaderOptions = {
            scope: $scope,
            allowFileType: upyun.allowFileType,
            url: upyun.url,
            baseUrl: baseUrl,
            policy: upyun.policy,
            signature: upyun.signature,
            clickImage: function (file) {
                $scope.article.content += '\n' + '![' + file.name + '](' + file.url + ')\n';
            }
        };

        $scope.validateTooltip = app.union(app.rootScope.validateTooltip);
        $scope.validateTooltip.placement = 'bottom';
        $scope.store = function (key) {
            var value = $scope.article[key];
            app.store.set('article.' + key, value);
        };
        $scope.checkTitleMin = function (scope, model) {
            var length = lengthFn(model.$value);
            $scope.parent.titleBytes = length;
            if ($scope.parent.wmdPreview) {
                $scope.parent.title = locale.ARTICLE.preview + app.sanitize(model.$value, 0);
            }
            return length >= global.TitleMinLen;
        };
        $scope.checkTitleMax = function (scope, model) {
            return lengthFn(model.$value) <= global.TitleMaxLen;
        };
        $scope.checkContentMin = function (scope, model) {
            var length = lengthFn(model.$value);
            $scope.parent.contentBytes = length;
            if ($scope.parent.wmdPreview) {
                $scope.parent.content = model.$value;
            }
            return length >= global.ContentMinLen;
        };
        $scope.checkContentMax = function (scope, model) {
            return lengthFn(model.$value) <= global.ContentMaxLen;
        };
        $scope.checkTag = function (scope, model) {
            var list = model.$value || '';
            list = angular.isString(list) ? list.split(/[,，、]/) : list;
            return list.length <= global.ArticleTagsMax;
        };
        $scope.getTag = function (tag) {
            var tagsList = $scope.article.tagsList;
            if (tagsList.indexOf(tag.tag) < 0 && tagsList.length < global.ArticleTagsMax) {
                $scope.article.tagsList = tagsList.concat(tag.tag); // 此处push方法不会更新tagsList视图
                $scope.store('tagsList');
            }
        };
        $scope.wmdPreview = function () {
            var parent = $scope.parent;
            parent.wmdPreview = !parent.wmdPreview;
            preview(parent.wmdPreview);
        };

        $scope.submit = function () {
            var data = app.union($scope.article);
            if (app.validate($scope)) {
                if (app.checkDirty(article, originData, data)) {
                    data.title = app.sanitize(data.title, 0);
                    restAPI.save({
                        ID: ID || 'index',
                        OP: ID && 'edit'
                    }, data, function (data) {
                        var article = data.data;

                        if (oldArticle) {
                            delete article.commentsList;
                            article = data.data = app.union(oldArticle.data, article);
                        }
                        articleCache.put(article._id, data);
                        initArticle(article);
                        app.toast.success(locale.ARTICLE[ID ? 'updated' : 'added'] + article.title);
                        var timing = app.timing(null, 1000, 2);
                        timing.then(function () {
                            app.location.search({}).path('/' + article._id);
                        });
                        app.store.clear();
                    });
                } else {
                    app.toast.info(locale.ARTICLE.noUpdate);
                }
            }
        };

        if (!app.store.enabled) {
            $scope.$watchCollection('article', function (value) {
                app.checkDirty(article, originData, value);
            });
        }

        mdEditor().run();
        if (ID) {
            oldArticle = articleCache.get(ID);
            app.promiseGet({
                ID: ID
            }, restAPI, ID, articleCache).then(function (data) {
                initArticle(data.data);
            });
        } else {
            initArticle();
        }
    }
])
.controller('adminCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var global = app.rootScope.global,
            path = $routeParams.OP || 'index';

        if (!global.isEditor) {
            return app.location.search({}).path('/');
        }

        function tplName(path) {
            path = path === 'comment' ? 'article' : path;
            return 'admin-' + path + '.html';
        }

        $scope.parent = {
            getTpl: app.getFile.html(tplName(path)),
            viewPath: path
        };
        global.title2 = app.locale.ADMIN[path];
    }
])
.controller('adminUserCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var originData = {},
            restAPI = app.restAPI.user,
            myConf = app.myConf,
            locale = app.locale,
            params = {
                ID: 'admin',
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'userAdmin', 20)
            },
            userList = [{
                _id: '',
                name: '',
                locked: false,
                email: '',
                role: 0,
                score: 0,
                date: 0,
                lastLoginDate: 0
            }];

        function initUserList(list) {
            originData = app.intersect(app.union(userList), list);
            $scope.userList = app.union(originData);
            $scope.parent.editSave = !! app.checkDirty(userList, originData, $scope.userList);
        }

        $scope.parent = {
            editSave: false,
            isSelectAll: false
        };
        $scope.pagination = {};
        $scope.roleArray = [0, 1, 2, 3, 4, 5];

        $scope.selectAll = function () {
            app.each($scope.userList, function (x) {
                x.isSelect = $scope.parent.isSelectAll;
            });
        };
        $scope.reset = function () {
            $scope.userList = app.union(originData);
        };
        $scope.submit = function () {
            var list = [{
                _id: '',
                locked: false,
                role: 0
            }];
            if (app.validate($scope)) {
                var data = app.checkDirty(userList, originData, $scope.userList);
                if (app.isEmpty(data)) {
                    app.toast.info(locale.USER.noUpdate);
                } else {
                    data = app.intersect(list, data);
                    restAPI.save({
                        ID: 'admin'
                    }, {
                        data: data
                    }, function (data) {
                        var updated = [];
                        app.each(data.data, function (x) {
                            app.findItem($scope.userList, function (y) {
                                if (x._id === y._id) {
                                    app.union(y, x);
                                    updated.push(x.name);
                                    return true;
                                }
                            });
                        });
                        initUserList($scope.userList);
                        app.toast.success(locale.USER.updated + updated.join(', '), locale.RESPONSE.success);
                    });
                }
            }
        };
        $scope.$watch('userList', function (value) {
            $scope.parent.editSave = !! app.checkDirty(userList, originData, value);
        }, true);
        app.promiseGet(params, restAPI).then(function (data) {
            var pagination = data.pagination || {};
            pagination.path = app.location.path();
            pagination.pageSize = myConf.pageSize(pagination.pageSize, 'userAdmin');
            pagination.sizePerPage = [20, 100, 200];
            $scope.pagination = pagination;
            initUserList(data.data);
        });
    }
])
.controller('adminTagCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var originData = {},
            restAPI = app.restAPI.tag,
            myConf = app.myConf,
            locale = app.locale,
            params = {
                ID: 'index',
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'tagAdmin', 20)
            },
            tagList = [{
                _id: '',
                articles: 0,
                tag: '',
                users: 0
            }];

        function initTagList(list) {
            originData = app.union(app.union(tagList), list);
            $scope.tagList = app.union(originData);
            $scope.parent.editSave = !! app.checkDirty(tagList, originData, $scope.tagList);
        }

        $scope.parent = {
            editSave: false
        };
        $scope.pagination = {};
        $scope.removeTag = null;

        $scope.removeTagModal = {
            confirmBtn: locale.BTN_TEXT.confirm,
            confirmFn: function () {
                var tag = $scope.removeTag;
                restAPI.remove({
                    ID: tag._id
                }, function () {
                    app.findItem($scope.tagList, function (x, i, list) {
                        if (x._id === tag._id) {
                            list.splice(i, 1);
                            app.toast.success(locale.TAG.removed + tag.tag, locale.RESPONSE.success);
                            return true;
                        }
                    });
                    initTagList($scope.tagList);
                    $scope.removeTag = null;
                });
                return true;
            },
            cancelBtn: locale.BTN_TEXT.cancel,
            cancelFn: function () {
                $scope.removeTag = null;
                return true;
            }
        };

        $scope.checkTag = function (scope, model) {
            var tag = app.toStr(model.$value);
            return !/[,，、]/.test(tag);
        };
        $scope.checkTagMin = function (scope, model) {
            return app.filter('length')(model.$value) >= 3;
        };
        $scope.reset = function () {
            $scope.tagList = app.union(originData);
        };
        $scope.remove = function (tag) {
            $scope.removeTag = tag;
            $scope.removeTagModal.modal(true);
        };
        $scope.submit = function () {
            var list = [{
                _id: '',
                tag: ''
            }];
            if (app.validate($scope)) {
                var data = app.checkDirty(tagList, originData, $scope.tagList);
                if (app.isEmpty(data)) {
                    app.toast.info(locale.TAG.noUpdate);
                } else {
                    data = app.intersect(list, data);
                    restAPI.save({
                        ID: 'admin'
                    }, {
                        data: data
                    }, function (result) {
                        var updated = [];
                        app.each(data, function (x) {
                            var tag = result.data[x._id];
                            if (!tag) {
                                app.findItem($scope.tagList, function (y, i, list) {
                                    if (x._id === y._id) {
                                        list.splice(i, 1);
                                        return true;
                                    }
                                });
                            }
                        });
                        app.each(result.data, function (x) {
                            app.findItem($scope.tagList, function (y, i, list) {
                                if (x._id === y._id) {
                                    app.union(y, x);
                                    updated.push(x.tag);
                                    return true;
                                }
                            });
                        });
                        initTagList($scope.tagList);
                        app.toast.success(locale.TAG.updated + updated.join(', '), locale.RESPONSE.success);
                    });
                }
            }
        };

        $scope.$watch('tagList', function (value) {
            $scope.parent.editSave = !! app.checkDirty(tagList, originData, value);
        }, true);
        app.promiseGet(params, restAPI).then(function (data) {
            var pagination = data.pagination || {};
            pagination.path = app.location.path();
            pagination.pageSize = myConf.pageSize(pagination.pageSize, 'tagAdmin');
            pagination.sizePerPage = [20, 50, 100];
            $scope.pagination = pagination;
            initTagList(data.data);
        });
    }
])
.controller('adminArticleCtrl', ['app', '$scope',
    function (app, $scope) {

    }
])
.controller('adminGlobalCtrl', ['app', '$scope',
    function (app, $scope) {
        var globalTpl,
            originData = {},
            tagsArray = [],
            locale = app.locale,
            filter = app.filter,
            restAPI = app.restAPI.index,
            lengthFn = filter('length');


        function initglobal(data) {
            $scope.global = app.union(data);
            originData = app.union(data);
            originData = app.intersect(app.union(globalTpl), originData);
            $scope.editGlobal = app.union(originData);
            app.checkDirty(globalTpl, originData, $scope.editGlobal);
        }

        $scope.parent = {
            switchTab: 'tab1'
        };
        $scope.reset = function () {
            $scope.editGlobal = app.union(originData);
        };
        $scope.submit = function () {
            var data = app.union($scope.editGlobal);
            if (app.validate($scope)) {
                data = app.checkDirty(globalTpl, originData, data);
                if (app.isEmpty(data)) {
                    app.toast.info(locale.ADMIN.noUpdate);
                } else {
                    restAPI.save({
                        OP: 'admin'
                    }, data, function (data) {
                        initglobal(data.data);
                        var updated = app.union(originData);
                        delete updated.smtp;
                        delete updated.email;
                        app.union(app.rootScope.global, updated);
                        app.toast.success(locale.ADMIN.updated, locale.RESPONSE.success);
                    });
                }
            }
        };

        $scope.$watchCollection('editGlobal', function (value) {
            app.checkDirty(globalTpl, originData, value);
        });
        app.promiseGet({
            OP: 'admin'
        }, restAPI).then(function (data) {
            globalTpl = data.configTpl;
            initglobal(data.data);
        });
    }
]);
