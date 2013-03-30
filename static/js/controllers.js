'use strict';

/* Controllers */
angular.module('jsGen.controllers', []).
controller('indexCtrl', ['$scope', '$routeParams', function ($scope, $routeParams) {
    var viewID, restPath = jsGen.rest.article;
    $scope.other = {};
    $scope.data = null;
    $scope.pagination = null;

    function checkRouteParams() {
        if ($routeParams.TAG || (/^T[0-9A-Za-z]{3,}$/).test($routeParams.OP)) {
            restPath = jsGen.rest.tag;
            $scope.other._id = $routeParams.OP;
            $scope.other.name = $routeParams.TAG;
            viewID = 'view-other';
        } else {
            restPath = jsGen.rest.article;
            if ($routeParams.OP !== 'hots' && $routeParams.OP !== 'update') {
                $routeParams.OP = 'latest';
            }
            viewID = 'view-' + $routeParams.OP;
        }
        var element = angular.element(document.getElementById(viewID));
        element.parent().children().removeClass('active');
        element.addClass('active');
    };

    if ($routeParams.TAG || $routeParams.OP) checkRouteParams();
    $scope.$on('pagination', function (event, doc) {
        event.stopPropagation();
        doc.ID = $routeParams.TAG || $routeParams.OP || 'latest';
        jsGen.rootScope.loading = true;
        var result = restPath.get(doc, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                if (result.tag) {
                    $scope.other.name = result.tag.tag;
                }
                if (result.pagination) {
                    if (result.pagination.now === 1) {
                        $scope.data = result.data;
                    } else {
                        $scope.data = $scope.data.concat(result.data).slice(-200);
                    }
                    $scope.pagination = result.pagination;
                    if (!$scope.pagination.display) {
                        $scope.pagination.display = {
                            first: '首页',
                            next: '下一页',
                            last: '尾页'
                        };
                    }
                } else {
                    $scope.data = result.data;
                    $scope.pagination = null;
                }
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    });
    $scope.$emit('pagination', {
        n: 10,
        p: 1
    });
    jsGen.getList('comment', function (list) {
        if (!list.err) {
            list.data.forEach(function (comment, i) {
                list.data[i].content = jsGen.filter('cutText')(comment.content, 180);
            })
            $scope.hotComments = list.data.slice(0, 5);
        } else {
            jsGen.rootScope.msg = list.err;
        }
    });
    $scope.getList = function (s) {
        $routeParams.OP = s;
        checkRouteParams();
        $scope.$emit('pagination', {
            n: 10,
            p: 1
        });
    };
}]).
controller('tagCtrl', ['$scope', function ($scope) {
    $scope.data = null;
    $scope.pagination = null;
    $scope.$on('pagination', function (event, doc) {
        event.stopPropagation();
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.tag.get(doc, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                if (result.pagination) {
                    if (result.pagination.now === 1) {
                        $scope.data = result.data;
                    } else {
                        $scope.data = $scope.data.concat(result.data).slice(-500);
                    }
                    $scope.pagination = result.pagination;
                    if (!$scope.pagination.display) {
                        $scope.pagination.display = {
                            first: '首页',
                            next: '下一页',
                            last: '尾页'
                        };
                    }
                } else {
                    $scope.data = result.data;
                }
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    });
    $scope.$emit('pagination', {
        n: 50,
        p: 1
    });
    jsGen.getList('hots', function (list) {
        if (!list.err) {
            $scope.hotArticles = list.data.slice(0, 5);
        } else {
            jsGen.rootScope.msg = list.err;
        }
    });
    jsGen.getList('latest', function (list) {
        if (!list.err) {
            $scope.latestArticles = list.data.slice(0, 5);
        } else {
            jsGen.rootScope.msg = list.err;
        }
    });
}]).
controller('userLoginCtrl', ['$scope', function ($scope) {
    $scope.userReset = undefined;
    $scope.resetName = undefined;
    $scope.submit = function () {
        var data = {}, result;
        data.logname = $scope.logname;
        data.logpwd = CryptoJS.SHA256($scope.logpwd).toString();
        data.logpwd = CryptoJS.HmacSHA256(data.logpwd, data.logname).toString();
        jsGen.rootScope.loading = true;
        result = jsGen.rest.user.save({Uid: 'login'}, data, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                $scope.global.user = jsGen.union(result);
                $scope.checkUser();
                jsGen.location.path('/home');
            } else {
                if (result.err.name === 'locked') {
                    $scope.resetName = '申请解锁';
                    $scope.userReset = 'locked';
                } else if (result.err.name === 'passwd') {
                    $scope.resetName = '找回密码';
                    $scope.userReset = 'passwd';
                }
                jsGen.rootScope.msg = result.err;
            }
        });
    };
}]).
controller('userResetCtrl', ['$scope', '$routeParams', function ($scope, $routeParams) {
    var request = $routeParams.RE;
    if (request === 'locked') {
        $scope.header = '申请解锁';
    } else if (request === 'passwd') {
        $scope.header = '找回密码';
    } else {
        jsGen.location.path(jsGen.goBack);
    }
    $scope.submit = function () {
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.user.save({Uid: 'reset'}, {
            name: $scope.name,
            email: $scope.email,
            request: request
        }, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                result.name = '请求成功';
                result.url = '/';
                jsGen.rootScope.msg = result;
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
}]).
controller('userRegisterCtrl', ['$scope', function ($scope) {
    $scope.checkResult = true;
    $scope.checkPwd = function () {
        if ($scope.passwd2 !== $scope.passwd) {
            $scope.checkResult = true;
        } else {
            $scope.checkResult = false;
        }
    };
    $scope.submit = function () {
        var data = {},
        result;
        data.name = $scope.name;
        data.passwd = CryptoJS.SHA256($scope.passwd).toString();
        data.email = $scope.email;
        jsGen.rootScope.loading = true;
        result = jsGen.rest.user.save({Uid: 'register'}, data, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                $scope.global.user = jsGen.union(result);
                $scope.checkUser();
                jsGen.location.path('/home');
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
}]).
controller('homeCtrl', ['$scope', function ($scope) {
    if (!$scope.global.user || !$scope.global.user.name) {
        return jsGen.location.path('/');
    }
    $scope.isMe = true;
    $scope.help = null;
    $scope.userOperate = {Uid: 'index', OP: 'index'};
    $scope.getTpl = '/static/tpl/user-index.html';
    $scope.setTpl = function (tpl, operate) {
        $scope.getTpl = '/static/tpl/' + tpl;
        if (operate) {
            $scope.userOperate.Uid = operate;
        }
    };
    $scope.user = $scope.global.user;
    jsGen.rootScope.loading = true;
    var result = jsGen.rest.user.get({}, function () {
        jsGen.rootScope.loading = false;
        if (result.err) {
            jsGen.rootScope.msg = result.err;
            return;
        }
        if (result.user) {
            $scope.global.user = result.user;
            $scope.user = $scope.global.user;
        }
        if (result.data.length === 0) {
            $scope.help = {
                title: '暂无更新',
                content: '这里显示您关注的标签或用户的最新文章。'
            };
        } else {
            $scope.help = null;
        }
        $scope.data = result.data;
        $scope.pagination = result.pagination;
    });
    $scope.$on('update', function (event, doc) {
        event.stopPropagation();
        $scope.user.tagsList = [];
        jsGen.union($scope.user, doc);
    });
}]).
controller('userCtrl', ['$scope', '$routeParams', function ($scope, $routeParams) {
    var Uid;
    $scope.isMe = false;
    if ($routeParams.UID) {
        Uid = $routeParams.UID;
    } else {
        Uid = 'U' + $routeParams.ID;
    }
    $scope.userOperate = {Uid: Uid, OP: 'index'};
    $scope.getTpl = '/static/tpl/user-article.html';
    $scope.setTpl = function (tpl, operate) {
        $scope.getTpl = '/static/tpl/' + tpl;
        if (operate) {
            $scope.userOperate.OP = operate;
        }
    };
    jsGen.rootScope.loading = true;
    jsGen.getUser(Uid, function (result) {
        jsGen.rootScope.loading = false;
        if (result.err) {
            jsGen.rootScope.msg = result.err;
            return;
        }
        if (result.user) {
            $scope.checkIsFollow(result.user);
            $scope.user = result.user;
            if ($scope.global.user && $scope.global.user._id === result.user._id) {
                jsGen.location.path('/home');
                return;
            }
        }
        $scope.data = result.data;
        $scope.pagination = result.pagination;
    });
}]).
controller('userListCtrl', ['$scope', function ($scope) {
    $scope.$on('pagination', function (event, doc) {
        event.stopPropagation();
        doc.Uid = $scope.userOperate.Uid;
        doc.OP = $scope.userOperate.OP;
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.user.get(doc, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                result.data.forEach(function (x) {
                    $scope.checkIsFollow(x);
                });
                if (result.pagination) {
                    if (result.pagination.now === 1) {
                        $scope.data = result.data;
                    } else {
                        $scope.data = $scope.data.concat(result.data).slice(-200);
                    }
                    $scope.pagination = result.pagination;
                    if (!$scope.pagination.display) {
                        $scope.pagination.display = {
                            first: '首页',
                            next: '下一页',
                            last: '尾页'
                        };
                    }
                } else {
                    $scope.data = result.data;
                }
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    });
    $scope.$watch('userOperate', function () {
        $scope.$emit('pagination', {
            n: 10,
            p: 1
        });
    }, true);
}]).
controller('userArticleCtrl', ['$scope', function ($scope) {
    $scope.$on('pagination', function (event, doc) {
        event.stopPropagation();
        doc.Uid = $scope.userOperate.Uid;
        doc.OP = $scope.userOperate.OP;
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.user.get(doc, function () {
            jsGen.rootScope.loading = false;
            if (result.err) {
                result.err.url = '/';
                jsGen.rootScope.msg = result.err;
                return;
            }
            if (result.pagination) {
                if (result.pagination.now === 1) {
                    $scope.data = result.data;
                } else {
                    $scope.data = $scope.data.concat(result.data).slice(-200);
                }
                $scope.pagination = result.pagination;
                if (!$scope.pagination.display) {
                    $scope.pagination.display = {
                        first: '首页',
                        next: '下一页',
                        last: '尾页'
                    };
                }
            } else {
                $scope.data = result.data;
            }
        });
    });
    $scope.$watch('userOperate', function (value) {
        if (value.Uid === 'index' || (value.Uid[0] === 'U' && value.OP === 'index')) {
            return;
        }
        $scope.$emit('pagination', {
            n: 10,
            p: 1
        });
    }, true);
    $scope.remove = function (article) {
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.article.remove({ID: article._id}, null, function () {
            jsGen.rootScope.loading = false;
            if (result.remove) {
                $scope.data.some(function (x, i) {
                    if (x._id ===article._id) {
                        $scope.data.splice(i, 1);
                        return true;
                    }
                });
                jsGen.rootScope.msg = {
                    name: '删除文章',
                    message: '已成功删除文章《' + article.title + '》！',
                    type: 'success'
                }
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
}]).
controller('userAdminCtrl', ['$scope', function ($scope) {
    var originData = {};
    $scope.roleArray = [0, 1, 2, 3, 4, 5];
    $scope.editEmail = false;
    $scope.editRole = false;
    $scope.editSave = false;
    $scope.pagination = {
        now: 1,
        total: 1,
        num: 20,
        nums: [20, 50, 100]
    };
    $scope.$on('pagination', function (event, doc) {
        event.stopPropagation();
        doc.Uid = 'admin';
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.user.get(doc, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                $scope.data = result.data;
                originData = jsGen.union($scope.data);
                jsGen.union($scope.pagination, result.pagination);
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    });
    $scope.$emit('pagination', {
        n: $scope.pagination.num,
        p: $scope.pagination.now
    });
    $scope.$watch(function () {
        if (angular.equals($scope.data, originData)) {
            $scope.editSave = false;
        } else {
            $scope.editSave = true;
        }
    });
    $scope.reset = function () {
        $scope.data = jsGen.union(originData);
        $scope.editEmail = false;
        $scope.editRole = false;
        $scope.editSave = false;
    };
    $scope.submit = function () {
        var defaultObj = [{
            _id: '',
            email: '',
            locked: false,
            role: 0
        }];
        $scope.editEmail = false;
        $scope.editRole = false;
        $scope.editSave = false;
        var data = jsGen.union($scope.data);
        originData = jsGen.intersect(jsGen.union(defaultObj), originData);
        data = jsGen.intersect(jsGen.union(defaultObj), data);
        angular.forEach(data, function (value, key) {
            if (angular.equals(value, originData[key])) {
                delete data[key];
            }
        });
        jsGen.complement(data, originData, [{
            _id: ''
        }]);
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.user.save({Uid: 'admin'}, {
            data: data
        }, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                $scope.data = jsGen.union(result.data);
                originData = jsGen.union(result.data);
                jsGen.rootScope.msg = {
                    name: '请求成功',
                    message: '修改成功！'
                };
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
}]).
controller('userEditCtrl', ['$scope', function ($scope) {
    var originData = {},
    tagsArray = [];

    function initTags(tagsList) {
        tagsArray = [];
        angular.forEach(tagsList, function (value, key) {
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
    $scope.$watch('tagsList', function () {
        if ($scope.tagsList.length > $scope.global.UserTagsMax) {
            $scope.tagsList = $scope.tagsList.slice(0, $scope.global.UserTagsMax);
        }
    });
    $scope.$watch('user.desc', function () {
        $scope.descBytes = jsGen.filter('length')($scope.user.desc);
    });
    $scope.$watch(function () {
        if (angular.equals($scope.user, originData) && angular.equals($scope.tagsList, tagsArray) && !$scope.passwd) {
            $scope.editSave = false;
        } else {
            $scope.editSave = true;
        }
        if ($scope.passwd && $scope.passwd2 !== $scope.passwd) {
            $scope.checkResult = true;
        } else {
            $scope.checkResult = false;
        }
    });
    $scope.getTag = function (t) {
        var tag = t.tag;
        if ($scope.tagsList.indexOf(tag) === -1 && $scope.tagsList.length < $scope.global.UserTagsMax) {
            $scope.tagsList = $scope.tagsList.concat(tag); // 此处push方法不会更新tagsList视图
        }
    };
    $scope.reset = function () {
        $scope.user = jsGen.union(originData);
        $scope.editSave = false;
    };
    $scope.submit = function () {
        var result, changeEmail,
        data = jsGen.union($scope.user);
        $scope.editSave = false;
        angular.forEach(data, function (value, key) {
            if (angular.equals(value, originData[key])) {
                delete data[key];
            }
        });
        if ($scope.user.desc) {
            $scope.user.desc = jsGen.sanitize(jsGen.MdParse($scope.user.desc), 1);
        }
        if ($scope.passwd && $scope.passwd2 === $scope.passwd) {
            data.passwd = CryptoJS.SHA256($scope.passwd).toString();
        }
        if (!angular.equals($scope.tagsList, tagsArray)) {
            data.tagsList = $scope.tagsList;
        }
        if (data.email) {
            jsGen.rootScope.loading = true;
            changeEmail = jsGen.rest.user.save({Uid: 'reset'}, {
                email: data.email,
                request: 'email'
            }, function () {
                jsGen.rootScope.loading = false;
                if (!changeEmail.err) {
                    jsGen.union(originData, {
                        email: data.email
                    });
                    changeEmail.name = '请求成功';
                    jsGen.rootScope.msg = changeEmail;
                } else {
                    jsGen.rootScope.msg = changeEmail.err;
                }
            });
        }
        delete data.email;
        if (!angular.equals(data, {})) {
            jsGen.rootScope.loading = true;
            result = jsGen.rest.user.save({}, data, function () {
                jsGen.rootScope.loading = false;
                if (!result.err) {
                    jsGen.union($scope.user, result);
                    originData = jsGen.union($scope.user);
                    initTags($scope.user.tagsList);
                    $scope.$emit('update', result);
                    jsGen.rootScope.msg = {
                        name: '请求成功',
                        message: '修改成功！'
                    };
                } else {
                    jsGen.rootScope.msg = result.err;
                }
            });
        }
    };
}]).
controller('articleCtrl', ['$scope', '$routeParams', function ($scope, $routeParams) {
    $scope.isMe = false;
    $scope.editSave = false;
    $scope.wmdShow = 'edit';
    $scope.title = '';
    $scope.content = '';
    $scope.contentBytes = 0;
    $scope.refer = '';
    $scope.replyTitle = '';
    $scope.replyToComment = false;
    var Errmsg = {
        name: '错误提示',
        message: '您需要先登录！',
        type: 'error'
    };
    var MdEditor = jsGen.MdEditor();
    MdEditor.run();

    function checkArticleIs(article) {
        var user = $scope.global.user || {
            followList: []
        };
        article.markList = article.markList || [];
        article.favorList = article.favorsList || [];
        article.opposeList = article.opposesList || [];
        article.isMark = article.markList.some(function (x) {
            return x._id === user._id;
        });
        article.isFavor = article.favorsList.some(function (x) {
            return x._id === user._id;
        });
        article.isOppose = article.opposesList.some(function (x) {
            return x._id === user._id;
        });
        if (article.commentsList && typeof article.commentsList[0] === 'object') {
            article.commentsList.forEach(function (x) {
                checkArticleIs(x);
            });
        }
    };
    jsGen.rootScope.loading = true;
    jsGen.getArticle('A' + $routeParams.ID, function (article) {
        if (article.err) {
            article.err.url = jsGen.goBack;
            jsGen.rootScope.msg = article.err;
            return;
        }
        article.commentsList.forEach(function (x) {
            jsGen.cache.article.put(x._id, x);
        });
        checkArticleIs(article);
        jsGen.rootScope.global.title2 = article.title;
        $scope.article = article;
        if (article.pagination) {
            $scope.pagination = article.pagination;
            $scope.pagination.display = {
                next: '下一页',
                last: '尾页'
            };
        }
        $scope.title = '评论：' + article.title;
        $scope.replyTitle = $scope.title;
        $scope.refer = article._id;
        if ($scope.global.user) {
            if ($scope.global.user._id === $scope.article.author._id) {
                $scope.isMe = true;
            } else {
                $scope.isMe = false;
            }
        }
        jsGen.getUser(article.author._id, function (author) {
            jsGen.rootScope.loading = true;
            if (author.err) {
                jsGen.rootScope.msg = author.err;
                return;
            }
            $scope.checkIsFollow(author.user);
            $scope.article.author = author.user;
            $scope.authorArticles = author.data;
        });
    });
    jsGen.getList('hots', function (list) {
        if (!list.err) {
            $scope.hotArticles = list.data;
        } else {
            jsGen.rootScope.msg = list.err;
        }
    });
    $scope.wmdHelp = function (s) {
        if (s == 'preview') {
            $scope.wmdShow = 'preview';
            $scope.replyTitle = '文章预览';
            MdEditor.refreshPreview();
        } else if (s == 'help') {
            $scope.wmdShow = 'help';
            jsGen.getMarkdown(function (data) {
                $scope.replyTitle = data.title;
                $scope.markdownHelp = data.content;
                jsGen.rootScope.msg = data.err;
            });
        } else {
            $scope.wmdShow = 'edit';
            $scope.replyTitle = $scope.title;
        }
    };
    $scope.reply = function (article) {
        var dom = angular.element(document.getElementById(article._id));
        if (dom.length === 0) return;
        $scope.refer = article._id;
        $scope.wmdShow = 'edit';
        if (article._id === $scope.article._id) {
            $scope.replyToComment = false;
            $scope.title = '评论：' + jsGen.filter('cutText')(article.title, $scope.global.TitleMaxLen - 9);
            angular.element(document.getElementById('comments')).prepend(angular.element(document.getElementById('reply')));
            jsGen.location.hash('comments');
            jsGen.anchorScroll();
        } else {
            $scope.replyToComment = article._id;
            $scope.title = '评论：' + jsGen.filter('cutText')(jsGen.sanitize(jsGen.MdParse(article.content.trim()), 0), $scope.global.TitleMaxLen - 9);
            dom.append(angular.element(document.getElementById('reply')));
        }
        $scope.replyTitle = $scope.title;
        if (!$scope.isLogin) {
            jsGen.rootScope.msg = Errmsg;
            return;
        }
    };
    $scope.$watch('content', function (content) {
        if (typeof content !== 'string') {
            $scope.contentBytes = 0;
            return;
        }
        $scope.contentBytes = jsGen.filter('length')(content);
        if ($scope.contentBytes >= $scope.global.ContentMinLen && $scope.contentBytes <= $scope.global.ContentMaxLen) {
            $scope.editSave = true;
        } else {
            $scope.editSave = false;
        }
    });
    $scope.$on('pagination', function (event, doc) {
        event.stopPropagation();
        doc.ID = $scope.article._id;
        doc.OP = 'comment';
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.article.get(doc, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                $scope.pagination = result.pagination;
                $scope.article.commentsList = $scope.article.commentsList.concat(result.data).slice(-200);
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    });
    $scope.getComments = function (idArray, to) {
        $scope.referComments = [];
        var dom = angular.element(document.getElementById(to._id));
        var refer = angular.element(document.getElementById('refer-comments'));
        if (dom.children('#refer-comments').length > 0) {
            angular.element(document.getElementById('comments')).append(refer);
            return;
        } else {
            dom.append(refer);
        }
        idArray = jsGen.union(idArray);
        if (!angular.isArray(idArray)) {
            idArray = [idArray];
        }
        idArray.forEach(function (x, i) {
            var comment = jsGen.cache.article.get(x);
            if (comment) {
                checkArticleIs(comment);
                $scope.referComments.push(comment);
                delete idArray[i];
            }
        });
        jsGen.digestArray(idArray);
        if (idArray.length > 0) {
            jsGen.rootScope.loading = true;
            var result = jsGen.rest.article.save({
                ID: 'comment'
            }, {
                data: idArray
            }, function () {
                jsGen.rootScope.loading = false;
                if (result.data) {
                    result.data.forEach(function (x) {
                        jsGen.cache.article.put(x._id, x);
                        checkArticleIs(x);
                    })
                    $scope.referComments = $scope.referComments.concat(result.data).slice(-200);
                } else if (result.err) {
                    jsGen.rootScope.msg = result.err;
                }
            });
        }
    };
    $scope.setMark = function (article) {
        var result;
        if (!$scope.isLogin) {
            jsGen.rootScope.msg = Errmsg;
            return;
        }
        jsGen.rootScope.loading = true;
        result = jsGen.rest.article.save({
            ID: article._id,
            OP: 'mark'
        }, {
            mark: !article.isMark
        }, function () {
            jsGen.rootScope.loading = false;
            if (result.save) {
                article.isMark = !article.isMark;
                if (article.markList) {
                    if (article.isMark) {
                        article.markList.push({
                            _id: $scope.global.user._id,
                            name: $scope.global.user.name,
                            avatar: $scope.global.user.avatar
                        });
                    } else {
                        article.markList.some(function (x, i, a) {
                            if (x._id === $scope.global.user._id) {
                                a.splice(i, 1);
                                return true;
                            }
                        });
                    }
                }
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
    $scope.setFavor = function (article) {
        var result;
        if (!$scope.isLogin) {
            jsGen.rootScope.msg = Errmsg;
            return;
        }
        jsGen.rootScope.loading = true;
        result = jsGen.rest.article.save({
            ID: article._id,
            OP: 'favor'
        }, {
            favor: !article.isFavor
        }, function () {
            jsGen.rootScope.loading = false;
            if (result.save) {
                article.isFavor = !article.isFavor;
                if (article.favorsList) {
                    if (article.isFavor) {
                        article.favorsList.push({
                            _id: $scope.global.user._id,
                            name: $scope.global.user.name,
                            avatar: $scope.global.user.avatar
                        });
                        article.opposesList.some(function (x, i, a) {
                            if (x._id === $scope.global.user._id) {
                                a.splice(i, 1);
                                return true;
                            }
                        });
                        article.isOppose = false;
                    } else {
                        article.favorsList.some(function (x, i, a) {
                            if (x._id === $scope.global.user._id) {
                                a.splice(i, 1);
                                return true;
                            }
                        });
                    }
                }
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
    $scope.setOppose = function (article) {
        var result;
        if (!$scope.isLogin) {
            jsGen.rootScope.msg = Errmsg;
            return;
        }
        jsGen.rootScope.loading = true;
        result = jsGen.rest.article.save({
            ID: article._id,
            OP: 'oppose'
        }, {
            oppose: !article.isOppose
        }, function () {
            jsGen.rootScope.loading = false;
            if (result.save) {
                article.isOppose = !article.isOppose;
                if (article.opposesList) {
                    if (article.isOppose) {
                        article.opposesList.push({
                            _id: $scope.global.user._id,
                            name: $scope.global.user.name,
                            avatar: $scope.global.user.avatar
                        });
                        article.favorsList.some(function (x, i, a) {
                            if (x._id === $scope.global.user._id) {
                                a.splice(i, 1);
                                return true;
                            }
                        });
                        article.isFavor = false;
                    } else {
                        article.opposesList.some(function (x, i, a) {
                            if (x._id === $scope.global.user._id) {
                                a.splice(i, 1);
                                return true;
                            }
                        });
                    }
                }
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
    $scope.submit = function () {
        if (!$scope.editSave) {
            return;
        }
        if (!$scope.isLogin) {
            jsGen.rootScope.msg = Errmsg;
            return;
        }
        var data = {};
        data.content = jsGen.sanitize($scope.content);
        data.title = $scope.title;
        data.refer = $scope.refer;
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.article.save({
            ID: $scope.article._id,
            OP: 'comment'
        }, data, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                $scope.article.commentsList.unshift(result);
                $scope.article.comments += 1;
                $scope.article.updateTime = Date.now();
                if ($scope.replyToComment) $scope.article.commentsList.some(function (x, i) {
                    if ($scope.replyToComment === x._id) {
                        $scope.article.commentsList[i].commentsList.push(result._id);
                        return true;
                    }
                });
                jsGen.cache.article.put($scope.article._id, $scope.article);
                $scope.replyToComment = false;
                $scope.title = '评论：' + jsGen.filter('cutText')($scope.article.title, $scope.global.TitleMaxLen - 9);
                $scope.content = '';
                angular.element(document.getElementById('comments')).prepend(angular.element(document.getElementById('reply')));
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
}]).
controller('articleEditorCtrl', ['$scope', '$routeParams', function ($scope, $routeParams) {
    if (jsGen.goBack === jsGen.location.path()) {
        jsGen.goBack = '/';
    }
    if (!$scope.isLogin) {
        jsGen.location.path(jsGen.goBack);
    }
    $scope.previewTitle = '文章预览';
    $scope.markdownHelp = null;
    $scope.titleBytes = 0;
    $scope.contentBytes = 0;
    $scope.title = '';
    $scope.content = '';
    $scope.tagsList = [];
    $scope.editSave = false;

    if ($routeParams.ID) {
        jsGen.rootScope.loading = true;
        jsGen.getArticle('A' + $routeParams.ID, function (article) {
            jsGen.rootScope.loading = false;
            if (!article.err) {
                $scope.previewTitle = '编辑文章';
                $scope._id = article._id;
                $scope.title = article.title;
                $scope.content = article.content;
                if (article.refer && article.refer.url) $scope.refer = article.refer.url;
                $scope.tagsList = article.tagsList.map(function (x) {
                    return x.tag;
                });
            } else {
                jsGen.rootScope.msg = article.err;
            }
        });
    }

    var MdEditor = jsGen.MdEditor();
    MdEditor.run();
    $scope.$watch('title', function (title) {
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
        if ($scope.titleBytes >= $scope.global.TitleMinLen && $scope.titleBytes <= $scope.global.TitleMaxLen && $scope.contentBytes >= $scope.global.ContentMinLen && $scope.contentBytes <= $scope.global.ContentMaxLen) {
            $scope.editSave = true;
        } else {
            $scope.editSave = false;
        }
        if (!$scope.markdownHelp) {
            $scope.previewTitle = $scope.title || '文章预览';
        }
    });
    $scope.$watch('content', function (content) {
        if (typeof content !== 'string') {
            $scope.contentBytes = 0;
            return;
        }
        $scope.contentBytes = jsGen.filter('length')(content);
        if ($scope.titleBytes >= $scope.global.TitleMinLen && $scope.titleBytes <= $scope.global.TitleMaxLen && $scope.contentBytes >= $scope.global.ContentMinLen && $scope.contentBytes <= $scope.global.ContentMaxLen) {
            $scope.editSave = true;
        } else {
            $scope.editSave = false;
        }
    });
    $scope.$watch('tagsList', function (tagsList) {
        if (tagsList.length > $scope.global.ArticleTagsMax) {
            $scope.tagsList = tagsList.slice(0, $scope.global.ArticleTagsMax);
        }
    });
    $scope.wmdHelp = function (s) {
        if (s === 'preview') {
            $scope.markdownHelp = null;
            $scope.previewTitle = $scope.title || '文章预览';
            MdEditor.refreshPreview();
        } else {
            jsGen.getMarkdown(function (data) {
                $scope.previewTitle = data.title;
                $scope.markdownHelp = data.content;
                jsGen.rootScope.msg = data.err;
            });
        }
    };
    $scope.getTag = function (t) {
        var tag = t.tag;
        if ($scope.tagsList.indexOf(tag) === -1 && $scope.tagsList.length < $scope.global.ArticleTagsMax) {
            $scope.tagsList = $scope.tagsList.concat(tag); // 此处push方法不会更新tagsList视图
        }
    };
    $scope.submit = function () {
        if (!$scope.editSave) {
            return;
        }
        var data = {};
        var parameter = {};
        data.content = $scope.content;
        data.title = jsGen.sanitize($scope.title.trim(), 0);
        data.tagsList = $scope.tagsList;
        data.refer = $scope.refer;
        data._id = $scope._id;
        if ($routeParams.ID) {
            parameter = {
                ID: 'A' + $routeParams.ID,
                OP: 'edit'
            };
        }
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.article.save(parameter, data, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                jsGen.cache.article.put(result._id, result);
                jsGen.location.path('/' + result._id);
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
}]).
controller('adminCtrl', ['$scope', function ($scope) {
    if (!($scope.global.user && $scope.global.user.role === 5)) {
        jsGen.location.path('/');
    }
    $scope.getTpl = '/static/tpl/admin-index.html';
    $scope.setTpl = function (tpl) {
        $scope.getTpl = '/static/tpl/' + tpl;
    };
}]).
controller('adminTagCtrl', ['$scope', function ($scope) {
    var originData = {};
    $scope.data = null;
    $scope.pagination = null;
    $scope.$on('pagination', function (event, doc) {
        event.stopPropagation();
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.tag.get(doc, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                $scope.data = result.data;
                originData = jsGen.union(result.data);
                if (result.pagination) {
                    $scope.pagination = result.pagination;
                    if (!$scope.pagination.display) {
                        $scope.pagination.display = {
                            first: '首页',
                            next: '下一页',
                            last: '尾页'
                        };
                    }
                }
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    });
    $scope.$emit('pagination', {
        n: 50,
        p: 1
    });
    $scope.$watch(function () {
        if (angular.equals($scope.data, originData)) {
            $scope.editSave = false;
        } else {
            $scope.editSave = true;
        }
    });
    $scope.remove = function (tag) {
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.tag.remove({ID: tag._id}, null, function () {
            jsGen.rootScope.loading = false;
            if (result.remove) {
                $scope.data.some(function (x, i) {
                    if (x._id ===tag._id) {
                        $scope.data.splice(i, 1);
                        return true;
                    }
                });
                originData = jsGen.union($scope.data);
                jsGen.rootScope.msg = {
                    name: '删除标签',
                    message: '已成功删除标签：' + tag.tag + '！',
                    type: 'success'
                }
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
    $scope.submit = function () {
        var defaultObj = [{
            _id: '',
            tag: ''
        }];
        $scope.editTag = false;
        $scope.editSave = false;
        var data = jsGen.union($scope.data);
        originData = jsGen.intersect(jsGen.union(defaultObj), originData);
        data = jsGen.intersect(jsGen.union(defaultObj), data);
        angular.forEach(data, function (value, key) {
            if (angular.equals(value, originData[key])) {
                delete data[key];
            }
        });
        jsGen.digestArray(data);
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.tag.save({ID: 'admin'}, {
            data: data
        }, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                $scope.data = jsGen.union(result.data);
                originData = jsGen.union(result.data);
                jsGen.rootScope.msg = {
                    name: '请求成功',
                    message: '修改成功！'
                };
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
}]).
controller('adminGlobalCtrl', ['$scope', function ($scope) {
    var originData = {};
    jsGen.rootScope.loading = true;
    $scope.global = jsGen.rest.index.get({OP: 'admin'}, function () {
        jsGen.rootScope.loading = false;
        $scope.global = jsGen.union($scope.global);
        originData = jsGen.union($scope.global);
    });
    $scope.editSave = false;
    $scope.switchTab = 'tab1';
    $scope.$watch(function () {
        if (angular.equals($scope.global, originData)) {
            $scope.editSave = false;
        } else {
            $scope.editSave = true;
        }
    });
    $scope.setTab = function (tab) {
        $scope.switchTab = tab;
        jsGen.rootScope.msg = null;
    }
    $scope.setClass = function (b) {
        return b ? 'btn-warning' : 'btn-success';
    };
    $scope.reset = function () {
        $scope.global = jsGen.union(originData);
        $scope.editSave = false;
    };
    $scope.submit = function () {
        var data = jsGen.union($scope.global);
        $scope.editSave = false;
        angular.forEach(data.UsersScore, function (value, key) {
            data.UsersScore[key] = +value;
        });
        angular.forEach(data.ArticleStatus, function (value, key) {
            data.ArticleStatus[key] = +value;
        });
        angular.forEach(data.ArticleHots, function (value, key) {
            data.ArticleHots[key] = +value;
        });
        angular.forEach(data.paginationCache, function (value, key) {
            data.paginationCache[key] = +value;
        });
        angular.forEach(data, function (value, key) {
            if (angular.equals(value, originData[key])) {
                delete data[key];
            }
        });
        jsGen.rootScope.loading = true;
        var result = jsGen.rest.index.save({OP: 'admin'}, data, function () {
            jsGen.rootScope.loading = false;
            if (!result.err) {
                $scope.global = jsGen.union(result);
                originData = jsGen.union(result);
                var clone = jsGen.union($scope.global);
                jsGen.intersect(clone, $scope.global);
                jsGen.union($scope.global, clone);
                jsGen.rootScope.msg = {
                    name: '请求成功',
                    message: '修改成功！'
                };
            } else {
                jsGen.rootScope.msg = result.err;
            }
        });
    };
}]);
