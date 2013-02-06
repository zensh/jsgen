'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
// angular.module('jsGen.services', []).
//   value('version', '0.1');
angular.module('jsGen.services', ['ngResource']).
factory('rest', ['$resource', function($resource) {
    return {
        global: $resource('/api/index'),
        login: $resource('/api/user/login'),
        logout: $resource('/api/user/logout'),
        register: $resource('/api/user/register'),
        home: $resource('/api/user/index'),
        userView: $resource('/api/user/:Uid', {
            Uid: 'index'
        }),
        userAdmin: $resource('/api/user/admin')
    }
}]).
factory('cache', ['$cacheFactory', function($cacheFactory) {
    return {
        users: $cacheFactory('users', {
            capacity: 10
        }),
        articles: $cacheFactory('articles', {
            capacity: 20
        })
    }
}]);
