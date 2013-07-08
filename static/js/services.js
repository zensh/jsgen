'use strict';
/*global angular, _, marked, Sanitize, Markdown, prettyPrint, toastr*/

angular.module('jsGen.services', ['ngResource', 'ngCookies']).
constant('msg', {
    errorServer: 'Server response error!'
}).factory('timing', ['$rootScope', '$q', '$exceptionHandler',
    function ($rootScope, $q, $exceptionHandler) {
        function timing(fn, delay, times) {
            var timingId, count = 0,
                defer = $q.defer(),
                promise = defer.promise;

            fn = angular.isFunction(fn) ? fn : angular.noop;
            delay = parseInt(delay, 10);
            times = parseInt(times, 10);
            times = times >= 0 ? times : 0;
            timingId = setInterval(function () {
                count += 1;
                promise.$count = count;
                if (times && count >= times) {
                    clearInterval(timingId);
                    defer.resolve(fn());
                } else {
                    try {
                        fn();
                    } catch (e) {
                        defer.reject(e);
                        $exceptionHandler(e);
                    }
                }
                $rootScope.$apply();
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
]).factory('toast', ['$log',
    function ($log) {
        var toast = {},
            methods = ['info', 'error', 'success', 'warning'];

        angular.forEach(methods, function (x) {
            toast[x] = function (message, title) {
                var log = $log[x] || $log.log;
                title = title + '';
                log(message, title);
                message = angular.isObject(message) ? angular.toJson(message) : message;
                toastr[x](message, title);
            };
        });
        toastr.options = angular.extend({
            positionClass: 'toast-top-full-width'
        }, toast.options);
        return toast;
    }
]).factory('pretty', function () {
    return prettyPrint;
}).factory('mdParse', function () {
    return function (html) {
        return marked(html + '');
    };
}).factory('sanitize', function () {
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
        var create = document.createElement.bind(document),
            innerDOM = create('div'),
            outerDOM = create('div');
        level = level ? level : 3;
        innerDOM.innerHTML = html + '';
        outerDOM.appendChild(sanitize[level].clean_node(innerDOM));
        return outerDOM.innerHTML;
    };
}).factory('mdEditor', ['mdParse', 'sanitize', 'pretty',
    function (mdParse, sanitize, pretty) {
        return function (idPostfix, level) {
            idPostfix = idPostfix ? idPostfix + '' : '';
            var editor = new Markdown.Editor({
                makeHtml: function (text) {
                    return sanitize(mdParse(text), level);
                }
            }, idPostfix);
            var element = angular.element(document.getElementById('wmd-preview' + idPostfix));
            editor.hooks.chain('onPreviewRefresh', function () {
                element.find('pre').addClass('prettyprint'); // linenums have bug!
                pretty();
            });
            return editor;
        };
    }
]).factory('rest', ['$resource',
    function ($resource) {
        return {
            index: $resource('/api/index/:OP', {
                OP: 'index'
            }),
            user: $resource('/api/user/:ID/:OP', {
                ID: 'index',
                OP: 'index'
            }),
            article: $resource('/api/article/:ID/:OP', {
                ID: 'index',
                OP: 'index'
            }),
            tag: $resource('/api/tag/:ID/:OP', {
                ID: 'index',
                OP: 'index'
            })
        };
    }
]).factory('cache', ['$cacheFactory',
    function ($cacheFactory) {
        return {
            user: $cacheFactory('user', {
                capacity: 50
            }),
            article: $cacheFactory('article', {
                capacity: 100
            }),
            list: $cacheFactory('list', {
                capacity: 10
            })
        };
    }
]).factory('handleErr', ['msg', 'toast',
    function (msg, loading, toast) {
        return {
            serverErr: function (data) {
                //toast.error(msg.errorServer, data.status);
            },
            responseErr: function (data) {
                //toast.error(data.error, data.status);
            }
        };
    }
]).factory('custom', ['$cookieStore',
    function ($cookieStore) {
        return {
            pageSize: function (pageSize) {
                var size = $cookieStore.get('pageSize') || 10;
                if (pageSize > 0 && size !== pageSize) {
                    $cookieStore.put('pageSize', pageSize);
                    size = pageSize;
                }
                return size;
            },
            listModel: function (value) {
                var model = $cookieStore.get('listModel');
                if (angular.isDefined(value) && model !== value) {
                    $cookieStore.put('listModel', value);
                    model = value;
                }
                return model;
            }
        };
    }
]).factory('promiseGet', ['$q', 'handleErr',
    function ($q, handleErr) {
        return function (param, restAPI, cacheId, cache) {
            var result, defer = $q.defer();

            result = cacheId && cache && cache.get(cacheId);
            if (result) {
                defer.resolve(result);
            } else {
                restAPI.get(param, function (data) {
                    if (!data.error) {
                        if (cacheId && cache) {
                            cache.put(cacheId, data);
                        }
                        defer.resolve(data);
                    } else {
                        defer.reject(data.error);
                        handleErr.responseErr(data);
                    }
                }, handleErr.serverErr);
            }
            return defer.promise;
        };
    }
]).factory('getArticle', ['rest', 'cache',
    function (rest, cache) {
        return function (ID, callback) {
            var article = cache.article.get(ID);
            if (article) {
                return callback(article);
            } else {
                article = rest.article.get({
                    ID: ID
                }, function () {
                    if (!article.err) {
                        cache.article.put(ID, article);
                    }
                    return callback(article);
                });
            }
        };
    }
]).factory('getUser', ['rest', 'cache',
    function (rest, cache) {
        return function (Uid, callback) {
            var user = cache.user.get(Uid);
            if (user) {
                return callback(user);
            } else {
                user = rest.user.get({
                    Uid: Uid
                }, function () {
                    if (!user.err) {
                        cache.user.put(Uid, user);
                    }
                    return callback(user);
                });
            }
        };
    }
]).factory('getList', ['rest', 'cache', 'promiseGet',
    function (rest, cache, promiseGet) {
        return function (listType) {
            return promiseGet({
                ID: listType,
                OP: 10
            }, rest.article, listType, cache.list);
        };
    }
]).factory('getMarkdown', ['$http',
    function ($http) {
        return function (callback) {
            $http.get('/static/md/markdown.md', {
                cache: true
            }).success(function (data, status) {
                var markdown = {};
                if (!data.err) {
                    markdown.title = 'Markdown简明语法';
                    markdown.content = data;
                } else {
                    markdown.err = data.err;
                }
                return callback(markdown);
            });
        };
    }
]);