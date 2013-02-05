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
        controller: jsGen.UserHomeCtrl
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
