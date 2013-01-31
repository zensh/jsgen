'use strict';

/* Controllers */

function IndexCtrl($scope, $http) {

}

function UserLoginCtrl($scope, $http, $location) {
  var data = {};
  $scope.submit = function () {
    data.logname = $scope.logname;
    data.logpwd = CryptoJS.SHA256($scope.logpwd).toString();
    data.logpwd = CryptoJS.HmacSHA256(data.logpwd, data.logname).toString();
    $http.post('/api/user/login', data).
      success(function(data) {
        alert(data);
        //$location.path('/');
      });
  };
}
