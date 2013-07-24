'use strict';
/*global angular, _*/

angular.module('jsGen.controllers', ['ui.validate']).
controller('indexCtrl', ['app', '$scope', '$routeParams', 'getList',
    function (app, $scope, $routeParams, getList) {
        var ID = '',
            restAPI = app.restAPI.article,
            myConf = app.myConf,
            global = app.rootScope.global;

        function checkRouteParams() {
            var path = app.location.path().slice(1).split('/');
            if ($routeParams.TAG || (/^T[0-9A-Za-z]{3,}$/).test(path[0])) {
                restAPI = app.restAPI.tag;
                $scope.other._id = path[0];
                $scope.other.title = $routeParams.TAG || path[0];
                $scope.parent.viewPath = '';
            } else {
                restAPI = app.restAPI.article;
                $scope.parent.viewPath = path[0] || 'latest';
            }
            ID = $routeParams.TAG || path[0];
        }

        function getArticleList() {
            app.promiseGet({
                ID: ID,
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize()
            }, restAPI, app.location.url(), app.cache.list).then(function (data) {
                var pagination = data.pagination || {};
                if (data.tag) {
                    $scope.other.title = data.tag.tag;
                    $scope.other._id = data.tag._id;
                }
                pagination.locationPath = app.location.path();
                pagination.sizePerPage = [10, 20, 50];
                pagination.pageSize = myConf.pageSize(pagination.pageSize);
                $scope.pagination = pagination;
                $scope.articleList = data.data;
            });
        }

        global.title2 = global.description;
        $scope.parent = {
            getTpl: app.getFile.html('index-article.html'),
            viewPath: 'latest',
            listModel: myConf.listModel()
        };
        $scope.other = {};
        $scope.pagination = {};

        $scope.setListModel = function () {
            var parent = $scope.parent;
            parent.listModel = myConf.listModel(!parent.listModel);
            myConf.pageSize(parent.listModel ? 20 : 10);
            getArticleList();
        };

        checkRouteParams();
        getArticleList();
        getList('comment').then(function (data) {
            data = data.data;
            app.each(data, function (x, i) {
                x.content = app.ngFilter('cutText')(x.content, 180);
            });
            $scope.hotComments = data.slice(0, 10);
        });
    }
]).controller('tagCtrl', ['app', '$scope', '$routeParams', 'getList',
    function (app, $scope, $routeParams, getList) {
        var restAPI = app.restAPI.tag,
            myConf = app.myConf;

        $scope.parent = {
            getTpl: app.getFile.html('index-tag.html')
        };
        $scope.pagination = {};

        app.promiseGet({
            p: $routeParams.p,
            s: $routeParams.s || myConf.pageSize(0, 'tag') || myConf.pageSize(50, 'tag')
        }, restAPI, app.location.url(), app.cache.list).then(function (data) {
            var pagination = data.pagination || {};
            pagination.locationPath = app.location.path();
            pagination.pageSize = myConf.pageSize(pagination.pageSize);
            $scope.pagination = pagination;
            $scope.tagList = data.data;
        });

        getList('comment').then(function (data) {
            data = data.data;
            app.each(data, function (x, i) {
                x.content = app.ngFilter('cutText')(x.content, 180);
            });
            $scope.hotComments = data.slice(0, 10);
        });
    }
]).controller('userLoginCtrl', ['app', '$scope',
    function (app, $scope) {
        app.clearUser();
        $scope.login = {
            logauto: true,
            logname: '',
            logpwd: ''
        };
        $scope.reset = {
            title: '',
            type: ''
        };

        $scope.submit = function () {
            if (app.validate($scope)) {
                var data = app.union($scope.login);
                data.logtime = Date.now() - app.timeOffset;
                data.logpwd = app.CryptoJS.SHA256(data.logpwd).toString();
                data.logpwd = app.CryptoJS.HmacSHA256(data.logpwd, data.logname + ':' + data.logtime).toString();

                app.restAPI.user.save({
                    ID: 'login'
                }, data, function (data) {
                    app.rootScope.global.user = data.data;
                    app.checkUser();
                    $scope.$destroy();
                    app.location.path('/home');
                }, function (data) {
                    $scope.reset.type = data.error.name;
                    $scope.reset.title = app.locale.RESET[data.error.name];
                });
            }
        };
    }
]).controller('userResetCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var timing,
            locale = app.locale;

        function showModal() {
            $scope.timingModal.modal(true);
            timing = app.timing(function (count, times) {
                $scope.parent.timing = times - count;
            }, 1000, $scope.parent.timing);
            timing.then(function () {
                $scope.timingModal.modal(false);
                app.location.search({}).path('/');
            });
        }

        $scope.reset = {
            name: '',
            email: '',
            request: $routeParams.req
        };
        $scope.parent = {
            title: locale.RESET[$routeParams.req],
            timing: 3
        };
        $scope.timingModal = {
            confirmBtn: locale.BTN_TEXT.goBack,
            confirmFn: function () {
                app.timing.cancel(timing);
                app.timing(null, 100, 1).then(function () {
                    app.rootScope.goBack();
                });
                return true;
            },
            cancelBtn: locale.BTN_TEXT.cancel,
            cancelFn: function () {
                return app.timing.cancel(timing);
            }
        };
        $scope.submit = function () {
            if (app.validate($scope)) {
                app.restAPI.user.save({
                    ID: 'reset'
                }, $scope.reset, function (data) {
                    app.toast.success(locale.RESET.email, locale.RESPONSE.success);
                    showModal();
                });
            }
        };
        if (['locked', 'passwd'].indexOf($routeParams.req) < 0) {
            app.restAPI.user.get({
                ID: 'reset',
                OP: $routeParams.req
            }, function () {
                app.toast.success(3 + locale.TIMING.goHome, locale.RESPONSE.success);
                app.timing(null, 1000, 3).then(function () {
                    app.location.search({}).path('/home');
                });
            }, showModal);
        }
    }
]).controller('userRegisterCtrl', ['app', '$scope',
    function (app, $scope) {
        app.clearUser();
        $scope.user = {
            name: '',
            email: '',
            passwd: '',
            passwd2: ''
        };

        $scope.checkName = function (scope, model) {
            return app.ngFilter('checkName')(model.$value);
        };
        $scope.checkMin = function (scope, model) {
            return app.ngFilter('length')(model.$value) >= 5;
        };
        $scope.checkMax = function (scope, model) {
            return app.ngFilter('length')(model.$value) <= 15;
        };
        $scope.submit = function () {
            var user = $scope.user;
            if (app.validate($scope)) {
                var data = {
                    name: user.name,
                    email: user.email
                };
                data.passwd = app.CryptoJS.SHA256(user.passwd).toString();

                app.restAPI.user.save({
                    ID: 'register'
                }, data, function (data) {
                    app.rootScope.global.user = data.data;
                    app.checkUser();
                    $scope.$destroy();
                    app.location.path('/home');
                });
            }
        };
    }
]).controller('homeCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {

        function tplName() {
            switch ($routeParams.OP) {
            case 'follow':
            case 'fans':
                return 'user-list.html';
            case 'detail':
                return 'user-edit.html';
            case 'article':
            case 'comment':
            case 'mark':
                return 'user-article.html';
            default:
                return 'user-article.html';
            }
        }
        if (!app.rootScope.global.isLogin) {
            return app.location.search({}).path('/');
        }
        $scope.parent = {
            getTpl: app.getFile.html(tplName()),
            isMe: true,
            viewPath: $routeParams.OP || 'index'
        };
        $scope.user = $scope.global.user;
    }
]).controller('userCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        function tplName() {
            switch ($routeParams.OP) {
            case 'fans':
                return 'user-list.html';
            case 'article':
                return 'user-article.html';
            default:
                return 'user-article.html';
            }
        }
        $scope.parent = {
            getTpl: app.getFile.html(tplName()),
            isMe: false,
            viewPath: $routeParams.OP || 'index'
        };

        $scope.user = app.cache.user.get('U' + $routeParams.ID) || {};
        $scope.$on('updateUser', function (event, user) {
            event.stopPropagation();
            app.union($scope.user, user);
            app.cache.user.put($scope.user._id, $scope.user);
        });
    }
]).controller('userListCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var restAPI = app.restAPI.user,
            myConf = app.myConf,
            locale = app.locale;

        $scope.parent = {
            title: ''
        };

        app.promiseGet({
            ID: $routeParams.ID && 'U' + $routeParams.ID || $routeParams.OP,
            OP: $routeParams.OP,
            p: $routeParams.p,
            s: $routeParams.s || myConf.pageSize(0, 'user') || myConf.pageSize(20, 'user')
        }, restAPI, app.location.url(), app.cache.list).then(function (data) {
            var pagination = data.pagination || {};

            pagination.locationPath = app.location.path();
            pagination.pageSize = myConf.pageSize(pagination.pageSize);
            pagination.sizePerPage = [10, 20, 50];
            $scope.pagination = pagination;
            if (data.user) {
                $scope.$emit('updateUser', data.user);
            }
            app.each(data.data, function (x) {
                app.checkFollow(x);
            });
            if (!$routeParams.ID) {
                $scope.parent.title = locale.HOME_TITLE[$routeParams.OP];
            } else {
                $scope.parent.title = data.user.name + locale.USER_TITLE[$routeParams.OP || 'fans'];
            }
            $scope.userList = data.data;
        });
    }
]).controller('userArticleCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var restAPI = app.restAPI.user,
            myConf = app.myConf,
            locale = app.locale;

        function getArticleList() {
            app.promiseGet({
                ID: $routeParams.ID && 'U' + $routeParams.ID || $routeParams.OP,
                OP: $routeParams.OP,
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize()
            }, restAPI, app.location.url(), app.cache.list).then(function (data) {
                var newArticles = 0,
                    pagination = data.pagination || {};

                pagination.locationPath = app.location.path();
                pagination.pageSize = myConf.pageSize(pagination.pageSize);
                pagination.sizePerPage = [10, 20, 50];
                $scope.pagination = pagination;
                if (data.user) {
                    $scope.$emit('updateUser', data.user);
                }
                if (!$routeParams.ID) {
                    app.each(data.data, function (x) {
                        if (data.readtimestamp > 0) {
                            x.read = x.updateTime < data.readtimestamp;
                            newArticles += !x.read;
                        }
                        app.checkAuthor(x);
                    });
                    $scope.parent.title = locale.HOME_TITLE[$routeParams.OP] || newArticles + locale.HOME_TITLE.index + app.ngFilter('date')(data.readtimestamp, 'medium');
                } else {
                    $scope.parent.title = data.user.name + locale.USER_TITLE[$routeParams.OP || 'article'];
                }
                $scope.articleList = data.data;
            });
        }

        $scope.parent = {
            listModel: myConf.listModel(),
            title: ''
        };
        $scope.pagination = {};
        $scope.removeArticle = null;

        $scope.removeArticleModal = {
            confirmBtn: locale.BTN_TEXT.confirm,
            confirmFn: function () {
                app.restAPI.article.remove({
                    ID: $scope.removeArticle._id
                }, function () {
                    app.some($scope.articleList, function (x, i, list) {
                        if (x._id === $scope.removeArticle._id) {
                            list.splice(i, 1);
                            app.toast.success(locale.ARTICLE.removed + $scope.removeArticle.title, locale.RESPONSE.success);
                            return true;
                        }
                    });
                    $scope.removeArticle = null;
                });
                return true;
            },
            cancelBtn: locale.BTN_TEXT.cancel,
            cancelFn: function () {
                $scope.removeArticle = null;
                return true;
            }
        };
        $scope.setListModel = function () {
            var parent = $scope.parent;
            parent.listModel = myConf.listModel(!parent.listModel);
            myConf.pageSize(parent.listModel ? 20 : 10);
            getArticleList();
        };
        $scope.remove = function (article) {
            if (article.isAuthor) {
                $scope.removeArticle = article;
                $scope.removeArticleModal.modal(true);
            }
        };

        getArticleList();
    }
]).controller('userEditCtrl', ['app', '$scope',
    function (app, $scope) {
        var originData = {},
            tagsArray = [],
            locale = app.locale,
            user = {
                avatar: '',
                name: '',
                sex: '',
                email: '',
                desc: '',
                passwd: '',
                tagsList: ['']
            };

        function initUser() {
            originData = app.union($scope.global.user);
            app.each(originData.tagsList, function (x, i, list) {
                list[i] = x.tag;
            });
            originData = app.intersect(app.union(user), originData);
            $scope.user = app.union(originData);
        }

        $scope.sexArray = ['male', 'female'];
        initUser();

        $scope.$watch('user', function (value) {
            app.checkDirty(user, originData, value);
        }, true);

        $scope.checkName = function (scope, model) {
            return app.ngFilter('checkName')(model.$value);
        };
        $scope.checkMin = function (scope, model) {
            return app.ngFilter('length')(model.$value) >= 5;
        };
        $scope.checkMax = function (scope, model) {
            return app.ngFilter('length')(model.$value) <= 15;
        };
        $scope.checkDesc = function (scope, model) {
            return app.ngFilter('length')(model.$value) <= $scope.global.SummaryMaxLen;
        };
        $scope.checkTag = function (scope, model) {
            return model.$value.length <= $scope.global.UserTagsMax;
        };
        $scope.getTag = function (tag) {
            var tagsList = $scope.user.tagsList;
            if (tagsList.indexOf(tag.tag) < 0 && tagsList.length < $scope.global.UserTagsMax) {
                $scope.user.tagsList = tagsList.concat(tag.tag); // 此处push方法不会更新tagsList视图
            }
        };
        $scope.reset = function () {
            $scope.user = app.union(originData);
        };
        $scope.verifyEmail = function () {
            var verify = app.restAPI.user.save({
                ID: 'reset'
            }, {
                request: 'role'
            }, function () {
                app.toast.success(locale.RESET.email, locale.RESPONSE.success);
            });
        };
        $scope.submit = function () {
            var result, changeEmail,
                data = app.union($scope.user);
            if (app.validate($scope)) {
                data = app.checkDirty(user, originData, data);
                if (app.isEmpty(data)) {
                    app.toast.info(locale.USER.noUpdate);
                } else {
                    if (data.passwd) {
                        data.passwd = app.CryptoJS.SHA256(data.passwd).toString();
                    }
                    if (data.email) {
                        app.restAPI.user.save({
                            ID: 'reset'
                        }, {
                            email: data.email,
                            request: 'email'
                        }, function () {
                            app.toast.success(locale.USER.email, locale.RESPONSE.success);
                        });
                        delete data.email;
                    }
                    if (!app.isEmpty(data)) {
                        app.restAPI.user.save({}, data, function (data) {
                            app.union($scope.global.user, data.data);
                            initUser();
                            app.toast.success(locale.USER.updated, locale.RESPONSE.success);
                        });
                    }
                }
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

                if (author.err) {
                    app.rootScope.msg = author.err;
                    return;
                }
                app.checkFollow(author.user);
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
                $scope.title = '评论：' + app.ngFilter('cutText')(article.title, $scope.global.TitleMaxLen - 9);
                angular.element(document.getElementById('comments')).prepend(angular.element(document.getElementById('reply')));
                app.location.hash('comments');
                app.anchorScroll();
            } else {
                $scope.replyToComment = article._id;
                $scope.title = '评论：' + app.ngFilter('cutText')(app.sanitize(app.mdParse(article.content.trim()), 0), $scope.global.TitleMaxLen - 9);
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
            $scope.contentBytes = app.ngFilter('length')(content);
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

            var result = app.restAPI.article.get(doc, function () {

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

                var result = app.restAPI.article.save({
                    ID: 'comment'
                }, {
                    data: idArray
                }, function () {

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

            result = app.restAPI.article.save({
                ID: article._id,
                OP: 'mark'
            }, {
                mark: !article.isMark
            }, function () {

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

            result = app.restAPI.article.save({
                ID: article._id,
                OP: 'favor'
            }, {
                favor: !article.isFavor
            }, function () {

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

            result = app.restAPI.article.save({
                ID: article._id,
                OP: 'oppose'
            }, {
                oppose: !article.isOppose
            }, function () {

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

            var result = app.restAPI.article.save({
                ID: $scope.article._id,
                OP: 'comment'
            }, data, function () {

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
                    $scope.title = '评论：' + app.ngFilter('cutText')($scope.article.title, $scope.global.TitleMaxLen - 9);
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

            app.getArticle('A' + $routeParams.ID, function (article) {

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
            $scope.titleBytes = app.ngFilter('length')(title);
            while ($scope.titleBytes > $scope.global.TitleMaxLen) {
                title = title.slice(0, -1);
                $scope.titleBytes = app.ngFilter('length')(title);
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
            $scope.contentBytes = app.ngFilter('length')(content);
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

            var result = app.restAPI.article.save(parameter, data, function () {

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

            var result = app.restAPI.user.get(doc, function () {

                if (!result.err) {
                    $scope.data = result.data;
                    originData = app.union($scope.data);
                    app.union($scope.pagination, result.pagination);
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
            }];
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
            }]);

            var result = app.restAPI.user.save({
                Uid: 'admin'
            }, {
                data: data
            }, function () {

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

            var result = app.restAPI.tag.get(doc, function () {

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

            var result = app.restAPI.tag.remove({
                ID: tag._id
            }, null, function () {

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
            }];
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

            var result = app.restAPI.tag.save({
                ID: 'admin'
            }, {
                data: data
            }, function () {

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

        $scope.global = app.restAPI.index.get({
            OP: 'admin'
        }, function () {

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

            var result = app.restAPI.index.save({
                OP: 'admin'
            }, data, function () {

                if (!result.err) {
                    $scope.global = app.union(result);
                    originData = app.union(result);
                    var clone = app.union($scope.global);
                    app.intersect(clone, $scope.global);
                    app.union($scope.global, clone);
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