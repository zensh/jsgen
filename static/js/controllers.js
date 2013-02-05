'use strict';

/* Controllers */
var jsGen = {
    global: null,
    lib: {}
};

jsGen.lib.merge = function (a, b) {
    if(a && b) {
        for(var key in b) {
            if(typeof b[key] === 'object' && b[key] !== null) {
                a[key] = b[key];
                jsGen.lib.merge(a[key], b[key]);
            } else a[key] = b[key];
        }
    } else if(a && b === undefined) return JSON.parse(JSON.stringify(a));
    return a;
}

jsGen.CacheFa = function(capacity) {
    this.capacity = capacity || 0;
    this.cache = {};
    this.hash = {};
};
jsGen.CacheFa.prototype.get = function(key) {
    if(this.hash[key]) this.hash[key] +=1;
    return JSON.parse(JSON.stringify(this.cache[key]));
};
jsGen.CacheFa.prototype.put = function(key, value) {
    if(this.capacity === 0) {
        this.cache[key] = value;
    }
};
jsGen.CacheFa.prototype.info = function(key, value) {

};
jsGen.CacheFa.prototype.remove = function(key, value) {

};
jsGen.CacheFa.prototype.removeAll = function(key, value) {

};
jsGen.CacheFa.prototype.destroy = function(key, value) {

};
jsGen.globalCtrl = ['$scope', 'globalServ', 'logoutServ', '$location', 'usersInfoCache', function($scope, globalServ, logoutServ, $location, usersInfoCache) {
    $scope.global = jsGen.global;
    if(!jsGen.global) jsGen.global = globalServ.get({}, function() {
        $scope.global = jsGen.global;
    });
    if(!jsGen.usersInfoCache) jsGen.usersInfoCache = usersInfoCache;
    $scope.logout = function() {
        var doc = logoutServ.get({}, function() {
            if(doc.logout) delete jsGen.global.user;
            $location.path('/');
        });
    };
    $scope.clearUser = function() {
        delete jsGen.global.user;
    };
}];

jsGen.IndexCtrl = ['$scope', '$http', function($scope, $http) {

}];

jsGen.UserLoginCtrl = ['$scope', 'loginServ', '$location', function($scope, loginServ, $location) {
    var data = {};
    delete jsGen.global.user;
    $scope.submit = function() {
        data.logname = $scope.logname;
        data.logpwd = CryptoJS.SHA256($scope.logpwd).toString();
        data.logpwd = CryptoJS.HmacSHA256(data.logpwd, data.logname).toString();
        jsGen.global.user = loginServ.save({}, data, function() {
            if(!jsGen.global.user.err) $location.path('/home');
        });
    };
}];

jsGen.UserRegisterCtrl = ['$scope', 'registerServ', '$location', function($scope, registerServ, $location) {
    var data = {};
    delete jsGen.global.user;
    $scope.checkNameResult = false;
    $scope.submit = function() {
        data.name = $scope.name;
        data.passwd = CryptoJS.SHA256($scope.passwd).toString();
        data.email = $scope.email;
        jsGen.global.user = registerServ.save({}, data, function() {
            if(jsGen.global.user._id) $location.path('/home');
        });
    };
}];

jsGen.UserHomeCtrl = ['$scope', 'homeServ', '$location', function($scope, homeServ, $location) {
    if(!jsGen.global.user) $location.path('/');
    $scope.user = jsGen.usersInfoCache.get(jsGen.global.user._id);
    if(!$scope.user) jsGen.global.user = homeServ.get({}, function() {
        jsGen.usersInfoCache.put(jsGen.global.user._id, jsGen.global.user);
        $scope.user = jsGen.usersInfoCache.get(jsGen.global.user._id);
    });
}];
jsGen.UserViewCtrl = ['$scope', 'userViewServ', '$location', '$routeParams', function($scope, userViewServ, $location, $routeParams) {
    $scope.user = jsGen.usersInfoCache.get('U' + $routeParams.id);
    if(!$scope.user) $scope.user = userViewServ.get({
        Uid: 'U' + $routeParams.id
    }, function() {
        if($scope.user.err) $location.path('/');
        $scope.test = jsGen.usersInfoCache.info();
        jsGen.usersInfoCache.put($scope.user._id, $scope.user);
    });
}];
