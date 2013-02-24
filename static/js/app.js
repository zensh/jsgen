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
    function checkType(obj) {
        var type = typeof obj;
        if(obj === null) return 'null';
        if(type !== 'object') return type;
        if(Array.isArray(obj)) return 'array';
        return type;
    };

    function union(a, b) {
        if(b === undefined) {
            var s, type = checkType(a);
            if(type === 'object') s = {};
            else if(type === 'array') s = [];
            else if(type === 'function') return undefined;
            else return a;
            for(var key in a) {
                if(!a.hasOwnProperty(key)) continue;
                if(typeof a[key] === 'object' && a[key] !== null) {
                    s[key] = union(a[key]);
                } else s[key] = a[key];
            }
            return s;
        }
        if(checkType(a) !== checkType(b)) return a;
        for(var key in b) {
            if(!b.hasOwnProperty(key)) continue;
            var typeBkey = checkType(b[key]);
            if(typeBkey === 'object') {
                if(checkType(a[key]) !== 'object') a[key] = {};
                union(a[key], b[key]);
            } else if(typeBkey === 'array') {
                if(checkType(a[key]) !== 'array') a[key] = [];
                union(a[key], b[key]);
            } else if(typeBkey !== 'function') a[key] = b[key];
        }
        return a;
    };

    function intersect(a, b) {
        if(a && b) {
            var typeA = checkType(a),
                typeB = checkType(b);
            if(typeA === 'array' && typeB === 'array' && a.length <=1) {
                if(a.length === 0) union(a, b);
                else {
                    var o = union(a[0]);
                    var typeAkey = checkType(a[0]);
                    if(typeAkey !== 'function') b.forEach(function(key, i) {
                        typeBkey = checkType(key);
                        if(typeBkey === typeAkey) {
                            if(typeBkey === 'object' || typeBkey === 'array') {
                                a[i] = union(o);
                                intersect(a[i], key);
                            } else a[i] = key;
                        }
                    });
                }
            } else if(typeA === 'object' && typeB === 'object' && Object.keys(a).length === 0) {
                union(a, b);
            } else {
                for(var key in a) {
                    var typeBkey = checkType(b[key]);
                    if(b.hasOwnProperty(key) && checkType(a[key]) === typeBkey && typeBkey !== 'function') {
                        if(typeBkey === 'object' || typeBkey === 'array') {
                            intersect(a[key], b[key]);
                        } else a[key] = b[key];
                    } else delete a[key];
                }
            }
        }
        return a;
    };

    this.lib.checkType = checkType;
    this.lib.union = union;
    this.lib.intersect = intersect;
    return this;
}).call(jsGen);
