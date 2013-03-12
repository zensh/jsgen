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
        $scope.timeout = 0;
        var result = jsGen.rest.reset.save({}, {
            name: $scope.name,
            email: $scope.email,
            request: request
        }, function() {
            if (!result.err) {
                $scope.request = result.request;
                $scope.timeout = 5;
                $scope.$on('timeout', function(event) {
                    event.stopPropagation();
                    jsGen.location.path('/');
                });
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
        if ($scope.global.user && $scope.global.user._id === user._id) jsGen.location.path('/home');
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
        total: 1,
        num: 20,
        nums: [20, 50, 100]
    };
    $scope.$on('pagination', function(event, doc) {
        event.stopPropagation();
        result = jsGen.rest.userAdmin.get(doc, function() {
            if (!result.err) {
                $scope.data = result.data;
                originData = jsGen.union($scope.data);
                jsGen.union($scope.pagination, result.pagination);
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
    $scope.$watch('tagsList', function() {
        if ($scope.tagsList.length > $scope.global.UserTagsMax) $scope.tagsList = $scope.tagsList.slice(0, $scope.global.UserTagsMax);
    });
    $scope.$watch('user.desc', function() {
        $scope.descBytes = jsGen.filter('length')($scope.user.desc);
    });
    $scope.$watch(function() {
        if (angular.equals($scope.user, originData) && angular.equals($scope.tagsList, tagsArray) && !$scope.passwd) $scope.editSave = false;
        else $scope.editSave = true;
        if ($scope.passwd && $scope.passwd2 !== $scope.passwd) $scope.checkResult = true;
        else $scope.checkResult = false;
    });
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
        if ($scope.user.desc) $scope.user.desc = jsGen.sanitize(jsGen.MdParse($scope.user.desc), 1);
        if ($scope.passwd && $scope.passwd2 === $scope.passwd) data.passwd = CryptoJS.SHA256($scope.passwd).toString();
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
    $scope.isMe = false;
    $scope.isFollow = false;
    $scope.isFavor = false;
    $scope.isOppose = false;
    $scope.isCollector = false;
    $scope.editSave = false;
    $scope.wmdShow = 'edit';
    $scope.title = '' ;
    $scope.content = '';
    $scope.contentBytes = 0;
    $scope.refer = '';
    $scope.replyTitle = '';
    $scope.replyToComment = false;
    var Errmsg = {name:'错误提示', message:'您需要先登录！'};
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
    function getMarkdown() {
        jsGen.http.get('/static/md/markdown.md', {
            cache: true
        }).success(function(data, status) {
            if (!data.err) $scope.markdownHelp = data;
            else $scope.err = data.err;
        });
    };
    var MdEditor = jsGen.MdEditor();
    MdEditor.run();
    getArticle(function(article) {
        if (article.err) {
            jsGen.err = article.err;
            jsGen.location.path('/err');
        }
        $scope.article = article;
        $scope.title = '评论：' + article.title;
        $scope.replyTitle = $scope.title;
        $scope.refer = article._id;
        if ($scope.global.user) {
            if ($scope.global.user._id === $scope.article.author._id) $scope.isMe = true;
            else $scope.isMe = false;
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
    $scope.wmdHelp = function(s) {
        if (s == 'preview') {
            $scope.wmdShow = 'preview';
            $scope.replyTitle = '文章预览';
            MdEditor.refreshPreview();
        } else if (s == 'help') {
            $scope.wmdShow = 'help';
            $scope.replyTitle = 'Markdown简明语法';
            getMarkdown();
        } else {
            $scope.wmdShow = 'edit';
            $scope.replyTitle = $scope.title;
        }
    };
    $scope.reply = function(article) {
        if (!$scope.isLogin) {
            $scope.err = Errmsg;
            return;
        }
        var dom = angular.element('#' + article._id);
        if (dom.length === 0) return;
        $scope.refer = article._id;
        $scope.wmdShow = 'edit';
        if (article._id === $scope.article._id) {
            $scope.replyToComment = false;
            $scope.title = '评论：' + jsGen.filter('cutText')(article.title, $scope.global.TitleMaxLen - 9);
            angular.element('#comments').prepend(angular.element('#reply'));
        } else {
            $scope.replyToComment = true;
            $scope.title = '评论：' + jsGen.filter('cutText')(jsGen.sanitize(jsGen.MdParse(article.content.trim()), 0), $scope.global.TitleMaxLen - 9);
            dom.append(angular.element('#reply'));
        }
        $scope.replyTitle = $scope.title;
    };
    $scope.$watch('content', function(content) {
        if (typeof content !== 'string') {
            $scope.contentBytes = 0;
            return;
        }
        $scope.contentBytes = jsGen.filter('length')(content);
         if ($scope.contentBytes >= $scope.global.ContentMinLen && $scope.contentBytes <= $scope.global.ContentMaxLen) $scope.editSave = true;
         else $scope.editSave = false;
    });
    $scope.submit = function() {
        if (!$scope.editSave) return;
        var data = {};
        data.content = jsGen.sanitize($scope.content);
        data.title = $scope.title;
        data.refer = $scope.refer;
        var result = jsGen.rest.article.save({ID: $scope.article._id, OP: 'comment'}, data, function() {
            if (!result.err) {
                $scope.replyToComment = false;
                $scope.title = '评论：' + jsGen.filter('cutText')($scope.article.title, $scope.global.TitleMaxLen - 9);
                $scope.content = '';
                angular.element('#comments').prepend(angular.element('#reply'));
                $scope.article.commentsList.unshift(result);
                jsGen.cache.article.put($scope.article._id, $scope.article);
            } else $scope.err = result.err;
        });
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

    function getMarkdown() {
        jsGen.http.get('/static/md/markdown.md', {
            cache: true
        }).success(function(data, status) {
            if (!data.err) {
                $scope.previewTitle = 'Markdown简明语法';
                $scope.markdownHelp = data;
            } else $scope.err = data.err;
        });
    };
    var MdEditor = jsGen.MdEditor();
    MdEditor.run();
    $scope.$watch('title', function(title) {
        if (typeof title !== 'string') {
            $scope.titleBytes = 0;
            return;
        }
        $scope.titleBytes = jsGen.filter('length')(title);
        while ($scope.titleBytes > $scope.global.TitleMaxLen) {
            title = title.slice(0, -1);
            $scope.titleBytes = jsGen.filter('length')(title);
        }
        $scope.title = title;
        if ($scope.titleBytes >= $scope.global.TitleMinLen && $scope.titleBytes <= $scope.global.TitleMaxLen &&
        $scope.contentBytes >= $scope.global.ContentMinLen && $scope.contentBytes <= $scope.global.ContentMaxLen) $scope.editSave = true;
        else $scope.editSave = false;
        if (!$scope.markdownHelp) {
            $scope.previewTitle = $scope.title || '文章预览';
        }
    });
    $scope.$watch('content', function(content) {
        if (typeof content !== 'string') {
            $scope.contentBytes = 0;
            return;
        }
        $scope.contentBytes = jsGen.filter('length')(content);
         if ($scope.titleBytes >= $scope.global.TitleMinLen && $scope.titleBytes <= $scope.global.TitleMaxLen &&
        $scope.contentBytes >= $scope.global.ContentMinLen && $scope.contentBytes <= $scope.global.ContentMaxLen) $scope.editSave = true;
         else $scope.editSave = false;
    });
    $scope.$watch('tagsList', function(tagsList) {
        if (tagsList.length > $scope.global.ArticleTagsMax)
        $scope.tagsList = tagsList.slice(0, $scope.global.ArticleTagsMax);
    });
    $scope.wmdHelp = function(s) {
        if (s === 'preview') {
            $scope.markdownHelp = null;
            $scope.previewTitle = $scope.title || '文章预览';
            MdEditor.refreshPreview();
        } else getMarkdown();
    };
    $scope.getTag = function(t) {
        var tag = t.tag;
        if ($scope.tagsList.indexOf(tag) === -1 && $scope.tagsList.length < $scope.global.ArticleTagsMax) $scope.tagsList = $scope.tagsList.concat(tag); // 此处push方法不会更新tagsList视图
    };
    $scope.submit = function() {
        if (!$scope.editSave) return;
        var data = {};
        data.content = jsGen.sanitize($scope.content);
        data.title = jsGen.sanitize($scope.title.trim(), 0);
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
controller('errCtrl', ['$scope', function($scope) {
    $scope.err = jeGen.union(jsGen.err);
    jsGen.err = null;
}]);
