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