'use strict';

// Declare app level module which depends on filters, and services
angular.module('jsGen', ['jsGen.filters', 'jsGen.services', 'jsGen.directives']).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.
      when('/', {
        templateUrl: '/static/tpl/index.html',
        controller: IndexCtrl
      }).
      when('/add', {
        templateUrl: 'static/tpl/add.html',
        controller: AddPostCtrl
      }).
      when('/read/:id', {
        templateUrl: 'static/tpl/read.html',
        controller: ReadPostCtrl
      }).
      when('/edit/:id', {
        templateUrl: '/static/tpl/edit.html',
        controller: EditPostCtrl
      }).
      when('/delete/:id', {
        templateUrl: '/static/tpl/delete.html',
        controller: DeletePostCtrl
      }).
      otherwise({
        redirectTo: '/'
      });
    $locationProvider.html5Mode(true);
  }]);
