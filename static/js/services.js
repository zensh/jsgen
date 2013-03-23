'use strict';

/* Services */
angular.module('jsGen.services', ['ngResource']).
factory('rest', ['$resource', function ($resource) {
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
    }
}]).
factory('cache', ['$cacheFactory', function ($cacheFactory) {
    return {
        user: $cacheFactory('user', {
            capacity: 10
        }),
        article: $cacheFactory('article', {
            capacity: 20
        })
    }
}]).
factory('MdParse', function () {
    return function (html) {
        if (typeof html !== 'string') {
            return '';
        } else {
            return marked(html);
        }
    };
}).
factory('sanitize', function () {
    var sanitize0 = new Sanitize({});
    var sanitize1 = new Sanitize(Sanitize.Config.RESTRICTED);
    var sanitize2 = new Sanitize(Sanitize.Config.BASIC);
    var sanitize3 = new Sanitize(Sanitize.Config.RELAXED);
    return function (html, level) {
        switch (level) {
            case 0:
                var san = sanitize0;
                break;
            case 1:
                var san = sanitize1;
                break;
            case 2:
                var san = sanitize2;
                break;
            case 3:
                var san = sanitize3;
                break;
            default:
                var san = sanitize3;
        }
        var innerDOM = document.createElement('div');
        var outerDOM = document.createElement('div');
        innerDOM.innerHTML = html;
        outerDOM.appendChild(san.clean_node(innerDOM));
        return outerDOM.innerHTML;
    };
}).
factory('MdEditor', ['MdParse', 'sanitize', function (MdParse, sanitize) {
    return function (idPostfix, level) {
        idPostfix = idPostfix || '';
        var editor = new Markdown.Editor({
            makeHtml: function (text) {
                return sanitize(MdParse(text), level);
            }
        }, idPostfix);
        var element = angular.element(document.getElementById('wmd-preview' + idPostfix));
        editor.hooks.chain('onPreviewRefresh', function () {
            element.children('pre').addClass('prettyprint'); // linenums have bug!
            element.children('code').addClass('prettyprint');
            prettyPrint();
        });
        return editor;
    };
}]).
factory('getArticle', ['rest', 'cache', function (rest, cache) {
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
}]).
factory('getMarkdown', ['$http', function ($http) {
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
}]);
