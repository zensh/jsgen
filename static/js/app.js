'use strict';

// Declare app level module which depends on filters, and services
angular.module('jsGen', ['jsGen.filters', 'jsGen.services', 'jsGen.directives']).
config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.
    when('/', {
        templateUrl: '/static/tpl/index.html',
        controller: jsGen.indexCtrl
    }).
    when('/login', {
        templateUrl: 'static/tpl/login.html',
        controller: jsGen.userLoginCtrl
    }).
    when('/register', {
        templateUrl: 'static/tpl/register.html',
        controller: jsGen.userRegisterCtrl
    }).
    when('/home', {
        templateUrl: 'static/tpl/user.html',
        controller: jsGen.homeCtrl
    }).
    when('/admin', {
        templateUrl: 'static/tpl/admin.html',
        controller: jsGen.adminCtrl
    }).
    when('/U:id', {
        templateUrl: 'static/tpl/user.html',
        controller: jsGen.userViewCtrl
    }).
    when('/A:id', {
        templateUrl: 'static/tpl/article.html',
        controller: jsGen.articleCtrl
    }).
    when('/T:id', {
        templateUrl: 'static/tpl/tag.html',
        controller: jsGen.tagCtrl
    }).
    when('/O:id', {
        templateUrl: 'static/tpl/collection.html',
        controller: jsGen.collectionCtrl
    }).
    otherwise({
        redirectTo: '/'
    });
    $locationProvider.html5Mode(true);
}]);

var jsGen = {
    global: {},
    lib: {}
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
    };

    function intersect(a, b) {
        if(a && b) {
            if(checkClass(a) === 'Array' && checkClass(b) === 'Array' && a.length <= 1) {
                if(a.length === 0) union(a, b);
                else {
                    var o = union(a[0]);
                    var subClass = checkClass(a[0]);
                    for(var key in b) {
                        if(checkClass(key) === subClass) {
                            if(typeof b[key] === 'object' && b[key] !== null) {
                                a[key] = union(o);
                                intersect(a[key], b[key]);
                            } else a[key] = b[key];
                        }
                    }
                }
            } else if(checkClass(a) === 'Object' && checkClass(b) === 'Object' && Object.keys(a).length === 0) {
                union(a, b);
            } else {
                for(var key in a) {
                    if(b.hasOwnProperty(key) && checkClass(a[key]) === checkClass(b[key])) {
                        if(typeof b[key] === 'object' && b[key] !== null) {
                            intersect(a[key], b[key]);
                        } else a[key] = b[key];
                    } else delete a[key];
                }
            }
        }
        return a;
    };

    this.lib.checkClass = checkClass;
    this.lib.union = union;
    this.lib.intersect = intersect;
    return this;
}).call(jsGen);
