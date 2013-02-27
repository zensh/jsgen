'use strict';

/* Controllers */
jsGen.globalCtrl = ['$scope', 'rest', '$location', 'cache', function($scope, rest, $location, cache) {
    if(!jsGen.cache) jsGen.cache = cache;
    $scope.isAdmin = false;
    $scope.isLogin = false;
    if(!jsGen.global.date) jsGen.global = rest.index.get({}, function() {
        $scope.checkUser();
    });
    $scope.global = jsGen.global;

    $scope.logout = function() {
        var doc = rest.logout.get({}, function() {
            if(doc.logout) delete jsGen.global.user;
            $scope.checkUser();
            $location.path('/');
        });
    };
    $scope.clearUser = function() {
        delete jsGen.global.user;
    };
    $scope.checkUser = function() {
        if(jsGen.global.user && jsGen.global.user.role) {
            $scope.isLogin = true;
            if(jsGen.global.user.role === 'admin') $scope.isAdmin = true;
            else $scope.isAdmin = false;
        } else $scope.isLogin = false;
    }
}];

jsGen.IndexCtrl = ['$scope', 'rest', function($scope, rest) {}];

jsGen.userLoginCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var data = {};
    $scope.submit = function() {
        data.logname = $scope.logname;
        data.logpwd = CryptoJS.SHA256($scope.logpwd).toString();
        data.logpwd = CryptoJS.HmacSHA256(data.logpwd, data.logname).toString();
        jsGen.global.user = rest.login.save({}, data, function() {
            $scope.checkUser();
            if(!jsGen.global.user.err) $location.path('/home');
        });
    };
}];

jsGen.userRegisterCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var data = {};
    $scope.checkResult = true;
    $scope.checkPwd = function() {
        if($scope.passwd2 !== $scope.passwd) $scope.checkResult = true;
        else $scope.checkResult = false;
    };
    $scope.submit = function() {
        data.name = $scope.name;
        data.passwd = CryptoJS.SHA256($scope.passwd).toString();
        data.email = $scope.email;
        jsGen.global.user = rest.register.save({}, data, function() {
            $scope.checkUser();
            if(jsGen.global.user._id) $location.path('/home');
        });
    };
}];

jsGen.homeCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    if(!jsGen.global.user || !jsGen.global.user.name) $location.path('/');
    $scope.isMe = true;
    $scope.getTpl = '/static/tpl/user-index.html';
    $scope.setTpl = function(tpl) {
        $scope.getTpl = '/static/tpl/' + tpl;
    };
    $scope.user = jsGen.global.user;
    if(!$scope.user || !$scope.user.date) jsGen.global.user = rest.home.get({}, function() {
        $scope.user = jsGen.global.user;
    });
    $scope.$on('update', function(event, doc) {
        event.stopPropagation();
        $scope.user = jsGen.lib.union($scope.user, doc);
    });
}];

jsGen.userViewCtrl = ['$scope', 'rest', '$location', '$routeParams', function($scope, rest, $location, $routeParams) {
    $scope.user = jsGen.cache.users.get('U' + $routeParams.id);
    $scope.isMe = false;
    if(!$scope.user) $scope.user = rest.userView.get({
        Uid: 'U' + $routeParams.id
    }, function() {
        if($scope.user.err) $location.path('/');
        jsGen.cache.users.put($scope.user._id, $scope.user);
    });
}];
jsGen.adminCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    if(!(jsGen.global.user && jsGen.global.user.role === 'admin')) $location.path('/');
    $scope.getTpl = '/static/tpl/admin-index.html';
    $scope.setTpl = function(tpl) {
        $scope.getTpl = '/static/tpl/' + tpl;
    };
}];

jsGen.userIndexCtrl = ['$scope', 'rest', function($scope, rest) {}];

jsGen.userAdminCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var result = {},
        originData = {};
    $scope.roleArray = ['admin', 'editor', 'author', 'user', 'guest', 'forbid'];
    $scope.editEmail = false;
    $scope.editRole = false;
    $scope.editSave = false;
    $scope.pagination = {
        now: 1,
        total: 0,
        num: 20
    };
    $scope.$on('pagination', function(event, doc) {
        event.stopPropagation();
        result = rest.userAdmin.get(doc, function() {
            if(!result.err) {
                $scope.data = result.data;
                originData = jsGen.lib.union($scope.data);
                $scope.pagination = result.pagination;
            } else $scope.err = result.err;
        });
    });
    $scope.$emit('pagination', {
        n: $scope.pagination.num,
        p: $scope.pagination.now
    });
    $scope.$watch(function() {
        if(angular.equals($scope.data, originData)) $scope.editSave = false;
        else $scope.editSave = true;
    });
    $scope.reset = function() {
        $scope.data = jsGen.lib.union(originData);
        $scope.editEmail = false;
        $scope.editRole = false;
        $scope.editSave = false;
    };
    $scope.submit = function() {
        var defaultObj = [{
            _id: '',
            email: '',
            locked: false,
            role: ''
        }];
        $scope.editEmail = false;
        $scope.editRole = false;
        $scope.editSave = false;
        var data = jsGen.lib.union($scope.data);
        originData = jsGen.lib.intersect(jsGen.lib.union(defaultObj), originData);
        data = jsGen.lib.intersect(jsGen.lib.union(defaultObj), data);
        angular.forEach(data, function(value, key) {
            if(angular.equals(value, originData[key])) delete data[key];
        });
        jsGen.lib.complement(data, originData, [{_id:''}]);
        result = rest.userAdmin.save({}, {data: data}, function() {
            if(!result.err) {
                $scope.data = jsGen.lib.union(result.data);
                originData = jsGen.lib.union(result.data);
            } else $scope.err = result.err;
        });
    };
}];

jsGen.userEditCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var result = {},
        originData = {},
        tagsArray = [];
    function initTags(tagsList) {
        tagsArray = [];
        angular.forEach(tagsList, function(value, key) {
            tagsArray[key] = value.tag;
        });
        $scope.tagsList = jsGen.lib.union(tagsArray);
    };
    $scope.editSave = false;
    $scope.sexArray = ['male', 'female'];
    $scope.user = jsGen.lib.union(jsGen.global.user);
    originData = jsGen.lib.union(jsGen.global.user);
    initTags($scope.user.tagsList);
    $scope.checkResult = false;
    $scope.$watch(function() {
        if(angular.equals($scope.user, originData) && angular.equals($scope.tagsList, tagsArray)) $scope.editSave = false;
        else $scope.editSave = true;
    });
    $scope.checkTags = function() {
        if($scope.tagsList.length > (jsGen.global.UserTagsMax || 5)) $scope.tagsList.length = (jsGen.global.UserTagsMax || 5);
    };
    $scope.checkPwd = function() {
        if($scope.user.passwd2 !== $scope.user.passwd) $scope.checkResult = true;
        else $scope.checkResult = false;
    };
    $scope.reset = function() {
        $scope.user = jsGen.lib.union(originData);
        $scope.editSave = false;
    };
    $scope.submit = function() {
        var data = jsGen.lib.union($scope.user);
        $scope.editSave = false;
        angular.forEach(data, function(value, key) {
            if(angular.equals(value, originData[key])) delete data[key];
        });
        if($scope.user.passwd && $scope.user.passwd2 === $scope.user.passwd) data.passwd = CryptoJS.SHA256($scope.user.passwd).toString();
        if(!angular.equals($scope.tagsList, tagsArray)) data.tagsList = $scope.tagsList;
        $scope.user = rest.home.save({}, data, function() {
            if(!$scope.user.err) {
                originData = jsGen.lib.union($scope.user);
                $scope.user = jsGen.lib.union($scope.user);
                initTags($scope.user.tagsList);
                $scope.$emit('update', $scope.user);
            }
        });
    };
}];

jsGen.adminGlobalCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var originData = {};
    $scope.global = rest.indexAdmin.get({}, function() {
        $scope.global = jsGen.lib.union($scope.global);
        originData = jsGen.lib.union($scope.global);
    });
    $scope.editSave = false;
    $scope.switchTab = 'tab1';
    $scope.$watch(function() {
        if(angular.equals($scope.global, originData)) $scope.editSave = false;
        else $scope.editSave = true;
    });
    $scope.setTab = function(tab) {
        $scope.switchTab = tab;
    }
    $scope.setClass = function(b) {
        if(b) return 'btn-warning';
        else return 'btn-success';
    };
    $scope.reset = function() {
        $scope.global = jsGen.lib.union(originData);
        $scope.editSave = false;
    };
    $scope.submit = function() {
        var data = jsGen.lib.union($scope.global);
        $scope.editSave = false;
        angular.forEach(data.UsersScore, function(value, key) {
            data.UsersScore[key] = Number(value);
        });
        angular.forEach(data.ArticleStatus, function(value, key) {
            data.ArticleStatus[key] = Number(value);
        });
        angular.forEach(data.ArticleHots, function(value, key) {
            data.ArticleHots[key] = Number(value);
        });
        angular.forEach(data, function(value, key) {
            if(angular.equals(value, originData[key])) delete data[key];
        });
        $scope.global = rest.indexAdmin.save({}, data, function() {
            if(!$scope.global.err) {
                originData = jsGen.lib.union($scope.global);
                $scope.global = jsGen.lib.union($scope.global);
                var clone = jsGen.lib.union(jsGen.global);
                jsGen.lib.intersect(clone, $scope.global);
                jsGen.lib.union(jsGen.global, clone);
            }
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
