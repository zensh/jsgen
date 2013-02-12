'use strict';

/* Controllers */
var jsGen = {
    global: {}
};
jsGen = function() {
    function checkClass(obj) {
        if(obj === null) return 'Null';
        if(obj === undefined) return 'Undefined';
        return Object.prototype.toString.call(obj).slice(8, -1);
    };

    function merge(a, b) {
        if(a && b) {
            for(var key in b) {
                if(checkClass(b[key]) === 'Object') {
                    a[key] = {};
                    merge(a[key], b[key]);
                } else if(checkClass(b[key]) === 'Array') {
                    a[key] = [];
                    merge(a[key], b[key]);
                } else a[key] = b[key];
            }
        } else if(a && b === undefined) {
            switch(checkClass(a)) {
            case 'Object':
                var s = {};
                break;
            case 'Array':
                var s = [];
                break;
            default:
                return a;
            }
            for(var key in a) {
                if(typeof a[key] === 'object' && a[key] !== null) {
                    s[key] = merge(a[key]);
                } else s[key] = a[key];
            }
            return s;
        }
        return a;
    };

    jsGen.checkClass = checkClass;
    jsGen.merge = merge;
    return jsGen;
}();

jsGen.globalCtrl = ['$scope', 'rest', '$location', 'cache', function($scope, rest, $location, cache) {
    if(!jsGen.cache) jsGen.cache = cache;
    $scope.global = jsGen.global;
    if(!jsGen.global.date) jsGen.global = rest.global.get({}, function() {
        $scope.global = jsGen.global;
    });

    $scope.logout = function() {
        var doc = rest.logout.get({}, function() {
            if(doc.logout) delete jsGen.global.user;
            $location.path('/');
        });
    };
    $scope.clearUser = function() {
        delete jsGen.global.user;
    };
}];

jsGen.IndexCtrl = ['$scope', 'rest', function($scope, rest) {

}];

jsGen.UserLoginCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var data = {};
    //delete jsGen.global.user;
    $scope.submit = function() {
        data.logname = $scope.logname;
        data.logpwd = CryptoJS.SHA256($scope.logpwd).toString();
        data.logpwd = CryptoJS.HmacSHA256(data.logpwd, data.logname).toString();
        jsGen.global.user = rest.login.save({}, data, function() {
            if(!jsGen.global.user.err) $location.path('/home');
        });
    };
}];

jsGen.UserRegisterCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var data = {};
    //delete jsGen.global.user;
    $scope.checkNameResult = false;
    $scope.submit = function() {
        data.name = $scope.name;
        data.passwd = CryptoJS.SHA256($scope.passwd).toString();
        data.email = $scope.email;
        jsGen.global.user = rest.register.save({}, data, function() {
            if(jsGen.global.user._id) $location.path('/home');
        });
    };
}];

jsGen.UserHomeCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    if(!jsGen.global.user) $location.path('/');
    $scope.user = jsGen.merge(jsGen.global.user);
    $scope.user.avatar += '?s=285';
    if(!$scope.user.date) jsGen.global.user = rest.home.get({}, function() {
        $scope.user = jsGen.merge(jsGen.global.user);
        $scope.user.avatar += '?s=285';
    });
}];

jsGen.UserViewCtrl = ['$scope', 'rest', '$location', '$routeParams', function($scope, rest, $location, $routeParams) {
    $scope.user = jsGen.cache.users.get('U' + $routeParams.id);
    //$scope.test = $location.absUrl();
    if(!$scope.user) $scope.user = rest.userView.get({
        Uid: 'U' + $routeParams.id
    }, function() {
        if($scope.user.err) $location.path('/');
        $scope.user.avatar += '?s=285';
        jsGen.cache.users.put($scope.user._id, $scope.user);
    });
}];

jsGen.UserAdminCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    if(!jsGen.global.user) $location.path('/');
    $scope.user = jsGen.merge(jsGen.global.user);
    $scope.user.avatar += '?s=285';
    if(!$scope.user.date) jsGen.global.user = rest.home.get({}, function() {
        $scope.user = jsGen.merge(jsGen.global.user);
        $scope.user.avatar += '?s=285';
    });
}];
