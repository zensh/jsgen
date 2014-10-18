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
.config(['$routeProvider', '$locationProvider',

    function ($routeProvider, $locationProvider) {
        var index = {
            templateUrl: 'index.html',
            controller: 'indexCtrl'
        },
            login = {
                templateUrl: 'login.html',
                controller: 'userLoginCtrl'
            },
            register = {
                templateUrl: 'register.html',
                controller: 'userRegisterCtrl'
            },
            home = {
                templateUrl: 'user.html',
                controller: 'homeCtrl'
            },
            admin = {
                templateUrl: 'admin.html',
                controller: 'adminCtrl'
            },
            edit = {
                templateUrl: 'article-editor.html',
                controller: 'articleEditorCtrl'
            },
            tag = {
                templateUrl: 'index.html',
                controller: 'tagCtrl'
            },
            reset = {
                templateUrl: 'reset.html',
                controller: 'userResetCtrl'
            },
            user = {
                templateUrl: 'user.html',
                controller: 'userCtrl'
            },
            article = {
                templateUrl: 'article.html',
                controller: 'articleCtrl'
            },
            collection = {
                templateUrl: 'collection.html',
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
