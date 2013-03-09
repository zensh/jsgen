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
    when('/add', {
        templateUrl: 'static/tpl/article-add.html',
        controller: jsGen.addArticleCtrl
    }).
    when('/U:ID', {
        templateUrl: 'static/tpl/user.html',
        controller: jsGen.userCtrl
    }).
    when('/A:ID', {
        templateUrl: 'static/tpl/article.html',
        controller: jsGen.articleCtrl
    }).
    when('/T:ID', {
        templateUrl: 'static/tpl/tag.html',
        controller: jsGen.tagCtrl
    }).
    when('/O:ID', {
        templateUrl: 'static/tpl/collection.html',
        controller: jsGen.collectionCtrl
    }).
    otherwise({
        redirectTo: '/'
    });
    $locationProvider.html5Mode(true);
}]);
