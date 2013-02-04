'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
// angular.module('jsGen.services', []).
//   value('version', '0.1');

angular.module('jsGen.services', ['ngResource']).
    factory('globalServ', ['$resource', function($resource){
      return $resource('/api/index');
    }]).
    factory('loginServ', ['$resource', function($resource){
      return $resource('/api/user/login');
    }]).
    factory('logoutServ', ['$resource', function($resource){
      return $resource('/api/user/logout');
    }]).
    factory('registerServ', ['$resource', function($resource){
      return $resource('/api/user/register');
    }]).
    factory('homeServ', ['$resource', function($resource){
      return $resource('/api/user/index');
    }]).
    factory('getUserServ', ['$resource', function($resource){
      return $resource('/api/user/:Uid');
    }]).
    factory('userAdminServ', ['$resource', function($resource){
      return $resource('/api/user/admin');
    }]);
