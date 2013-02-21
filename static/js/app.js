'use strict';

// Declare app level module which depends on filters, and services
angular.module('jsGen', ['jsGen.filters', 'jsGen.services', 'jsGen.directives']).
config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.
    when('/', {
        templateUrl: '/static/tpl/index.html',
        controller: jsGen.IndexCtrl
    }).
    when('/login', {
        templateUrl: 'static/tpl/login.html',
        controller: jsGen.UserLoginCtrl
    }).
    when('/register', {
        templateUrl: 'static/tpl/register.html',
        controller: jsGen.UserRegisterCtrl
    }).
    when('/home', {
        templateUrl: 'static/tpl/user.html',
        controller: jsGen.api.homeCtrl
    }).
    when('/admin', {
        templateUrl: 'static/tpl/admin.html',
        controller: jsGen.api.adminCtrl
    }).
    when('/U:id', {
        templateUrl: 'static/tpl/user.html',
        controller: jsGen.UserViewCtrl
    }).
    when('/A:id', {
        templateUrl: 'static/tpl/article.html',
        controller: jsGen.ArticleCtrl
    }).
    when('/T:id', {
        templateUrl: 'static/tpl/tag.html',
        controller: jsGen.TagCtrl
    }).
    when('/O:id', {
        templateUrl: 'static/tpl/collection.html',
        controller: jsGen.CollectionCtrl
    }).
    otherwise({
        redirectTo: '/'
    });
    $locationProvider.html5Mode(true);
}]);

var jsGen = {
    global: {}
};

(function() {
    function checkClass(obj) {
        if(obj === null) return 'Null';
        if(obj === undefined) return 'Undefined';
        return Object.prototype.toString.call(obj).slice(8, -1);
    };
    function union(a, b) {
        if(checkClass(a) === checkClass(b)) {
            for(var key in b) {
                if(!b.hasOwnProperty(key)) continue;
                switch(checkClass(b[key])) {
                case 'Object':
                    if(checkClass(a[key]) !== 'Object') a[key] = {};
                    union(a[key], b[key]);
                    break;
                case 'Array':
                    if(checkClass(a[key]) !== 'Array') a[key] = [];
                    union(a[key], b[key]);
                    break;
                default:
                    a[key] = b[key];
                }
            }
        } else if(b === undefined) {
            switch(checkClass(a)) {
            case 'Object':
                var s = {};
                break;
            case 'Array':
                var s = [];
                break;
            default:
                return a;
            }
            for(var key in a) {
                if(!a.hasOwnProperty(key)) continue;
                if(typeof a[key] === 'object' && a[key] !== null) {
                    s[key] = union(a[key]);
                } else s[key] = a[key];
            }
            return s;
        }
        return a;
    }

    this.checkClass = checkClass;
    this.union = union;
    return this;
}).call(jsGen);
