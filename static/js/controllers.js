'use strict';

/* Controllers */

var IndexCtrl = ['$scope', '$http', function ($scope, $http) {

}];

var UserLoginCtrl = ['$scope', '$http', '$location', function UserLoginCtrl($scope, $http, $location) {
  var data = {};
  $scope.test = $scope.logname;
  $scope.submit = function () {
    $scope.test = 'testit';
    data.logname = $scope.logname;
    data.logpwd = CryptoJS.SHA256($scope.logpwd).toString();
    data.logpwd = CryptoJS.HmacSHA256(data.logpwd, data.logname).toString();
    $http.post('/api/user/login', data).
      success(function(data) {
        alert(JSON.stringify(data));
        //$location.path('/');
      });
  };
}];
