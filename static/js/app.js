'use strict';

// Declare app level module which depends on filters, and services
angular.module('jsGen', ['jsGen.filters', 'jsGen.services', 'jsGen.directives']).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.
      when('/', {
        templateUrl: '/static/tpl/index.html',
        controller: IndexCtrl
      }).
      when('/login', {
        templateUrl: 'static/tpl/login.html',
        controller: UserLoginCtrl
      }).
      otherwise({
        redirectTo: '/'
      });
    $locationProvider.html5Mode(true);
  }]);
