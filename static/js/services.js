'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
// angular.module('jsGen.services', []).
//   value('version', '0.1');
angular.module('jsGen.services', ['ngResource']).
factory('rest', ['$resource', function($resource) {
    return {
        index: $resource('/api/index'),
        indexAdmin: $resource('/api/index/admin'),
        login: $resource('/api/user/login'),
        logout: $resource('/api/user/logout'),
        reset: $resource('/api/user/reset'),
        register: $resource('/api/user/register'),
        home: $resource('/api/user/index'),
        user: $resource('/api/user/:Uid', {
            Uid: 'index'
        }),
        userAdmin: $resource('/api/user/admin'),
        article: $resource('/api/article/:ID', {
            ID: 'index'
        }),
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
