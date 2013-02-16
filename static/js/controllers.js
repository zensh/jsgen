'use strict';

/* Controllers */
var jsGen = {
    global: {}
};

(function() {
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

    this.checkClass = checkClass;
    this.merge = merge;
    return this;
}).call(jsGen);

jsGen.globalCtrl = ['$scope', 'rest', '$location', 'cache', function($scope, rest, $location, cache) {
    if(!jsGen.cache) jsGen.cache = cache;
    if(!jsGen.global.date) jsGen.global = rest.global.get({}, function() {
        if(jsGen.global.user) {
            if(jsGen.global.user.role === 'admin') jsGen.global.user.adminUrl = '/admin';
            else jsGen.global.user.adminUrl = '/home';
        }
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

jsGen.IndexCtrl = ['$scope', 'rest', function($scope, rest) {

}];

jsGen.UserLoginCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
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

jsGen.UserRegisterCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var data = {};
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
        $scope.user = jsGen.merge($scope.user, doc);
    });
}];

jsGen.UserViewCtrl = ['$scope', 'rest', '$location', '$routeParams', function($scope, rest, $location, $routeParams) {
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

jsGen.UserAdminCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
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

jsGen.UserEditCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var result = {};
    var tagsArray = [];
    function initTags(tagsList) {
        tagsArray = [];
        for (var i = tagsList.length - 1; i >= 0; i--) {
            tagsArray[i] = tagsList[i].tag;
        };
        $scope.tagsList = jsGen.merge(tagsArray);
        $scope.tags = $scope.tagsList.join(' ');
    };
    $scope.sexArray = ['male', 'female'];
    $scope.user = jsGen.merge(jsGen.global.user);
    initTags($scope.user.tagsList);
    $scope.checkResult = true;
    $scope.user.err = null;
    $scope.convertTags = function() {
        $scope.tagsList = $scope.tags.split(/[,，\s]/, (jsGen.global.UserTagsMax || 5));
    };
    $scope.checkPwd = function() {
        if($scope.user.passwd2 !== $scope.user.passwd) $scope.checkResult = false;
        else $scope.checkResult = true;
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
