'use strict';

/* Controllers */
var jsGen = {
    global: null
};
if(!$) var $ = angular.element;

jsGen.globalCtrl = ['$scope', 'globalServ', 'logoutServ', function($scope, globalServ, logoutServ) {
    jsGen.global = globalServ.get({}, function() {
        $scope.global = jsGen.global;
    });
    $scope.logout = function() {
        logoutServ.get({}, function(){
            delete jsGen.global.user;
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
        jsGen.global.user = loginServ.save({}, data, function(data) {
            jsGen.global.user = data;
            if(!data.err) $location.path('/home');
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
        jsGen.global.user = registerServ.save({}, data, function(data) {
            jsGen.global.user = data;
            if(!data.err) $location.path('/home');
        });
    };
    $scope.checkName = function() {
        var reg = /^[(\u4e00-\u9fa5)a-z0-9_]{1,}$/;
        var len = utf8.stringToBytes($scope.name).length;
        if (!reg.test($scope.name)) $scope.checkNameResult = '支持汉字、小写字母a-z、数字0-9、或下划线_';
        else if (len > 0 && len < 5) $scope.checkNameResult = '长度必须大于5字节，一个汉字3字节';
        else if (len > 15) $scope.checkNameResult = '长度必须小于15字节，一个汉字3字节';
        else $scope.checkNameResult = false;
    };
}];

jsGen.UserHomeCtrl = ['$scope', 'homeServ', '$location', function($scope, homeServ, $location) {
    if (!jsGen.global.user) $location.path('/');
    else jsGen.global.user = homeServ.get({}, function() {
        $scope.user = jsGen.global.user;
    });
}];
