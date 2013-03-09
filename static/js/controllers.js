'use strict';
// 注册全局变量jsGen
var jsGen = {
    global: {}
};

/* Controllers */
jsGen.globalCtrl = ['$scope', '$http', '$location', '$timeout', '$filter', 'cache', 'rest', function($scope, $http, $location, $timeout, $filter, cache, rest) {
    jsGen.http = jsGen.http || $http;
    jsGen.location = jsGen.location || $location;
    jsGen.timeout = jsGen.timeout || $timeout;
    jsGen.filter = jsGen.filter || $filter;
    jsGen.cache = jsGen.cache || cache;
    jsGen.rest = jsGen.rest || rest;

    $scope.isAdmin = false;
    $scope.isLogin = false;
    if (!jsGen.global.date) jsGen.global = jsGen.rest.index.get({}, function() {
        $scope.checkUser();
        jsGen.global.info.angularjs = angular.version.full;
        jsGen.global.ArticleTagsMax = jsGen.global.ArticleTagsMax || 5;
        jsGen.global.UserTagsMax = jsGen.global.UserTagsMax || 5;
        jsGen.global.TitleMinLen = jsGen.global.TitleMinLen || 9;
        jsGen.global.TitleMaxLen = jsGen.global.TitleMaxLen || 180;
        jsGen.global.SummaryMaxLen = jsGen.global.SummaryMaxLen || 480;
        jsGen.global.ContentMinLen = jsGen.global.ContentMinLen || 18;
        jsGen.global.ContentMaxLen = jsGen.global.ContentMaxLen || 50000;
        jsGen.global.UserNameMinLen = jsGen.global.UserNameMinLen || 5;
        jsGen.global.UserNameMaxLen = jsGen.global.UserNameMaxLen || 20;
    });
    $scope.global = jsGen.global;
    $scope.logout = function() {
        var doc = jsGen.rest.logout.get({}, function() {
            if (doc.logout) delete jsGen.global.user;
            $scope.checkUser();
            jsGen.location.path('/');
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

jsGen.IndexCtrl = ['$scope', function($scope) {}];

jsGen.userLoginCtrl = ['$scope', function($scope) {
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
        result = jsGen.rest.login.save({}, data, function() {
            if (!result.err) {
                jsGen.global.user = jsGen.union(result);
                $scope.checkUser();
                jsGen.location.path('/home');
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
        var result = jsGen.rest.reset.save({}, {
            name: $scope.name,
            email: $scope.email,
            request: request
        }, function() {
            function locationTo() {
                $scope.timeout -= 1;
                if ($scope.timeout < 0) return jsGen.location.path('/');
                else return jsGen.timeout(locationTo, 1000);
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

jsGen.userRegisterCtrl = ['$scope', function($scope) {
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
        result = jsGen.rest.register.save({}, data, function() {
            if (!result.err) {
                jsGen.global.user = jsGen.union(result);
                $scope.checkUser();
                jsGen.location.path('/home');
            } else $scope.err = result.err;
        });
    };
}];

jsGen.homeCtrl = ['$scope', function($scope) {
    if (!jsGen.global.user || !jsGen.global.user.name) jsGen.location.path('/');
    $scope.isMe = true;
    $scope.getTpl = '/static/tpl/user-index.html';
    $scope.setTpl = function(tpl) {
        $scope.getTpl = '/static/tpl/' + tpl;
    };
    $scope.user = jsGen.global.user;
    if (!$scope.user || !$scope.user.date) jsGen.global.user = jsGen.rest.home.get({}, function() {
        $scope.user = jsGen.global.user;
    });
    $scope.$on('update', function(event, doc) {
        event.stopPropagation();
        $scope.user.tagsList = [];
        jsGen.union($scope.user, doc);
    });
}];

jsGen.userCtrl = ['$scope', '$routeParams', function($scope, $routeParams) {
    function getUser(callback) {
        var user = jsGen.cache.user.get('U' + $routeParams.ID);
        if (user) return callback(user);
        else {
            user = jsGen.rest.user.get({
                Uid: 'U' + $routeParams.ID
            }, function() {
                if (!user.err) jsGen.cache.user.put(user._id, user);
                return callback(user);
            });
        }
    };
    $scope.isMe = false;
    $scope.isFollow = false;
    getUser(function(user) {
        if (user.err) return jsGen.location.path('/');
        $scope.user = user;
        if (jsGen.global.user) {
            $scope.isFollow = jsGen.global.user.followList.some(function(x) {
                return x._id === user._id;
            });
        }
    });
    $scope.followMe = function(id) {
        var result;
        if ($scope.isFollow) {
            result = jsGen.rest.user.save({
                Uid: id
            }, {
                follow: false
            }, function() {
                if (!result.err) {
                    jsGen.union(jsGen.global.user.followList, result.followList);
                    $scope.user.fans -= 1;
                    $scope.isFollow = false;
                }
            });
        } else {
            result = jsGen.rest.user.save({
                Uid: id
            }, {
                follow: true
            }, function() {
                if (!result.err) {
                    jsGen.union(jsGen.global.user.followList, result.followList);
                    $scope.user.fans += 1;
                    $scope.isFollow = true;
                }
            });
        }
    };
}];
jsGen.adminCtrl = ['$scope', function($scope) {
    if (!(jsGen.global.user && jsGen.global.user.role === 'admin')) jsGen.location.path('/');
    $scope.getTpl = '/static/tpl/admin-index.html';
    $scope.setTpl = function(tpl) {
        $scope.getTpl = '/static/tpl/' + tpl;
    };
}];

jsGen.userIndexCtrl = ['$scope', function($scope) {}];

jsGen.userAdminCtrl = ['$scope', function($scope) {
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
        result = jsGen.rest.userAdmin.get(doc, function() {
            if (!result.err) {
                $scope.data = result.data;
                originData = jsGen.union($scope.data);
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
        $scope.data = jsGen.union(originData);
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
        var data = jsGen.union($scope.data);
        originData = jsGen.intersect(jsGen.union(defaultObj), originData);
        data = jsGen.intersect(jsGen.union(defaultObj), data);
        angular.forEach(data, function(value, key) {
            if (angular.equals(value, originData[key])) delete data[key];
        });
        jsGen.complement(data, originData, [{
            _id: ''
        }]);
        result = jsGen.rest.userAdmin.save({}, {
            data: data
        }, function() {
            if (!result.err) {
                $scope.data = jsGen.union(result.data);
                originData = jsGen.union(result.data);
                $scope.request = '修改成功！';
            } else $scope.err = result.err;
        });
    };
}];

jsGen.userEditCtrl = ['$scope', function($scope) {
    var originData = {},
    tagsArray = [];

    function initTags(tagsList) {
        tagsArray = [];
        angular.forEach(tagsList, function(value, key) {
            tagsArray[key] = value.tag;
        });
        $scope.tagsList = jsGen.union(tagsArray);
    };
    $scope.editSave = false;
    $scope.sexArray = ['male', 'female'];
    $scope.user = jsGen.union(jsGen.global.user);
    originData = jsGen.union(jsGen.global.user);
    initTags($scope.user.tagsList);
    $scope.checkResult = false;
    var sanitize = new Sanitize(Sanitize.Config.BASIC);

    function sanitizeHTML(html, sanitize) {
        var dom = document.createElement('div');
        var dom2 = document.createElement('div');
        dom.innerHTML = html;
        dom2.appendChild(sanitize.clean_node(dom));
        return dom2.innerHTML;
    };
    $scope.$watch(function() {
        if (angular.equals($scope.user, originData) && angular.equals($scope.tagsList, tagsArray)) $scope.editSave = false;
        else $scope.editSave = true;
    });
    $scope.checkTags = function() {
        if ($scope.tagsList.length > jsGen.global.UserTagsMax) $scope.tagsList = $scope.tagsList.slice(0, jsGen.global.UserTagsMax);
    };
    $scope.checkPwd = function() {
        if ($scope.user.passwd2 !== $scope.user.passwd) $scope.checkResult = true;
        else $scope.checkResult = false;
    };
    $scope.checkDesc = function() {
        $scope.descBytes = jsGen.filter('length')($scope.desc);
    };
    $scope.reset = function() {
        $scope.user = jsGen.union(originData);
        $scope.editSave = false;
    };
    $scope.submit = function() {
        var result, changeEmail,
        data = jsGen.union($scope.user);
        $scope.editSave = false;
        angular.forEach(data, function(value, key) {
            if (angular.equals(value, originData[key])) delete data[key];
        });
        if ($scope.user.desc) $scope.user.desc = sanitizeHTML(marked($scope.user.desc), sanitize)
        if ($scope.user.passwd && $scope.user.passwd2 === $scope.user.passwd) data.passwd = CryptoJS.SHA256($scope.user.passwd).toString();
        if (!angular.equals($scope.tagsList, tagsArray)) data.tagsList = $scope.tagsList;
        if (data.email) {
            changeEmail = jsGen.rest.reset.save({}, {
                email: data.email,
                request: 'email'
            }, function() {
                if (!changeEmail.err) {
                    jsGen.union(originData, {
                        email: data.email
                    });
                    $scope.request = changeEmail.request;
                } else $scope.err = changeEmail.err;
            });
        }
        delete data.email;
        if (!angular.equals(data, {})) {
            result = jsGen.rest.home.save({}, data, function() {
                if (!result.err) {
                    jsGen.union($scope.user, result);
                    originData = jsGen.union($scope.user);
                    initTags($scope.user.tagsList);
                    $scope.$emit('update', result);
                    $scope.request = '修改成功！';
                } else $scope.err = result.err;
            });
        }
    };
}];

jsGen.articleCtrl = ['$scope', '$routeParams', function($scope, $routeParams) {
    function getArticle(callback) {
        var article = jsGen.cache.article.get('A' + $routeParams.ID);
        if (article) return callback(article);
        else {
            article = jsGen.rest.article.get({
                ID: 'A' + $routeParams.ID
            }, function() {
                if (!article.err) jsGen.cache.article.put(article._id, article);
                return callback(article);
            });
        }
    };
    function parseDOM(html, element) {
        angular.element(element).html(marked(html));
        angular.element(element + ' > pre').addClass('prettyprint linenums');
        angular.element(element + ' > code').addClass('prettyprint');
    };
    $scope.isFollow = false;
    $scope.isFavor = false;
    $scope.isOppose = false;
    $scope.isCollector = false;
    getArticle(function(article) {
        if (article.err) return ($scope.err = article.err);
        $scope.article = article;
        if (jsGen.global.user) {
            $scope.isFollow = jsGen.global.user.followList.some(function(x) {
                return x._id === jsGen.global.user._id;
            });
            $scope.isCollector = jsGen.global.user.collectList.some(function(x) {
                return x._id === article._id;
            });
        }
        if (!$scope.isOppose && article.favorList) $scope.isFavor = article.favorList.some(function(x) {
            return x._id === jsGen.global.user._id;
        });
        if (!$scope.isFavor && article.opposeList) $scope.isOppose = article.opposeList.some(function(x) {
            return x._id === jsGen.global.user._id;
        });
        $scope.$apply();
        parseDOM(article.content, '#' + article._id + ' > .media-content');
        for (var i = 0, len = article.commentsList.length - 1; i <= len; i++) {
            parseDOM(article.commentsList[i].content, '#' + article.commentsList[i]._id + ' > .media-content');
        }
        prettyPrint();
    });
    $scope.followMe = function(id) {
        var result;
        if ($scope.isFollow) {
            result = jsGen.rest.user.save({
                Uid: id
            }, {
                follow: false
            }, function() {
                if (!result.err) {
                    jsGen.union(jsGen.global.user.followList, result.followList);
                    $scope.user.fans -= 1;
                    $scope.isFollow = false;
                }
            });
        } else {
            result = jsGen.rest.user.save({
                Uid: id
            }, {
                follow: true
            }, function() {
                if (!result.err) {
                    jsGen.union(jsGen.global.user.followList, result.followList);
                    $scope.user.fans += 1;
                    $scope.isFollow = true;
                }
            });
        }
    };

}];

jsGen.addArticleCtrl = ['$scope', function($scope) {
    if (!$scope.isLogin) jsGen.location.path('/');
    $scope.previewTitle = '文章预览';
    $scope.markdownHelp = null;
    $scope.titleBytes = 0;
    $scope.contentBytes = 0;
    $scope.title = '';
    $scope.content = '';
    $scope.tagsList = [];
    $scope.editSave = false;

    function getMD() {
        jsGen.http.get('/static/md/markdown.md', {
            cache: true
        }).success(function(data, status) {
            if (!data.err) {
                $scope.previewTitle = 'Markdown简明语法';
                $scope.markdownHelp = marked(data);
                angular.element('#wmd-title').html($scope.previewTitle);
                angular.element('#wmd-help').html($scope.markdownHelp);
                angular.element('#wmd-help > pre').addClass('prettyprint linenums');
                angular.element('#wmd-help > code').addClass('prettyprint');
                prettyPrint();
            } else $scope.err = data.err;
        });
    };
    var sanitize0 = new Sanitize({});
    var sanitize = new Sanitize(Sanitize.Config.RELAXED);

    function sanitizeHTML(html, sanitize) {
        var dom = document.createElement('div');
        var dom2 = document.createElement('div');
        dom.innerHTML = html;
        dom2.appendChild(sanitize.clean_node(dom));
        return dom2.innerHTML;
    };
    var MdEditor = new Markdown.Editor({
        makeHtml: function(text) {
            return sanitizeHTML(marked(text), sanitize);
        }
    });
    MdEditor.hooks.chain("onPreviewRefresh", function() {
        angular.element('#wmd-preview > pre').addClass('prettyprint linenums');
        angular.element('#wmd-preview > code').addClass('prettyprint');
        prettyPrint();
    });
    MdEditor.run();
    getMD();
    $scope.$watch('title', function() {
        if (typeof $scope.title !== 'string') $scope.title = '';
        $scope.titleBytes = jsGen.filter('length')($scope.title);
        while ($scope.titleBytes > $scope.global.TitleMaxLen) {
            $scope.title = $scope.title.slice(0, -1);
            $scope.titleBytes = jsGen.filter('length')($scope.title);
        }
        if ($scope.titleBytes >= jsGen.global.TitleMinLen && $scope.titleBytes <= jsGen.global.TitleMaxLen &&
        $scope.contentBytes >= jsGen.global.ContentMinLen && $scope.contentBytes <= jsGen.global.ContentMaxLen) $scope.editSave = true;
        else $scope.editSave = false;
        if (!$scope.markdownHelp) {
            $scope.previewTitle = $scope.title;
            angular.element('#wmd-title').html($scope.previewTitle);
        }
    });
    $scope.$watch('content', function() {
        if (typeof $scope.content !== 'string') $scope.content = '';
        $scope.contentBytes = jsGen.filter('length')($scope.content);
         if ($scope.titleBytes >= jsGen.global.TitleMinLen && $scope.titleBytes <= jsGen.global.TitleMaxLen &&
        $scope.contentBytes >= jsGen.global.ContentMinLen && $scope.contentBytes <= jsGen.global.ContentMaxLen) $scope.editSave = true;
         else $scope.editSave = false;
    });
    $scope.wmdHelp = function(s) {
        if (s === 'preview') {
            $scope.markdownHelp = null;
            $scope.previewTitle = sanitizeHTML(($scope.title || '文章预览'), sanitize0);
            angular.element('#wmd-title').html($scope.previewTitle);
            MdEditor.refreshPreview();
        } else getMD();
    };
    $scope.getTag = function(n) {
        var tag = $scope.global.tagsList[n].tag;
        if ($scope.tagsList.indexOf(tag) === -1 && $scope.tagsList.length < jsGen.global.ArticleTagsMax) $scope.tagsList = $scope.tagsList.concat(tag); // 此处push方法不会更新tagsList视图
    };
    $scope.checkTags = function() {
        if ($scope.tagsList.length > jsGen.global.ArticleTagsMax) $scope.tagsList = $scope.tagsList.slice(0, jsGen.global.ArticleTagsMax);
    };
    $scope.submit = function() {
        if (!$scope.editSave) return;
        var data = {};
        data.content = sanitizeHTML($scope.content, sanitize);
        data.title = sanitizeHTML($scope.title.trim(), sanitize0);
        data.tagsList = $scope.tagsList;
        data.refer = $scope.refer;
        var result = jsGen.rest.article.save({}, data, function() {
            if (!result.err) {
                jsGen.cache.article.put(result._id, result);
                jsGen.location.path('/' + result._id);
            } else $scope.err = result.err;
        });
    };
}];

jsGen.adminGlobalCtrl = ['$scope', function($scope) {
    var originData = {};
    $scope.global = jsGen.rest.indexAdmin.get({}, function() {
        $scope.global = jsGen.union($scope.global);
        originData = jsGen.union($scope.global);
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
        $scope.global = jsGen.union(originData);
        $scope.editSave = false;
    };
    $scope.submit = function() {
        var data = jsGen.union($scope.global);
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
        var result = jsGen.rest.indexAdmin.save({}, data, function() {
            if (!result.err) {
                $scope.global = jsGen.union(result);
                originData = jsGen.union(result);
                var clone = jsGen.union(jsGen.global);
                jsGen.intersect(clone, $scope.global);
                jsGen.union(jsGen.global, clone);
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

//添加jsGen系列工具函数
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

    //深度并集复制，用于数据对象复制、数据对象更新，若同时提供参数 a 对象和 b 对象，则将 b 对象所有属性（原始类型，忽略函数）复制给 a对象（同名则覆盖），
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

    //深度交集复制，用于数据对象校验，即以 a 为模板，当a 和 b 共有属性且属性值类型一致时，将 b 的属性值复制给 a，对于 a 有 b 没有或 b 有 a 没有的属性，均删除，返回相交复制后的 a;
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
                        for (var i = b.length - 1; i >= 0; i--) {
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
                    for (var i = a.length - 1; i >= 0; i--) {
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
                    for (var i = a.length - 1; i >= 0; i--) {
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

    this.checkType = this.checkType || checkType;
    this.equal = this.equal || equal;
    this.union = this.union || union;
    this.intersect = this.intersect || intersect;
    this.complement = this.complement || complement;
    this.uniqueArray = this.uniqueArray || uniqueArray;
    this.digestArray = this.digestArray || digestArray;
    return this;
}).call(jsGen);
