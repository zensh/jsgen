'use strict';
/*global angular, _*/

angular.module('jsGen.controllers', []).
controller('indexCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var ID = '',
            restAPI = app.rest.article,
            custom = app.custom;

        function checkRouteParams() {
            var path = app.location.path().slice(1).split('/');
            if ($routeParams.TAG || (/^T[0-9A-Za-z]{3,}$/).test(path[0])) {
                restAPI = app.rest.tag;
                $scope.other._id = path[0];
                $scope.other.title = $routeParams.TAG || path[0];
                $scope.parent.viewPath = '';
            } else {
                restAPI = app.rest.article;
                $scope.parent.viewPath = path[0] || 'latest';
            }
            ID = $routeParams.TAG || path[0];
        }

        $scope.global.title2 = $scope.global.description;
        $scope.parent = {
            getTpl: app.getFile.html('index-article.html'),
            viewPath: 'latest',
            listModel: custom.listModel()
        };
        $scope.other = {};
        $scope.pagination = {};

        $scope.setListModel = function () {
            $scope.parent.listModel = custom.listModel(!$scope.parent.listModel);
        };

        checkRouteParams();
        app.promiseGet({
            ID: ID,
            p: $routeParams.p,
            s: $routeParams.s || custom.pageSize()
        }, restAPI).then(function (data) {
            var pagination = data.pagination || {};
            if (data.tag) {
                $scope.other.title = data.tag.tag;
                $scope.other._id = data.tag._id;
            }
            pagination.locationPath = app.location.path();
            pagination.sizePerPage = [10, 20, 50];
            pagination.pageSize = custom.pageSize(pagination.pageSize);
            $scope.pagination = pagination;
            $scope.articleList = data.data;
        });
        app.getList('comment').then(function (list) {
            _.each(list.data, function (x, i) {
                x.content = app.filter('cutText')(x.content, 180);
            });
            $scope.hotComments = list.data.slice(0, 5);
        });
    }
]).controller('tagCtrl', ['app', '$scope',
    function (app, $scope) {
        $scope.data = null;
        $scope.pagination = null;
        $scope.$on('pagination', function (event, doc) {
            event.stopPropagation();
            app.rootScope.global.loading = true;
            var result = app.rest.tag.get(doc, function () {
                app.rootScope.global.loading = false;
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
                    app.rootScope.msg = result.err;
                }
            });
        });
        $scope.$emit('pagination', {
            n: 50,
            p: 1
        });
        app.getList('hots', function (list) {
            if (!list.err) {
                $scope.hotArticles = list.data.slice(0, 5);
            } else {
                app.rootScope.msg = list.err;
            }
        });
        app.getList('latest', function (list) {
            if (!list.err) {
                $scope.latestArticles = list.data.slice(0, 5);
            } else {
                app.rootScope.msg = list.err;
            }
        });
    }
]).controller('userLoginCtrl', ['app', '$scope',
    function (app, $scope) {
        $scope.userReset = undefined;
        $scope.resetName = undefined;
        $scope.logauto = true;
        $scope.submit = function () {
            var data = {}, result;
            data.logname = $scope.logname;
            data.logauto = $scope.logauto;
            data.logtime = Date.now();
            data.logtime = Math.max(data.logtime, $scope.global.timestamp);
            data.logpwd = CryptoJS.SHA256($scope.logpwd).toString();
            data.logpwd = CryptoJS.HmacSHA256(data.logpwd, data.logname + ':' + data.logtime).toString();
            app.rootScope.global.loading = true;
            result = app.rest.user.save({
                Uid: 'login'
            }, data, function () {
                app.rootScope.global.loading = false;
                if (!result.err) {
                    $scope.global.user = app.union(result);
                    $scope.checkUser();
                    app.location.path('/home');
                } else {
                    if (result.err.name === 'locked') {
                        $scope.resetName = '申请解锁';
                        $scope.userReset = 'locked';
                    } else if (result.err.name === 'passwd') {
                        $scope.resetName = '找回密码';
                        $scope.userReset = 'passwd';
                    }
                    app.rootScope.msg = result.err;
                }
            });
        };
    }
]).controller('userResetCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var request = $routeParams.RE;
        if (request === 'locked') {
            $scope.header = '申请解锁';
        } else if (request === 'passwd') {
            $scope.header = '找回密码';
        } else {
            app.location.path(app.goBack);
        }
        $scope.submit = function () {
            app.rootScope.global.loading = true;
            var result = app.rest.user.save({
                Uid: 'reset'
            }, {
                name: $scope.name,
                email: $scope.email,
                request: request
            }, function () {
                app.rootScope.global.loading = false;
                if (!result.err) {
                    result.name = '请求成功';
                    result.url = '/';
                    app.rootScope.msg = result;
                } else {
                    app.rootScope.msg = result.err;
                }
            });
        };
    }
]).controller('userRegisterCtrl', ['app', '$scope',
    function (app, $scope) {
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
            app.rootScope.global.loading = true;
            result = app.rest.user.save({
                Uid: 'register'
            }, data, function () {
                app.rootScope.global.loading = false;
                if (!result.err) {
                    $scope.global.user = app.union(result);
                    $scope.checkUser();
                    app.location.path('/home');
                } else {
                    app.rootScope.msg = result.err;
                }
            });
        };
    }
]).controller('homeCtrl', ['app', '$scope',
    function (app, $scope) {
        if (!$scope.global.user || !$scope.global.user.name) {
            return app.location.path('/');
        }
        $scope.isMe = true;
        $scope.help = null;
        $scope.userOperate = {
            Uid: 'index',
            OP: 'index'
        };
        $scope.getTpl = app.getFile('user-index.html');
        $scope.setTpl = function (tpl, operate) {
            $scope.getTpl = app.getFile(tpl);
            if (operate) {
                $scope.userOperate.Uid = operate;
            }
        };
        $scope.checkRead = function (articleList, readtimestamp) {
            var newArticle = 0;
            for (var i = articleList.length - 1; i >= 0; i--) {
                if (articleList[i].updateTime < readtimestamp) {
                    articleList[i].read = 'muted';
                } else {
                    newArticle += 1;
                }
            };
            return newArticle;
        };
        $scope.help = {
            title: '关注更新',
            content: '这里显示您关注的标签或用户的最新文章。'
        };
        $scope.user = $scope.global.user;
        app.rootScope.global.loading = true;
        var result = app.rest.user.get({}, function () {
            var newArticle = 0;
            app.rootScope.global.loading = false;
            if (result.err) {
                app.rootScope.msg = result.err;
                return;
            }
            if (result.user) {
                $scope.global.user = result.user;
                $scope.user = $scope.global.user;
            }
            if (result.readtimestamp) {
                newArticle = $scope.checkRead(result.data, result.readtimestamp);
            }
            if (newArticle === 0) {
                $scope.help.title = '暂无更新，阅读时间线：' + app.filter('date')(result.readtimestamp, 'yyyy-MM-dd HH:mm');
            } else {
                $scope.help.title = newArticle + '更新，阅读时间线：' + app.filter('date')(result.readtimestamp, 'yyyy-MM-dd HH:mm');
            }
            $scope.data = result.data;
            $scope.pagination = result.pagination;
        });
        $scope.$on('update', function (event, doc) {
            event.stopPropagation();
            $scope.user.tagsList = [];
            app.union(doc, $scope.user);
        });
    }
]).controller('userCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var Uid;
        $scope.isMe = false;
        if ($routeParams.UID) {
            Uid = $routeParams.UID;
        } else {
            Uid = 'U' + $routeParams.ID;
        }
        $scope.userOperate = {
            Uid: Uid,
            OP: 'index'
        };
        $scope.getTpl = app.getFile('user-article.html');
        $scope.setTpl = function (tpl, operate) {
            $scope.getTpl = app.getFile(tpl);
            if (operate) {
                $scope.userOperate.OP = operate;
            }
        };
        app.rootScope.global.loading = true;
        app.getUser(Uid, function (result) {
            app.rootScope.global.loading = false;
            if (result.err) {
                app.rootScope.msg = result.err;
                return;
            }
            if (result.user) {
                $scope.checkIsFollow(result.user);
                $scope.user = result.user;
                if ($scope.global.user && $scope.global.user._id === result.user._id) {
                    app.location.path('/home');
                    return;
                }
            }
            $scope.data = result.data;
            $scope.pagination = result.pagination;
        });
    }
]).controller('userListCtrl', ['app', '$scope',
    function (app, $scope) {
        $scope.$on('pagination', function (event, doc) {
            event.stopPropagation();
            doc.Uid = $scope.userOperate.Uid;
            doc.OP = $scope.userOperate.OP;
            app.rootScope.global.loading = true;
            var result = app.rest.user.get(doc, function () {
                app.rootScope.global.loading = false;
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
                    app.rootScope.msg = result.err;
                }
            });
        });
        $scope.$watch('userOperate', function () {
            $scope.$emit('pagination', {
                n: 10,
                p: 1
            });
        }, true);
    }
]).controller('userArticleCtrl', ['app', '$scope',
    function (app, $scope) {
        $scope.$on('pagination', function (event, doc) {
            event.stopPropagation();
            doc.Uid = $scope.userOperate.Uid;
            doc.OP = $scope.userOperate.OP;
            app.rootScope.global.loading = true;
            var result = app.rest.user.get(doc, function () {
                app.rootScope.global.loading = false;
                if (result.err) {
                    result.err.url = '/';
                    app.rootScope.msg = result.err;
                    return;
                }
                if ($scope.checkRead && result.readtimestamp) {
                    $scope.checkRead(result.data, result.readtimestamp);
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
            app.rootScope.global.loading = true;
            var result = app.rest.article.remove({
                ID: article._id
            }, null, function () {
                app.rootScope.global.loading = false;
                if (result.remove) {
                    $scope.data.some(function (x, i) {
                        if (x._id === article._id) {
                            $scope.data.splice(i, 1);
                            return true;
                        }
                    });
                    app.rootScope.msg = {
                        name: '删除文章',
                        message: '已成功删除文章《' + article.title + '》！',
                        type: 'success'
                    }
                } else {
                    app.rootScope.msg = result.err;
                }
            });
        };
    }
]).controller('userEditCtrl', ['app', '$scope',
    function (app, $scope) {
        var originData = {},
            tagsArray = [];

        function initTags(tagsList) {
            tagsArray = [];
            angular.forEach(tagsList, function (value, key) {
                tagsArray[key] = value.tag;
            });
            $scope.tagsList = app.union(tagsArray);
        };
        $scope.editSave = false;
        $scope.sexArray = ['male', 'female'];
        $scope.user = app.union($scope.global.user);
        originData = app.union($scope.global.user);
        initTags($scope.user.tagsList);
        $scope.checkResult = false;
        $scope.$watch('tagsList', function () {
            if ($scope.tagsList.length > $scope.global.UserTagsMax) {
                $scope.tagsList = $scope.tagsList.slice(0, $scope.global.UserTagsMax);
            }
        });
        $scope.$watch('user.desc', function () {
            $scope.descBytes = app.filter('length')($scope.user.desc);
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
            $scope.user = app.union(originData);
            $scope.editSave = false;
        };
        $scope.verifyEmail = function () {
            app.rootScope.global.loading = true;
            var verify = app.rest.user.save({
                Uid: 'reset'
            }, {
                request: 'role'
            }, function () {
                app.rootScope.global.loading = false;
                if (!verify.err) {
                    verify.name = '请求成功';
                    app.rootScope.msg = verify;
                } else {
                    app.rootScope.msg = verify.err;
                }
            });
        };
        $scope.submit = function () {
            var result, changeEmail,
                data = app.union($scope.user);
            $scope.editSave = false;
            angular.forEach(data, function (value, key) {
                if (angular.equals(value, originData[key])) {
                    delete data[key];
                }
            });
            if ($scope.user.desc) {
                $scope.user.desc = app.sanitize(app.mdParse($scope.user.desc), 1);
            }
            if ($scope.passwd && $scope.passwd2 === $scope.passwd) {
                data.passwd = CryptoJS.SHA256($scope.passwd).toString();
            }
            if (!angular.equals($scope.tagsList, tagsArray)) {
                data.tagsList = $scope.tagsList;
            }
            if (data.email) {
                app.rootScope.global.loading = true;
                changeEmail = app.rest.user.save({
                    Uid: 'reset'
                }, {
                    email: data.email,
                    request: 'email'
                }, function () {
                    app.rootScope.global.loading = false;
                    if (!changeEmail.err) {
                        app.union(originData, {
                            email: data.email
                        });
                        changeEmail.name = '请求成功';
                        app.rootScope.msg = changeEmail;
                    } else {
                        app.rootScope.msg = changeEmail.err;
                    }
                });
            }
            delete data.email;
            if (!angular.equals(data, {})) {
                app.rootScope.global.loading = true;
                result = app.rest.user.save({}, data, function () {
                    app.rootScope.global.loading = false;
                    if (!result.err) {
                        app.union(result, $scope.user);
                        originData = app.union($scope.user);
                        initTags($scope.user.tagsList);
                        $scope.$emit('update', result);
                        app.rootScope.msg = {
                            name: '请求成功',
                            message: '修改成功！'
                        };
                    } else {
                        app.rootScope.msg = result.err;
                    }
                });
            }
        };
    }
]).controller('articleCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
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
        var mdEditor = app.mdEditor();
        mdEditor.run();

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
        app.rootScope.global.loading = true;
        app.getArticle('A' + $routeParams.ID, function (article) {
            if (article.err) {
                article.err.url = app.goBack;
                app.rootScope.msg = article.err;
                return;
            }
            article.commentsList.forEach(function (x) {
                app.cache.article.put(x._id, x);
            });
            checkArticleIs(article);
            $scope.global.title2 = article.title;
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
            app.getUser(article.author._id, function (author) {
                app.rootScope.global.loading = false;
                if (author.err) {
                    app.rootScope.msg = author.err;
                    return;
                }
                $scope.checkIsFollow(author.user);
                $scope.article.author = author.user;
                $scope.authorArticles = author.data;
            });
        });
        app.getList('hots', function (list) {
            if (!list.err) {
                $scope.hotArticles = list.data;
            } else {
                app.rootScope.msg = list.err;
            }
        });
        $scope.wmdHelp = function (s) {
            if (s === 'preview') {
                $scope.wmdShow = 'preview';
                $scope.replyTitle = '文章预览';
                mdEditor.refreshPreview();
            } else if (s === 'help') {
                $scope.wmdShow = 'help';
                app.getMarkdown(function (data) {
                    $scope.replyTitle = data.title;
                    $scope.markdownHelp = data.content;
                    app.rootScope.msg = data.err;
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
                $scope.title = '评论：' + app.filter('cutText')(article.title, $scope.global.TitleMaxLen - 9);
                angular.element(document.getElementById('comments')).prepend(angular.element(document.getElementById('reply')));
                app.location.hash('comments');
                app.anchorScroll();
            } else {
                $scope.replyToComment = article._id;
                $scope.title = '评论：' + app.filter('cutText')(app.sanitize(app.mdParse(article.content.trim()), 0), $scope.global.TitleMaxLen - 9);
                dom.append(angular.element(document.getElementById('reply')));
            }
            $scope.replyTitle = $scope.title;
            if (!app.rootScope.global.isLogin) {
                app.rootScope.msg = Errmsg;
                return;
            }
        };
        $scope.$watch('content', function (content) {
            if (typeof content !== 'string') {
                $scope.contentBytes = 0;
                content = '';
            }
            $scope.contentBytes = app.filter('length')(content);
            if ($scope.contentBytes >= $scope.global.ContentMinLen && $scope.contentBytes <= $scope.global.ContentMaxLen) {
                $scope.editSave = true;
            } else {
                $scope.editSave = false;
            }
            $scope.content = content;
        });
        $scope.$on('pagination', function (event, doc) {
            event.stopPropagation();
            doc.ID = $scope.article._id;
            doc.OP = 'comment';
            app.rootScope.global.loading = true;
            var result = app.rest.article.get(doc, function () {
                app.rootScope.global.loading = false;
                if (!result.err) {
                    $scope.pagination = result.pagination;
                    $scope.article.commentsList = $scope.article.commentsList.concat(result.data).slice(-200);
                } else {
                    app.rootScope.msg = result.err;
                }
            });
        });
        $scope.getComments = function (idArray, to) {
            if (idArray.length === 0) {
                return;
            }
            $scope.referComments = [];
            var dom = angular.element(document.getElementById(to._id));
            var refer = angular.element(document.getElementById('refer-comments'));
            if (dom.children('#refer-comments').length > 0) {
                angular.element(document.getElementById('comments')).append(refer);
                return;
            } else {
                dom.append(refer);
            }
            idArray = app.union(idArray);
            if (!angular.isArray(idArray)) {
                idArray = [idArray];
            }
            idArray.forEach(function (x, i) {
                var comment = app.cache.article.get(x);
                if (comment) {
                    checkArticleIs(comment);
                    $scope.referComments.push(comment);
                    delete idArray[i];
                }
            });
            app.digestArray(idArray);
            if (idArray.length > 0) {
                app.rootScope.global.loading = true;
                var result = app.rest.article.save({
                    ID: 'comment'
                }, {
                    data: idArray
                }, function () {
                    app.rootScope.global.loading = false;
                    if (result.data) {
                        result.data.forEach(function (x) {
                            app.cache.article.put(x._id, x);
                            checkArticleIs(x);
                        })
                        $scope.referComments = $scope.referComments.concat(result.data).slice(-200);
                    } else if (result.err) {
                        app.rootScope.msg = result.err;
                    }
                });
            }
        };
        $scope.setMark = function (article) {
            var result;
            if (!app.rootScope.global.isLogin) {
                app.rootScope.msg = Errmsg;
                return;
            }
            app.rootScope.global.loading = true;
            result = app.rest.article.save({
                ID: article._id,
                OP: 'mark'
            }, {
                mark: !article.isMark
            }, function () {
                app.rootScope.global.loading = false;
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
                    app.rootScope.msg = result.err;
                }
            });
        };
        $scope.setFavor = function (article) {
            var result;
            if (!app.rootScope.global.isLogin) {
                app.rootScope.msg = Errmsg;
                return;
            }
            app.rootScope.global.loading = true;
            result = app.rest.article.save({
                ID: article._id,
                OP: 'favor'
            }, {
                favor: !article.isFavor
            }, function () {
                app.rootScope.global.loading = false;
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
                    app.rootScope.msg = result.err;
                }
            });
        };
        $scope.setOppose = function (article) {
            var result;
            if (!app.rootScope.global.isLogin) {
                app.rootScope.msg = Errmsg;
                return;
            }
            app.rootScope.global.loading = true;
            result = app.rest.article.save({
                ID: article._id,
                OP: 'oppose'
            }, {
                oppose: !article.isOppose
            }, function () {
                app.rootScope.global.loading = false;
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
                    app.rootScope.msg = result.err;
                }
            });
        };
        $scope.submit = function () {
            if (!$scope.editSave) {
                return;
            }
            if (!app.rootScope.global.isLogin) {
                app.rootScope.msg = Errmsg;
                return;
            }
            var data = {};
            data.content = document.getElementById('wmd-input').value;
            data.title = $scope.title;
            data.refer = $scope.refer;
            app.rootScope.global.loading = true;
            var result = app.rest.article.save({
                ID: $scope.article._id,
                OP: 'comment'
            }, data, function () {
                app.rootScope.global.loading = false;
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
                    app.cache.article.put($scope.article._id, $scope.article);
                    $scope.replyToComment = false;
                    $scope.title = '评论：' + app.filter('cutText')($scope.article.title, $scope.global.TitleMaxLen - 9);
                    $scope.content = '';
                    angular.element(document.getElementById('comments')).prepend(angular.element(document.getElementById('reply')));
                } else {
                    app.rootScope.msg = result.err;
                }
            });
        };
    }
]).controller('articleEditorCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        if (app.goBack === app.location.path()) {
            app.goBack = '/';
        }
        if (!app.rootScope.global.isLogin) {
            app.location.path(app.goBack);
        }

        $scope.previewTitle = '文章预览';
        $scope.markdownHelp = null;
        $scope.titleBytes = 0;
        $scope.contentBytes = 0;
        $scope.title = '';
        $scope.content = '';
        $scope.tagsList = [];
        $scope.editSave = false;
        app.rootScope.global.fullWidth = 'full-container';

        if ($routeParams.ID) {
            app.rootScope.global.loading = true;
            app.getArticle('A' + $routeParams.ID, function (article) {
                app.rootScope.global.loading = false;
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
                    app.rootScope.msg = article.err;
                }
            });
        }

        var mdEditor = app.mdEditor();
        mdEditor.run();
        $scope.$watch('title', function (title) {
            if (typeof title !== 'string') {
                $scope.titleBytes = 0;
                title = '';
            }
            $scope.titleBytes = app.filter('length')(title);
            while ($scope.titleBytes > $scope.global.TitleMaxLen) {
                title = title.slice(0, -1);
                $scope.titleBytes = app.filter('length')(title);
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
                content = '';
            }
            $scope.contentBytes = app.filter('length')(content);
            if ($scope.titleBytes >= $scope.global.TitleMinLen && $scope.titleBytes <= $scope.global.TitleMaxLen && $scope.contentBytes >= $scope.global.ContentMinLen && $scope.contentBytes <= $scope.global.ContentMaxLen) {
                $scope.editSave = true;
            } else {
                $scope.editSave = false;
            }
            $scope.content = content;
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
                mdEditor.refreshPreview();
            } else {
                app.getMarkdown(function (data) {
                    $scope.previewTitle = data.title;
                    $scope.markdownHelp = data.content;
                    app.rootScope.msg = data.err;
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
            //data.content = $scope.content;
            data.content = document.getElementById('wmd-input').value;
            data.title = app.sanitize($scope.title.trim(), 0);
            data.tagsList = $scope.tagsList;
            data.refer = $scope.refer;
            data._id = $scope._id;
            if ($routeParams.ID) {
                parameter = {
                    ID: 'A' + $routeParams.ID,
                    OP: 'edit'
                };
            }
            app.rootScope.global.loading = true;
            var result = app.rest.article.save(parameter, data, function () {
                app.rootScope.global.loading = false;
                if (!result.err) {
                    app.cache.article.put(result._id, result);
                    app.location.path('/' + result._id);
                } else {
                    app.rootScope.msg = result.err;
                }
            });
        };
    }
]).controller('adminCtrl', ['app', '$scope',
    function (app, $scope) {
        if (!app.rootScope.global.isEditor) {
            app.location.path('/');
        }
        $scope.getTpl = app.getFile('admin-index.html');
        $scope.setTpl = function (tpl) {
            $scope.getTpl = app.getFile(tpl);
        };
    }
]).controller('adminUserCtrl', ['app', '$scope',
    function (app, $scope) {
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
            app.rootScope.global.loading = true;
            var result = app.rest.user.get(doc, function () {
                app.rootScope.global.loading = false;
                if (!result.err) {
                    $scope.data = result.data;
                    originData = app.union($scope.data);
                    app.union(result.pagination, $scope.pagination);
                } else {
                    app.rootScope.msg = result.err;
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
            $scope.data = app.union(originData);
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
                }
            ];
            $scope.editEmail = false;
            $scope.editRole = false;
            $scope.editSave = false;
            var data = app.union($scope.data);
            originData = app.intersect(app.union(defaultObj), originData);
            data = app.intersect(app.union(defaultObj), data);
            angular.forEach(data, function (value, key) {
                if (angular.equals(value, originData[key])) {
                    delete data[key];
                }
            });
            app.complement(data, originData, [{
                    _id: ''
                }
            ]);
            app.rootScope.global.loading = true;
            var result = app.rest.user.save({
                Uid: 'admin'
            }, {
                data: data
            }, function () {
                app.rootScope.global.loading = false;
                if (!result.err) {
                    $scope.data = app.union(result.data);
                    originData = app.union(result.data);
                    app.rootScope.msg = {
                        name: '请求成功',
                        message: '修改成功！'
                    };
                } else {
                    app.rootScope.msg = result.err;
                }
            });
        };
    }
]).controller('adminTagCtrl', ['app', '$scope',
    function (app, $scope) {
        var originData = {};
        $scope.data = null;
        $scope.pagination = null;
        $scope.$on('pagination', function (event, doc) {
            event.stopPropagation();
            app.rootScope.global.loading = true;
            var result = app.rest.tag.get(doc, function () {
                app.rootScope.global.loading = false;
                if (!result.err) {
                    $scope.data = result.data;
                    originData = app.union(result.data);
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
                    app.rootScope.msg = result.err;
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
            app.rootScope.global.loading = true;
            var result = app.rest.tag.remove({
                ID: tag._id
            }, null, function () {
                app.rootScope.global.loading = false;
                if (result.remove) {
                    $scope.data.some(function (x, i) {
                        if (x._id === tag._id) {
                            $scope.data.splice(i, 1);
                            return true;
                        }
                    });
                    originData = app.union($scope.data);
                    app.rootScope.msg = {
                        name: '删除标签',
                        message: '已成功删除标签：' + tag.tag + '！',
                        type: 'success'
                    }
                } else {
                    app.rootScope.msg = result.err;
                }
            });
        };
        $scope.submit = function () {
            var defaultObj = [{
                    _id: '',
                    tag: ''
                }
            ];
            $scope.editTag = false;
            $scope.editSave = false;
            var data = app.union($scope.data);
            originData = app.intersect(app.union(defaultObj), originData);
            data = app.intersect(app.union(defaultObj), data);
            angular.forEach(data, function (value, key) {
                if (angular.equals(value, originData[key])) {
                    delete data[key];
                }
            });
            app.digestArray(data);
            app.rootScope.global.loading = true;
            var result = app.rest.tag.save({
                ID: 'admin'
            }, {
                data: data
            }, function () {
                app.rootScope.global.loading = false;
                if (!result.err) {
                    $scope.data = app.union(result.data);
                    originData = app.union(result.data);
                    app.rootScope.msg = {
                        name: '请求成功',
                        message: '修改成功！'
                    };
                } else {
                    app.rootScope.msg = result.err;
                }
            });
        };
    }
]).controller('adminArticleCtrl', ['app', '$scope',
    function (app, $scope) {

    }
]).controller('adminGlobalCtrl', ['app', '$scope',
    function (app, $scope) {
        var originData = {};
        app.rootScope.global.loading = true;
        $scope.global = app.rest.index.get({
            OP: 'admin'
        }, function () {
            app.rootScope.global.loading = false;
            $scope.global = app.union($scope.global);
            originData = app.union($scope.global);
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
            app.rootScope.msg = null;
        }
        $scope.setClass = function (b) {
            return b ? 'btn-warning' : 'btn-success';
        };
        $scope.reset = function () {
            $scope.global = app.union(originData);
            $scope.editSave = false;
        };
        $scope.submit = function () {
            var data = app.union($scope.global);
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
            app.rootScope.global.loading = true;
            var result = app.rest.index.save({
                OP: 'admin'
            }, data, function () {
                app.rootScope.global.loading = false;
                if (!result.err) {
                    $scope.global = app.union(result);
                    originData = app.union(result);
                    var clone = app.union($scope.global);
                    app.intersect(clone, $scope.global);
                    app.union(clone, $scope.global);
                    app.rootScope.msg = {
                        name: '请求成功',
                        message: '修改成功！'
                    };
                } else {
                    app.rootScope.msg = result.err;
                }
            });
        };
    }
]);