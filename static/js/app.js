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
        templateUrl: 'static/tpl/home.html',
        controller: jsGen.UserHomeCtrl
      }).
      otherwise({
        redirectTo: '/'
      });
    $locationProvider.html5Mode(true);
  }]);
