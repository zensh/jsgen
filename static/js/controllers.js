'use strict';

/* Controllers */
jsGen.globalCtrl = ['$scope', 'rest', '$location', 'cache', function($scope, rest, $location, cache) {
    if(!jsGen.cache) jsGen.cache = cache;
    $scope.isAdmin = false;
    $scope.isLogin = false;
    if(!jsGen.global.date) jsGen.global = rest.index.get({}, function() {
        if(jsGen.global.user) {
            $scope.isLogin = true;
            if(jsGen.global.user.role === 'admin') $scope.isAdmin = true;
            else $scope.isAdmin = false;
        } else $scope.isLogin = false;
    });
    $scope.global = jsGen.global;

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

jsGen.IndexCtrl = ['$scope', 'rest', function($scope, rest) {}];

jsGen.userLoginCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var data = {};
    $scope.submit = function() {
        data.logname = $scope.logname;
        data.logpwd = CryptoJS.SHA256($scope.logpwd).toString();
        data.logpwd = CryptoJS.HmacSHA256(data.logpwd, data.logname).toString();
        jsGen.global.user = rest.login.save({}, data, function() {
            if(jsGen.global.user.role === 'admin') jsGen.global.user.adminUrl = '/admin';
            else jsGen.global.user.adminUrl = '/home';
            if(!jsGen.global.user.err) $location.path('/home');
        });
    };
}];

jsGen.userRegisterCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var data = {};
    $scope.checkResult = false;
    $scope.checkPwd = function() {
        if($scope.passwd2 !== $scope.passwd) $scope.checkResult = true;
        else $scope.checkResult = false;
    };
    $scope.submit = function() {
        data.name = $scope.name;
        data.passwd = CryptoJS.SHA256($scope.passwd).toString();
        data.email = $scope.email;
        jsGen.global.user = rest.register.save({}, data, function() {
            if(jsGen.global.user._id) $location.path('/home');
        });
    };
}];

jsGen.homeCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    if(!jsGen.global.user) $location.path('/');
    $scope.set = function(tpl) {
        $scope.url = '/static/tpl/' + tpl;
    };
    $scope.user = jsGen.global.user;
    if(!($scope.user && $scope.user.date)) jsGen.global.user = rest.home.get({}, function() {
        $scope.user = jsGen.global.user;
    });
    $scope.$on('update', function(event, doc) {
        event.stopPropagation();
        $scope.user = jsGen.lib.union($scope.user, doc);
    });
}];

jsGen.userViewCtrl = ['$scope', 'rest', '$location', '$routeParams', function($scope, rest, $location, $routeParams) {
    $scope.user = jsGen.cache.users.get('U' + $routeParams.id);
    //$scope.test = $location.absUrl();
    if(!$scope.user) $scope.user = rest.userView.get({
        Uid: 'U' + $routeParams.id
    }, function() {
        if($scope.user.err) $location.path('/');
        jsGen.cache.users.put($scope.user._id, $scope.user);
    });
}];
jsGen.adminCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    if(!(jsGen.global.user && jsGen.global.user.role === 'admin')) $location.path('/');
    $scope.set = function(tpl) {
        $scope.url = '/static/tpl/' + tpl;
    };
}];

jsGen.userAdminCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var result = {};
    $scope.pagination = {
        now: 1,
        total: 0,
        num: 20
    };
    $scope.$on('pagination', function(event, doc) {
        event.stopPropagation();
        result = rest.userAdmin.get(doc, function() {
            $scope.data = result.data;
            $scope.pagination = result.pagination;
        });
    });
    $scope.$emit('pagination', {
        n: $scope.pagination.num,
        p: $scope.pagination.now
    });
}];

jsGen.userEditCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var result = {};
    var tagsArray = [];
    function initTags(tagsList) {
        tagsArray = [];
        for (var i = tagsList.length - 1; i >= 0; i--) {
            tagsArray[i] = tagsList[i].tag;
        };
        $scope.tagsList = jsGen.lib.union(tagsArray);
        //$scope.tags = $scope.tagsList.join(' ');
    };
    $scope.sexArray = ['male', 'female'];
    $scope.user = jsGen.lib.union(jsGen.global.user);
    initTags($scope.user.tagsList);
    $scope.checkResult = false;
    $scope.user.err = null;
    $scope.checkTags = function() {
        if($scope.tagsList.length > (jsGen.global.UserTagsMax || 5)) $scope.tagsList.length = (jsGen.global.UserTagsMax || 5);
    };
    $scope.checkPwd = function() {
        if($scope.user.passwd2 !== $scope.user.passwd) $scope.checkResult = true;
        else $scope.checkResult = false;
    };
    $scope.submit = function() {
        var data = {};
        if($scope.user.passwd && $scope.user.passwd2 === $scope.user.passwd) data.passwd = CryptoJS.SHA256($scope.user.passwd).toString();
        if($scope.user.name !== jsGen.global.user.name) data.name = $scope.user.name;
        if($scope.user.email !== jsGen.global.user.email) data.email = $scope.user.email;
        if($scope.user.sex !== jsGen.global.user.sex) data.sex = $scope.user.sex;
        if($scope.user.avatar !== jsGen.global.user.avatar) data.avatar = $scope.user.avatar;
        if($scope.user.desc !== jsGen.global.user.desc) data.desc = $scope.user.desc;
        if(!angular.equals($scope.tagsList, tagsArray)) data.tagsList = $scope.tagsList;
        result = rest.home.save({}, data, function() {
            $scope.user = result;
            initTags($scope.user.tagsList);
            $scope.$emit('update', result);
        });
    };
}];

jsGen.adminGlobalCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var originData = {};
    $scope.global = rest.indexAdmin.get({}, function() {
        originData = jsGen.lib.union($scope.global);
    });
    $scope.global.err = null;
    $scope.submit = function() {
        var data = jsGen.lib.union($scope.global);
        angular.forEach(data.UsersScore, function(value, key) {
            data.UsersScore[key] = Number(value);
        });
        angular.forEach(data.ArticleStatus, function(value, key) {
            data.ArticleStatus[key] = Number(value);
        });
        angular.forEach(data.ArticleHots, function(value, key) {
            data.ArticleHots[key] = Number(value);
        });
        for(var key in data) {
            if(angular.equals(data[key], originData[key])) delete data[key];
        }
        $scope.global = rest.indexAdmin.save({}, data, function() {
            var clone = jsGen.lib.union(jsGen.global);
            jsGen.lib.intersect(clone, $scope.global);
            jsGen.lib.union(jsGen.global, clone);
        });
    };
}];

jsGen.paginationCtrl = ['$scope', function($scope) {
    $scope.paginationTo = function(to) {
        var p = 1;
        var params = {};
        var last = Math.ceil($scope.pagination.total / $scope.pagination.num);
        switch(to) {
        case 'first':
            p = 1;
            break;
        case 'prev':
            p = $scope.pagination.now - 1;
            if(p < 1) p = 1;
            break;
        case 'next':
            p = $scope.pagination.now + 1;
            if(p > last) p = last;
            break;
        case 'last':
            p = last;
            break;
        }
        params = {
            n: $scope.pagination.num,
            p: p
        };
        $scope.$emit('pagination', params);
    };
    $scope.setNum = function(num) {
        $scope.$emit('pagination', {
            n: num,
            p: 1
        });
    };
}];
