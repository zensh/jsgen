'use strict';
// 注册全局变量jsGen
var jsGen = {
    global: {}
};

/* Controllers */
jsGen.globalCtrl = ['$scope', 'rest', '$location', 'cache', function($scope, rest, $location, cache) {
    if (!jsGen.cache) jsGen.cache = cache;
    $scope.isAdmin = false;
    $scope.isLogin = false;
    if (!jsGen.global.date) jsGen.global = rest.index.get({}, function() {
        $scope.checkUser();
    });
    $scope.global = jsGen.global;
    $scope.logout = function() {
        var doc = rest.logout.get({}, function() {
            if (doc.logout) delete jsGen.global.user;
            $scope.checkUser();
            $location.path('/');
        });
    };
    $scope.clearUser = function() {
        delete jsGen.global.user;
    };
    $scope.checkUser = function() {
        if (jsGen.global.user && jsGen.global.user.role) {
            $scope.isLogin = true;
            if (jsGen.global.user.role === 'admin') $scope.isAdmin = true;
            else $scope.isAdmin = false;
        } else $scope.isLogin = false;
    };
    angular.element('a').attr('target', function() {
        if (this.host === location.host) return this.target;
        else return '_blank';
    });
}];

jsGen.IndexCtrl = ['$scope', 'rest', function($scope, rest) {}];

jsGen.userLoginCtrl = ['$scope', 'rest', '$location', '$timeout', function($scope, rest, $location, $timeout) {
    var request;
    $scope.header = '用户登录';
    $scope.request = undefined;
    $scope.userReset = undefined;
    $scope.isReset = undefined;
    $scope.isSubmit = undefined;
    var resetName = undefined;
    $scope.$watch(function() {
        if ($scope.isReset) {
            $scope.header = resetName;
            $scope.userReset = '返回登录';
        } else {
            $scope.header = '用户登录';
            $scope.userReset = resetName;
        }
    });
    $scope.submit = function() {
        var data = {}, result;
        $scope.isSubmit = true;
        data.logname = $scope.logname;
        data.logpwd = CryptoJS.SHA256($scope.logpwd).toString();
        data.logpwd = CryptoJS.HmacSHA256(data.logpwd, data.logname).toString();
        result = rest.login.save({}, data, function() {
            if (!result.err) {
                jsGen.global.user = jsGen.lib.union(result);
                $scope.checkUser();
                $location.path('/home');
            } else {
                $scope.err = result.err;
                $scope.isSubmit = false;
                if ($scope.err.name === 'locked') {
                    resetName = '申请解锁';
                    request = 'locked';
                } else if ($scope.err.name === 'passwd') {
                    resetName = '找回密码';
                    request = 'passwd';
                }
                $scope.userReset = resetName;
            }
        });
    };
    $scope.resetMe = function() {
        $scope.isSubmit = true;
        var result = rest.reset.save({}, {
            name: $scope.name,
            email: $scope.email,
            request: request
        }, function() {
            function locationTo() {
                    $scope.timeout -= 1;
                    if($scope.timeout < 0) return $location.path('/');
                    else return $timeout(locationTo, 1000);
            };
            if (!result.err) {
                $scope.request = result.request;
                $scope.timeout = 5;
                return locationTo();
            } else {
                $scope.err = result.err;
                $scope.isSubmit = false;
            }
        });
    };
}];

jsGen.userRegisterCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    $scope.checkResult = true;
    $scope.checkPwd = function() {
        if ($scope.passwd2 !== $scope.passwd) $scope.checkResult = true;
        else $scope.checkResult = false;
    };
    $scope.submit = function() {
        var data = {},
        result;
        data.name = $scope.name;
        data.passwd = CryptoJS.SHA256($scope.passwd).toString();
        data.email = $scope.email;
        result = rest.register.save({}, data, function() {
            if (!result.err) {
                jsGen.global.user = jsGen.lib.union(result);
                $scope.checkUser();
                $location.path('/home');
            } else $scope.err = result.err;
        });
    };
}];

jsGen.homeCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    if (!jsGen.global.user || !jsGen.global.user.name) $location.path('/');
    $scope.isMe = true;
    $scope.getTpl = '/static/tpl/user-index.html';
    $scope.setTpl = function(tpl) {
        $scope.getTpl = '/static/tpl/' + tpl;
    };
    $scope.user = jsGen.global.user;
    if (!$scope.user || !$scope.user.date) jsGen.global.user = rest.home.get({}, function() {
        $scope.user = jsGen.global.user;
    });
    $scope.$on('update', function(event, doc) {
        event.stopPropagation();
        $scope.user.tagsList = [];
        jsGen.lib.union($scope.user, doc);
    });
}];

jsGen.userViewCtrl = ['$scope', 'rest', '$location', '$routeParams', function($scope, rest, $location, $routeParams) {
    function getUser(callback) {
        var user = jsGen.cache.users.get('U' + $routeParams.id);
        if (user) return callback(user);
        else {
            user = rest.user.get({
                Uid: 'U' + $routeParams.id
            }, function() {
                if (!user.err) jsGen.cache.users.put(user._id, user);
                return callback(user)
            });
        }
    };
    $scope.isMe = false;
    $scope.isFollow = 'unfollow';
    getUser(function(user) {
        if (user.err) return $location.path('/');
        $scope.user = user;
        if (jsGen.global.user && jsGen.global.user.followList.some(function(x) {
            return x._id === user._id;
        })) {
            $scope.isFollow = 'follow';
        }
    });
    $scope.followMe = function() {
        var result;
        if ($scope.isFollow === 'follow') {
            result = rest.user.save({
                Uid: 'U' + $routeParams.id
            }, {follow: false}, function() {
                if (!result.err) {
                    jsGen.lib.union(jsGen.global.user.followList, result.followList);
                    $scope.user.fans -= 1;
                    $scope.isFollow = 'unfollow';
                }
            });
        } else if ($scope.isFollow === 'unfollow') {
            result = rest.user.save({
                Uid: 'U' + $routeParams.id
            }, {follow: true}, function() {
                if (!result.err) {
                    jsGen.lib.union(jsGen.global.user.followList, result.followList);
                    $scope.user.fans += 1;
                    $scope.isFollow = 'follow';
                }
            });
        }
    };
}];
jsGen.adminCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    if (!(jsGen.global.user && jsGen.global.user.role === 'admin')) $location.path('/');
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
            if (!result.err) {
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
        if (angular.equals($scope.data, originData)) $scope.editSave = false;
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
            if (angular.equals(value, originData[key])) delete data[key];
        });
        jsGen.lib.complement(data, originData, [{
            _id: ''
        }]);
        result = rest.userAdmin.save({}, {
            data: data
        }, function() {
            if (!result.err) {
                $scope.data = jsGen.lib.union(result.data);
                originData = jsGen.lib.union(result.data);
                $scope.request = '修改成功！';
            } else $scope.err = result.err;
        });
    };
}];

jsGen.userEditCtrl = ['$scope', 'rest', '$location', function($scope, rest, $location) {
    var originData = {},
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
        if (angular.equals($scope.user, originData) && angular.equals($scope.tagsList, tagsArray)) $scope.editSave = false;
        else $scope.editSave = true;
    });
    $scope.checkTags = function() {
        if ($scope.tagsList.length > (jsGen.global.UserTagsMax || 5)) $scope.tagsList.length = (jsGen.global.UserTagsMax || 5);
    };
    $scope.checkPwd = function() {
        if ($scope.user.passwd2 !== $scope.user.passwd) $scope.checkResult = true;
        else $scope.checkResult = false;
    };
    $scope.reset = function() {
        $scope.user = jsGen.lib.union(originData);
        $scope.editSave = false;
    };
    $scope.submit = function() {
        var result, changeEmail,
        data = jsGen.lib.union($scope.user);
        $scope.editSave = false;
        angular.forEach(data, function(value, key) {
            if (angular.equals(value, originData[key])) delete data[key];
        });
        if ($scope.user.passwd && $scope.user.passwd2 === $scope.user.passwd) data.passwd = CryptoJS.SHA256($scope.user.passwd).toString();
        if (!angular.equals($scope.tagsList, tagsArray)) data.tagsList = $scope.tagsList;
        if(data.email) {
            changeEmail = rest.reset.save({}, {
                email: data.email,
                request: 'email'
            }, function() {
                if (!changeEmail.err) {
                    jsGen.lib.union(originData, {email: data.email});
                    $scope.request = changeEmail.request;
                } else $scope.err = changeEmail.err;
            });
        }
        delete data.email;
        if (!angular.equals(data, {})) {
            result = rest.home.save({}, data, function() {
                if (!result.err) {
                    jsGen.lib.union($scope.user, result);
                    originData = jsGen.lib.union($scope.user);
                    initTags($scope.user.tagsList);
                    $scope.$emit('update', result);
                    $scope.request = '修改成功！';
                } else $scope.err = result.err;
            });
        }
    };
}];

jsGen.addArticleCtrl = ['$scope', 'rest', '$location', '$filter', function($scope, rest, $location, $filter) {
    $scope.titleBytes = 0;
    $scope.contentBytes = 0;
    $scope.markdownHelp = false;
    $scope.checkTitle = function() {
        $scope.titleBytes = $filter('length')($scope.title);
        //$scope.filterTitle = $sanitize($scope.title);
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
        if (angular.equals($scope.global, originData)) $scope.editSave = false;
        else $scope.editSave = true;
    });
    $scope.setTab = function(tab) {
        $scope.switchTab = tab;
        $scope.err = null;
        $scope.request = null;
    }
    $scope.setClass = function(b) {
        if (b) return 'btn-warning';
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
            if (angular.equals(value, originData[key])) delete data[key];
        });
        var result = rest.indexAdmin.save({}, data, function() {
            if (!result.err) {
                $scope.global = jsGen.lib.union(result);
                originData = jsGen.lib.union(result);
                var clone = jsGen.lib.union(jsGen.global);
                jsGen.lib.intersect(clone, $scope.global);
                jsGen.lib.union(jsGen.global, clone);
                $scope.request = '修改成功！';
            } else $scope.err = result.err;
        });
    };
}];

jsGen.paginationCtrl = ['$scope', function($scope) {
    $scope.paginationTo = function(to) {
        var p = 1;
        var params = {};
        var last = Math.ceil($scope.pagination.total / $scope.pagination.num);
        switch (to) {
            case 'first':
                p = 1;
                break;
            case 'prev':
                p = $scope.pagination.now - 1;
                if (p < 1) p = 1;
                break;
            case 'next':
                p = $scope.pagination.now + 1;
                if (p > last) p = last;
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

//添加jsGen.lib系列工具函数
(function() {
    function checkType(obj) {
        var type = typeof obj;
        if (obj === null) return 'null';
        if (type !== 'object') return type;
        if (Array.isArray(obj)) return 'array';
        return type;
    };

    function equal(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    };

    //深度并集复制，若同时提供参数 a 对象和 b 对象，则将 b 对象所有属性（原始类型，忽略函数）复制给 a对象（同名则覆盖），
    //返回值为深度复制了 b 后的 a，注意 a 和 b 必须同类型;
    //若只提供参数 a，则 union 函数返回 a 的克隆，与JSON.parse(JSON.stringify(a))相比，克隆效率略高。

    function union(a, b) {
        if (b === undefined) {
            var s, type = checkType(a);
            if (type === 'object') s = {};
            else if (type === 'array') s = [];
            else if (type === 'function') return undefined;
            else return a;
            for (var key in a) {
                if (!a.hasOwnProperty(key)) continue;
                if (typeof a[key] === 'object' && a[key] !== null) {
                    s[key] = union(a[key]);
                } else s[key] = a[key];
            }
            return s;
        }
        if (checkType(a) !== checkType(b)) return a;
        for (var key in b) {
            if (!b.hasOwnProperty(key)) continue;
            var typeBkey = checkType(b[key]);
            if (typeBkey === 'object') {
                if (checkType(a[key]) !== 'object') a[key] = {};
                union(a[key], b[key]);
            } else if (typeBkey === 'array') {
                if (checkType(a[key]) !== 'array') a[key] = [];
                union(a[key], b[key]);
            } else if (typeBkey !== 'function') a[key] = b[key];
        }
        return a;
    };

    //深度交集复制，用于对象校检赋值。即以 a 为模板，当a 和 b 共有属性且属性值类型一致时，将 b 的属性值复制给 a，对于 a 有 b 没有或 b 有 a 没有的属性，均删除，返回相交复制后的 a;
    // var a = {q:0,w:'',e:{a:0,b:[0,0,0]}}, b = {r:10,w:'hello',e:{a:99,b:[1,2,3,4,5]}};
    // intersect(a, b);  // a 变成{w:'hello',e:{a:99,b:[1,2,3]}}
    //如果 a 的某属性是数组，且只有一个值，则以它为模板，将 b 对应的该属性的数组的值校检比复制
    // var a = {q:0,w:'',e:{a:0,b:[0]}}, b = {r:10,w:'hello',e:{a:99,b:[1,2,3,4,5]}};
    // intersect(a, b);  // a 变成{w:'hello',e:{a:99,b:[1,2,3,4,5]}} 注意a.e.b与上面的区别

    function intersect(a, b) {
        if (a && b) {
            var typeA = checkType(a),
                typeB = checkType(b);
            if (typeA === 'array' && typeB === 'array' && a.length <= 1) {
                if (a.length === 0) union(a, b);
                else {
                    var o = union(a[0]);
                    var typeAkey = checkType(a[0]);
                    if (typeAkey !== 'function') {
                        for (var i = b.length; i > 0; i--) {
                            typeBkey = checkType(b[i]);
                            if (typeBkey === typeAkey) {
                                if (typeBkey === 'object' || typeBkey === 'array') {
                                    a[i] = union(o);
                                    intersect(a[i], b[i]);
                                } else a[i] = b[i];
                            }
                        }
                    }
                }
            } else if (typeA === 'object' && typeB === 'object' && Object.keys(a).length === 0) {
                union(a, b);
            } else {
                for (var key in a) {
                    var typeBkey = checkType(b[key]);
                    if (b.hasOwnProperty(key) && checkType(a[key]) === typeBkey && typeBkey !== 'function') {
                        if (typeBkey === 'object' || typeBkey === 'array') {
                            intersect(a[key], b[key]);
                        } else a[key] = b[key];
                    } else delete a[key];
                }
            }
            digestArray(a);
        }
        return a;
    };

    //深度补集运算，用于获取对象修改后的值。a为目标对象，b为对比对象。
    //a的某属性值与b的对应属性值全等时，删除a的该属性，运算直接修改a，返回值也是a。
    //ignore，不参与对比的属性模板;
    //keyMode为true时，对属性进行补集元算，即a的属性名在b中也存在时，则删除a中该属性。

    function complement(a, b, ignore, keyMode) {
        if (a && b) {
            var typeA = checkType(a),
                typeB = checkType(b),
                ignore = ignore || undefined;
            keyMode = keyMode || undefined;
            if (typeA !== typeB || (typeA !== 'object' && typeA !== 'array')) return a;
            if (ignore) {
                if (typeof ignore === 'object') {
                    return complement(a, complement(b, ignore, true), keyMode);
                } else {
                    if (!keyMode) keyMode = true;
                }
            }
            if (!keyMode) {
                if (typeB === 'array' && b.length === 1) {
                    var o = union(b[0]);
                    for (var i = a.length; i > 0; i--) {
                        if (a[i] === o) delete a[i];
                        else if (o && typeof o === 'object') complement(a[i], o);
                    }
                } else {
                    for (var key in a) {
                        if (a[key] === b[key]) delete a[key];
                        else if (b[key] && typeof b[key] === 'object') complement(a[key], b[key]);
                    }
                }
            } else {
                if (typeB === 'array' && b.length === 1) {
                    var o = union(b[0]);
                    for (var i = a.length; i > 0; i--) {
                        if (o && typeof o === 'object') complement(a[i], o, true);
                        else if (typeof a[i] === typeof o) delete a[i];
                    }
                } else {
                    for (var key in a) {
                        if (b[key] && typeof b[key] === 'object') complement(a[key], b[key], true);
                        else if (typeof a[key] === typeof b[key]) delete a[key];
                    }
                }
            }
            digestArray(a);
        }
        return a;
    };
    //数组去重，返回新数组，新数组中没有重复值。

    function uniqueArray(a) {
        if (!Array.isArray(a)) return a;

        var o = {},
        re = [];
        for (var i = a.length - 1; i >= 0; i--) {
            if (o[typeof a[i] + a[i]] !== 1) {
                o[typeof a[i] + a[i]] = 1;
                re.push(a[i]);
            }
        };

        return re.reverse();
    };
    //数组去undefined，修改原数组，去除undefined值的元素。

    function digestArray(a) {
        if (!Array.isArray(a)) return a;
        for (var i = a.length - 1; i >= 0; i--) {
            if (a[i] === undefined) a.splice(i, 1);
        };
        return a;
    };

    if (!this.lib) this.lib = {};
    this.lib.checkType = checkType;
    this.lib.equal = equal;
    this.lib.union = union;
    this.lib.intersect = intersect;
    this.lib.complement = complement;
    this.lib.uniqueArray = uniqueArray;
    this.lib.digestArray = digestArray;
    return this;
}).call(jsGen);
