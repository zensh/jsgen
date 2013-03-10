'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
// angular.module('jsGen.services', []).
//   value('version', '0.1');
angular.module('jsGen.services', ['ngResource']).
factory('rest', ['$resource', function($resource) {
    return {
        index: $resource('/api/index'),
        indexAdmin: $resource('/api/index/admin'),
        login: $resource('/api/user/login'),
        logout: $resource('/api/user/logout'),
        reset: $resource('/api/user/reset'),
        register: $resource('/api/user/register'),
        home: $resource('/api/user/index'),
        user: $resource('/api/user/:Uid', {
            Uid: 'index'
        }),
        userAdmin: $resource('/api/user/admin'),
        article: $resource('/api/article/:ID', {
            ID: 'index'
        }),
    }
}]).
factory('cache', ['$cacheFactory', function($cacheFactory) {
    return {
        user: $cacheFactory('user', {
            capacity: 10
        }),
        article: $cacheFactory('article', {
            capacity: 100
        })
    }
}]).
factory('MdParse', function() {
    return function(html) {
        if (typeof html !== 'string') return;
        return marked(html);
    };
}).
factory('sanitize', function() {
    var sanitize0 = new Sanitize({});
    var sanitize1 = new Sanitize(Sanitize.Config.RESTRICTED);
    var sanitize2 = new Sanitize(Sanitize.Config.BASIC);
    var sanitize3 = new Sanitize(Sanitize.Config.RELAXED);
    return function(html, level) {
        switch (level) {
            case 0: var san = sanitize0; break;
            case 1: var san = sanitize1; break;
            case 2: var san = sanitize2; break;
            case 3: var san = sanitize3; break;
            default: var san = sanitize3;
        }
        var innerDOM = document.createElement('div');
        var outerDOM = document.createElement('div');
        innerDOM.innerHTML = html;
        outerDOM.appendChild(san.clean_node(innerDOM));
        return outerDOM.innerHTML;
    };
}).
factory('MdEditor', ['MdParse', 'sanitize', function(MdParse, sanitize) {
    return function(idPostfix, level) {
        var editor = new Markdown.Editor({
            makeHtml: function(text) {
                return sanitize(MdParse(text), level);
            }
        }, idPostfix);
        editor.hooks.chain("onPreviewRefresh", function() {
            angular.element('#wmd-preview' + idPostfix + '>pre').addClass('prettyprint linenums');
            angular.element('#wmd-preview' + idPostfix + '>code').addClass('prettyprint');
            prettyPrint();
        });
        return editor;
    };
}]);
