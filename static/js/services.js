'use strict';
/*global angular, _, marked, Sanitize, Markdown, prettyPrint, toastr*/

angular.module('jsGen.services', ['ngResource']).
constant('msg', {
    errorServer: 'Server response error!'
}).
factory('log', function () {
    toastr.options = {
        positionClass: 'toast-top-full-width'
    };
    return function (message, title, type) {
        var TYPE = ['info', 'error', 'success', 'warning'];
        title = title + '';
        type = TYPE.indexOf(type) > -1 ? type : TYPE[0];
        message = angular.isObject(message) ? JSON.stringify(message) : message;
        window.console.log(type.toUpperCase() + ': [' + title + ']' + message);
        toastr[type](message, title);
    };
}).
factory('timing', ['$rootScope', '$q', '$exceptionHandler',
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
]).
factory('pretty', function () {
    return prettyPrint;
}).
factory('mdParse', function () {
    return function (html) {
        return marked(html + '');
    };
}).
factory('sanitize', function () {
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
}).
factory('mdEditor', ['mdParse', 'sanitize', 'pretty',
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
]).
factory('rest', ['$resource',
    function ($resource) {
        return {
            index: $resource('/api/index/:OP', {
                OP: 'index'
            }),
            user: $resource('/api/user/:Uid/:OP', {
                Uid: 'index',
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
]).
factory('cache', ['$cacheFactory',
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
]).
factory('loading', ['$rootScope', '$timeout',
    function ($rootScope, $timeout) {
        // DOM must have '<div srs-alert-msg="loadingMsg"></div>'
        $rootScope.loadingMsg = {
            type: 'info',
            message: '',
            width: '100px',
            loading: false
        };

        function loadingLoop() {
            if ($rootScope.loadingMsg.loading) {
                if ($rootScope.loadingMsg.message.length > 20) {
                    $rootScope.loadingMsg.message = 'loading';
                }
                $rootScope.loadingMsg.message += ' .';
                $timeout(loadingLoop, 500);
            }
        }

        return function (value) {
            if ($rootScope.loadingMsg.loading === value) {
                return;
            }
            if (value) {
                _.delay(function () {
                    if ($rootScope.loadingMsg.loading) {
                        $rootScope.loadingMsg.message = 'loading';
                        loadingLoop();
                        $rootScope.$broadcast('srsAlertMsg', true);
                    }
                }, 1000); // if no response in 1000ms, show loading message
            } else {
                $rootScope.loadingMsg.message = '';
                $rootScope.$broadcast('srsAlertMsg', false);
            }
            $rootScope.loadingMsg.loading = !! value;
        };
    }
]).
factory('handleErr', ['msg', 'loading', 'log',
    function (msg, loading, log) {
        return {
            serverErr: function (data) {
                loading(false);
                log(msg.errorServer, data.status);
            },
            responseErr: function (data) {
                loading(false);
                log(data.error, data.status);
            }
        };
    }
]).
factory('pageSize', ['$cookieStore',
    function ($cookieStore) {
        return function (pageSize) {
            var size = $cookieStore.get('pageSize') || 25;
            if (pageSize > 0 && size !== pageSize) {
                $cookieStore.put('pageSize', pageSize);
                size = pageSize;
            }
            return size;
        };
    }
]).
factory('getArticle', ['rest', 'cache',
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
]).
factory('getUser', ['rest', 'cache',
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
]).
factory('getList', ['rest', 'cache',
    function (rest, cache) {
        return function (ID, callback) {
            var list = cache.list.get(ID);
            if (list) {
                return callback(list);
            } else {
                list = rest.article.get({
                    ID: ID,
                    OP: 10
                }, function () {
                    if (!list.err) {
                        cache.list.put(ID, list);
                    }
                    return callback(list);
                });
            }
        };
    }
]).
factory('getMarkdown', ['$http',
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