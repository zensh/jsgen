'use strict';

/* Controllers */
angular.module('jsGen.controllers', []).
controller('indexCtrl', ['$scope', function($scope) {
}]).
controller('userLoginCtrl', ['$scope', function($scope) {
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
                $scope.global.user = jsGen.union(result);
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
}]).
controller('userRegisterCtrl', ['$scope', function($scope) {
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
                $scope.global.user = jsGen.union(result);
                $scope.checkUser();
                jsGen.location.path('/home');
            } else $scope.err = result.err;
        });
    };
}]).
controller('homeCtrl', ['$scope', function($scope) {
    if (!$scope.global.user || !$scope.global.user.name) jsGen.location.path('/');
    $scope.isMe = true;
    $scope.getTpl = '/static/tpl/user-index.html';
    $scope.setTpl = function(tpl) {
        $scope.getTpl = '/static/tpl/' + tpl;
    };
    $scope.user = $scope.global.user;
    if (!$scope.user || !$scope.user.date) $scope.global.user = jsGen.rest.home.get({}, function() {
        $scope.user = $scope.global.user;
    });
    $scope.$on('update', function(event, doc) {
        event.stopPropagation();
        $scope.user.tagsList = [];
        jsGen.union($scope.user, doc);
    });
}]).
controller('userCtrl', ['$scope', '$routeParams', function($scope, $routeParams) {
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
        if ($scope.global.user) {
            $scope.isFollow = $scope.global.user.followList.some(function(x) {
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
                    jsGen.union($scope.global.user.followList, result.followList);
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
                    jsGen.union($scope.global.user.followList, result.followList);
                    $scope.user.fans += 1;
                    $scope.isFollow = true;
                }
            });
        }
    };
}]).
controller('adminCtrl', ['$scope', function($scope) {
    if (!($scope.global.user && $scope.global.user.role === 'admin')) jsGen.location.path('/');
    $scope.getTpl = '/static/tpl/admin-index.html';
    $scope.setTpl = function(tpl) {
        $scope.getTpl = '/static/tpl/' + tpl;
    };
}]).
controller('userIndexCtrl', ['$scope', function($scope) {
}]).
controller('userAdminCtrl', ['$scope', function($scope) {
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
}]).
controller('userEditCtrl', ['$scope', function($scope) {
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
    $scope.user = jsGen.union($scope.global.user);
    originData = jsGen.union($scope.global.user);
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
        if ($scope.tagsList.length > $scope.global.UserTagsMax) $scope.tagsList = $scope.tagsList.slice(0, $scope.global.UserTagsMax);
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
}]).
controller('articleCtrl', ['$scope', '$routeParams', function($scope, $routeParams) {
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
        if ($scope.global.user) {
            $scope.isFollow = $scope.global.user.followList.some(function(x) {
                return x._id === $scope.global.user._id;
            });
            $scope.isCollector = $scope.global.user.collectList.some(function(x) {
                return x._id === article._id;
            });
        }
        if (!$scope.isOppose && article.favorList) $scope.isFavor = article.favorList.some(function(x) {
            return x._id === $scope.global.user._id;
        });
        if (!$scope.isFavor && article.opposeList) $scope.isOppose = article.opposeList.some(function(x) {
            return x._id === $scope.global.user._id;
        });
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
                    jsGen.union($scope.global.user.followList, result.followList);
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
                    jsGen.union($scope.global.user.followList, result.followList);
                    $scope.user.fans += 1;
                    $scope.isFollow = true;
                }
            });
        }
    };
}]).
controller('addArticleCtrl', ['$scope', function($scope) {
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
        if ($scope.titleBytes >= $scope.global.TitleMinLen && $scope.titleBytes <= $scope.global.TitleMaxLen &&
        $scope.contentBytes >= $scope.global.ContentMinLen && $scope.contentBytes <= $scope.global.ContentMaxLen) $scope.editSave = true;
        else $scope.editSave = false;
        if (!$scope.markdownHelp) {
            $scope.previewTitle = $scope.title;
            angular.element('#wmd-title').html($scope.previewTitle);
        }
    });
    $scope.$watch('content', function() {
        if (typeof $scope.content !== 'string') $scope.content = '';
        $scope.contentBytes = jsGen.filter('length')($scope.content);
         if ($scope.titleBytes >= $scope.global.TitleMinLen && $scope.titleBytes <= $scope.global.TitleMaxLen &&
        $scope.contentBytes >= $scope.global.ContentMinLen && $scope.contentBytes <= $scope.global.ContentMaxLen) $scope.editSave = true;
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
        if ($scope.tagsList.indexOf(tag) === -1 && $scope.tagsList.length < $scope.global.ArticleTagsMax) $scope.tagsList = $scope.tagsList.concat(tag); // 此处push方法不会更新tagsList视图
    };
    $scope.checkTags = function() {
        if ($scope.tagsList.length > $scope.global.ArticleTagsMax) $scope.tagsList = $scope.tagsList.slice(0, $scope.global.ArticleTagsMax);
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
}]).
controller('adminGlobalCtrl', ['$scope', function($scope) {
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
                var clone = jsGen.union($scope.global);
                jsGen.intersect(clone, $scope.global);
                jsGen.union($scope.global, clone);
                $scope.request = '修改成功！';
            } else $scope.err = result.err;
        });
    };
}]).
controller('paginationCtrl', ['$scope', function($scope) {
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
}]);
