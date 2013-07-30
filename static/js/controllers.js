'use strict';
/*global angular*/

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
            var params = {
                ID: ID,
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'index', 10)
            };

            app.promiseGet(params, restAPI, app.param(params), app.cache.list).then(function (data) {
                var pagination = data.pagination || {};
                if (data.tag) {
                    $scope.other.title = data.tag.tag;
                    $scope.other._id = data.tag._id;
                }
                pagination.path = app.location.path();
                pagination.pageSize = myConf.pageSize(pagination.pageSize, 'index');
                $scope.pagination = pagination;
                $scope.articleList = data.data;
            });
        }

        global.title2 = global.description;
        $scope.parent = {
            getTpl: app.getFile.html('index-article.html'),
            viewPath: 'latest',
            listModel: myConf.listModel(global.isPhone || null, 'index', false)
        };
        $scope.other = {};
        $scope.pagination = {};

        $scope.setListModel = function () {
            var parent = $scope.parent;
            parent.listModel = myConf.listModel(!parent.listModel, 'index');
            myConf.pageSize(parent.listModel ? 20 : 10, 'index');
            getArticleList();
        };

        checkRouteParams();
        getArticleList();
        getList('comment').then(function (data) {
            data = app.union(data.data);
            app.each(data, function (x, i) {
                x.content = app.filter('cutText')(app.trim(x.content, true), 180);
            });
            $scope.hotComments = data.slice(0, 6);
        });
    }
]).controller('tagCtrl', ['app', '$scope', '$routeParams', 'getList',
    function (app, $scope, $routeParams, getList) {
        var restAPI = app.restAPI.tag,
            myConf = app.myConf,
            params = {
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'tag', 50)
            };

        app.rootScope.global.title2 = app.locale.TAG.title;
        $scope.parent = {
            getTpl: app.getFile.html('index-tag.html')
        };
        $scope.pagination = {};

        app.promiseGet(params, restAPI, app.param(params), app.cache.list).then(function (data) {
            var pagination = data.pagination || {};
            pagination.path = app.location.path();
            pagination.pageSize = myConf.pageSize(pagination.pageSize, 'tag');
            pagination.sizePerPage = [50, 100, 200];
            $scope.pagination = pagination;
            $scope.tagList = data.data;
        });

        getList('comment').then(function (data) {
            data = app.union(data.data);
            app.each(data, function (x, i) {
                x.content = app.filter('cutText')(app.trim(x.content, true), 180);
            });
            $scope.hotComments = data.slice(0, 6);
        });
    }
]).controller('userLoginCtrl', ['app', '$scope',
    function (app, $scope) {
        app.clearUser();
        app.rootScope.global.title2 = app.locale.USER.login;
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

        app.rootScope.global.title2 = locale.USER.reset;
        $scope.reset = {
            name: '',
            email: '',
            request: $routeParams.req
        };
        $scope.parent = {
            title: locale.RESET[$routeParams.req],
            timing: 5
        };
        $scope.timingModal = {
            confirmBtn: locale.BTN_TEXT.goBack,
            confirmFn: function () {
                app.timing.cancel(timing);
                app.timing(null, 100, 1).then(function () {
                    app.location.search({}).path('/');
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
        var filter = app.filter,
            lengthFn = filter('length'),
            global = app.rootScope.global;

        app.clearUser();
        global.title2 = app.locale.USER.register;
        $scope.user = {
            name: '',
            email: '',
            passwd: '',
            passwd2: ''
        };

        $scope.checkName = function (scope, model) {
            return filter('checkName')(model.$value);
        };
        $scope.checkMin = function (scope, model) {
            return lengthFn(model.$value) >= 5;
        };
        $scope.checkMax = function (scope, model) {
            return lengthFn(model.$value) <= 15;
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
        var global = app.rootScope.global;

        if (!global.isLogin) {
            return app.location.search({}).path('/');
        }

        function tplName(path) {
            switch (path) {
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

        global.title2 = app.locale.HOME.title;
        $scope.user = global.user;
        $scope.parent = {
            getTpl: app.getFile.html(tplName($routeParams.OP)),
            isMe: true,
            viewPath: $routeParams.OP || 'index'
        };
    }
]).controller('userCtrl', ['app', '$scope', '$routeParams', 'getUser',
    function (app, $scope, $routeParams, getUser) {

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

        app.rootScope.global.title2 = app.locale.USER.title;
        $scope.parent = {
            getTpl: app.getFile.html(tplName()),
            isMe: false,
            viewPath: $routeParams.OP || 'index'
        };

        getUser('U' + $routeParams.ID).then(function (data) {
            $scope.user = data.data;
            app.rootScope.global.title2 = $scope.user.name + app.locale.USER.title;
        });
    }
]).controller('userListCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var restAPI = app.restAPI.user,
            myConf = app.myConf,
            locale = app.locale,
            params = {
                ID: $routeParams.ID && 'U' + $routeParams.ID || $routeParams.OP,
                OP: $routeParams.OP || 'fans',
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'user', 20)
            };

        $scope.parent = {
            title: ''
        };

        app.promiseGet(params, restAPI, app.param(params), app.cache.list).then(function (data) {
            var pagination = data.pagination || {};

            pagination.path = app.location.path();
            pagination.pageSize = myConf.pageSize(pagination.pageSize, 'user');
            $scope.pagination = pagination;
            app.each(data.data, function (x) {
                app.checkFollow(x);
            });
            if (!$routeParams.ID) {
                $scope.parent.title = locale.HOME[params.OP];
            } else {
                $scope.parent.title = data.user.name + locale.USER[params.OP];
            }
            $scope.userList = data.data;
        });
    }
]).controller('userArticleCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var restAPI = app.restAPI.user,
            myConf = app.myConf,
            locale = app.locale,
            global = app.rootScope.global;

        function getArticleList() {
            var params = {
                ID: $routeParams.ID && 'U' + $routeParams.ID || $routeParams.OP,
                OP: $routeParams.OP || ($routeParams.ID ? 'article' : 'index'),
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'home', 10)
            };
            app.promiseGet(params, restAPI, app.param(params), app.cache.list).then(function (data) {
                var newArticles = 0,
                    pagination = data.pagination || {};

                pagination.path = app.location.path();
                pagination.pageSize = myConf.pageSize(pagination.pageSize, 'home');
                $scope.pagination = pagination;
                if (!$routeParams.ID) {
                    var user = global.user || {};
                    app.each(data.data, function (x) {
                        if (data.readtimestamp > 0) {
                            x.read = x.updateTime < data.readtimestamp;
                            newArticles += !x.read;
                        }
                        x.isAuthor = x.author._id === user._id;
                    });
                    $scope.parent.title = params.OP !== 'index' ? locale.HOME[params.OP] : newArticles + locale.HOME.index + app.filter('date')(data.readtimestamp, 'medium');
                } else {
                    $scope.parent.title = data.user.name + locale.USER[params.OP];
                }
                $scope.articleList = data.data;
            });
        }

        $scope.parent = {
            listModel: myConf.listModel(global.isPhone || null, 'index', false),
            title: ''
        };
        $scope.pagination = {};
        $scope.removeArticle = null;

        $scope.removeArticleModal = {
            confirmBtn: locale.BTN_TEXT.confirm,
            confirmFn: function () {
                var article = $scope.removeArticle;
                app.restAPI.article.remove({
                    ID: article._id
                }, function () {
                    app.some($scope.articleList, function (x, i, list) {
                        if (x._id === article._id) {
                            list.splice(i, 1);
                            app.toast.success(locale.ARTICLE.removed + article.title, locale.RESPONSE.success);
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
            parent.listModel = myConf.listModel(!parent.listModel, 'home');
            myConf.pageSize(parent.listModel ? 20 : 10, 'home');
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
            filter = app.filter,
            global = app.rootScope.global,
            lengthFn = filter('length'),
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
            originData = app.union(global.user);
            app.each(originData.tagsList, function (x, i, list) {
                list[i] = x.tag;
            });
            originData = app.intersect(app.union(user), originData);
            $scope.user = app.union(originData);
            app.checkDirty(user, originData, $scope.user);
        }

        $scope.sexArray = ['male', 'female'];

        $scope.checkName = function (scope, model) {
            return filter('checkName')(model.$value);
        };
        $scope.checkMin = function (scope, model) {
            return lengthFn(model.$value) >= 5;
        };
        $scope.checkMax = function (scope, model) {
            return lengthFn(model.$value) <= 15;
        };
        $scope.checkDesc = function (scope, model) {
            return lengthFn(model.$value) <= global.SummaryMaxLen;
        };
        $scope.checkTag = function (scope, model) {
            var list = model.$value || '';
            list = angular.isString(list) ? list.split(/[,，、]/) : list;
            return list.length <= global.UserTagsMax;
        };
        $scope.getTag = function (tag) {
            var tagsList = $scope.user.tagsList;
            if (tagsList.indexOf(tag.tag) < 0 && tagsList.length < global.UserTagsMax) {
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
            var data = app.union($scope.user);
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
                            app.union(global.user, data.data);
                            initUser();
                            app.toast.success(locale.USER.updated, locale.RESPONSE.success);
                        });
                    } else {
                        initUser();
                    }
                }
            }
        };

        $scope.$watchCollection('user', function (value) {
            app.checkDirty(user, originData, value);
        });
        initUser();
    }
]).controller('articleCtrl', ['app', '$scope', '$routeParams', 'mdEditor', 'getList', 'getMarkdown',
    function (app, $scope, $routeParams, mdEditor, getList, getMarkdown) {
        var ID = 'A' + $routeParams.ID,
            myConf = app.myConf,
            locale = app.locale,
            global = app.rootScope.global,
            filter = app.filter,
            lengthFn = filter('length'),
            cutTextFn = filter('cutText'),
            commentCache = app.cache.comment,
            listCache = app.cache.list,
            restAPI = app.restAPI.article,
            user = global.user || {};

        user = {
            _id: user._id,
            name: user.name,
            avatar: user.avatar
        };

        function checkArticleIs(article) {
            var _id = user._id;
            if (!angular.isObject(article)) {
                return;
            }
            article.isAuthor = _id === article.author._id;
            article.isMark = app.some(article.markList, function (x) {
                return x._id === _id;
            });
            article.isFavor = app.some(article.favorsList, function (x) {
                return x._id === _id;
            });
            article.isOppose = app.some(article.opposesList, function (x) {
                return x._id === _id;
            });
            app.each(article.commentsList, function (x) {
                checkArticleIs(x);
            });
        }

        function checkLogin() {
            if (!global.isLogin) {
                app.toast.error(locale.USER.noLogin);
            }
            return global.isLogin;
        }

        function initReply() {
            var comment = $scope.comment,
                article = $scope.article;
            comment.replyToComment = '';
            comment.title = '评论：' + cutTextFn(article.title, global.TitleMaxLen - 9);
            comment.content = '';
            comment.refer = article._id;
            $scope.replyMoving.prependTo('#comments');
        }

        $scope.parent = {
            wmdPreview: false,
            contentBytes: 0,
            markdownHelp: ''
        };
        $scope.comment = {
            title: '',
            content: '',
            refer: '',
            replyToComment: ''
        };
        $scope.replyMoving = {};
        $scope.commentMoving = {};
        $scope.markdownModal = {
            title: locale.ARTICLE.markdown,
            cancelBtn: locale.BTN_TEXT.goBack,
            width: 720
        };
        $scope.validateTooltip = app.union(app.rootScope.validateTooltip);
        $scope.validateTooltip.placement = 'bottom';

        $scope.wmdHelp = function () {
            getMarkdown.success(function (data) {
                $scope.parent.markdownHelp = data;
                $scope.markdownModal.modal(true);
            });
        };
        $scope.wmdPreview = function () {
            $scope.parent.wmdPreview = !$scope.parent.wmdPreview;
            $scope.replyMoving.scrollIntoView(true);
        };
        $scope.checkContentMin = function (scope, model) {
            var length = lengthFn(model.$value);
            $scope.parent.contentBytes = length;
            return length >= global.ContentMinLen;
        };
        $scope.checkContentMax = function (scope, model) {
            return lengthFn(model.$value) <= global.ContentMaxLen;
        };
        $scope.reply = function (article) {
            var comment = $scope.comment;
            comment.refer = article._id;
            $scope.parent.wmdPreview = false;
            if (article._id === $scope.article._id) {
                initReply();
            } else {
                comment.replyToComment = article._id;
                comment.title = locale.ARTICLE.reply + cutTextFn(app.sanitize(app.mdParse(article.content), 0), global.TitleMaxLen - 9);
                $scope.replyMoving.appendTo('#' + article._id);
            }
            $scope.replyMoving.scrollIntoView();
        };
        $scope.getComments = function (idArray, to) {
            var idList = [],
                result = {};

            function getResult() {
                var list = [];
                app.each(idArray, function (x) {
                    if (result[x]) {
                        list.push(result[x]);
                    }
                });
                return list;
            }

            $scope.referComments = [];
            if (to && idArray && idArray.length > 0) {
                if ($scope.commentMoving.childrenOf('#' + to._id)) {
                    $scope.commentMoving.appendTo('#comments');
                    return;
                } else {
                    $scope.commentMoving.appendTo('#' + to._id);
                }
                app.each(idArray, function (x) {
                    var comment = commentCache.get(x);
                    if (comment) {
                        result[x] = comment;
                    } else {
                        idList.push(x);
                    }
                });
                $scope.referComments = getResult();
                if (idList.length > 0) {
                    restAPI.save({
                        ID: 'comment'
                    }, {
                        data: idList
                    }, function (data) {
                        app.each(data.data, function (x) {
                            checkArticleIs(x);
                            commentCache.put(x._id, x);
                            result[x._id] = x;
                        });
                        $scope.referComments = getResult();
                    });
                }
            }
        };
        $scope.highlight = function (article) {
            // this is todo
            article.status = article.status === 2 ? 1 : 2;
        };
        $scope.setMark = function (article) {
            if (checkLogin()) {
                restAPI.save({
                    ID: article._id,
                    OP: 'mark'
                }, {
                    mark: !article.isMark
                }, function () {
                    article.isMark = !article.isMark;
                    if (article.isMark) {
                        article.markList.push(user);
                    } else {
                        app.removeItem(user, '_id', article.markList);
                    }
                    app.toast.success(locale.ARTICLE[article.isMark ? 'marked' : 'unmarked']);
                });
            }
        };
        $scope.setFavor = function (article) {
            if (checkLogin()) {
                restAPI.save({
                    ID: article._id,
                    OP: 'favor'
                }, {
                    favor: !article.isFavor
                }, function () {
                    article.isFavor = !article.isFavor;
                    if (article.isFavor) {
                        article.favorsList.push(user);
                        app.removeItem(user, '_id', article.opposesList);
                        article.isOppose = false;
                    } else {
                        app.removeItem(user, '_id', article.favorsList);
                    }
                    app.toast.success(locale.ARTICLE[article.isFavor ? 'favored' : 'unfavored']);
                });
            }
        };
        $scope.setOppose = function (article) {
            if (checkLogin()) {
                restAPI.save({
                    ID: article._id,
                    OP: 'oppose'
                }, {
                    oppose: !article.isOppose
                }, function () {
                    article.isOppose = !article.isOppose;
                    if (article.isOppose) {
                        article.opposesList.push(user);
                        app.removeItem(user, '_id', article.favorsList);
                        article.isFavor = false;
                    } else {
                        app.removeItem(user, '_id', article.opposesList);
                    }
                    app.toast.success(locale.ARTICLE[article.isOppose ? 'opposed' : 'unopposed']);
                });
            }
        };
        $scope.submit = function () {
            if (checkLogin() && app.validate($scope)) {
                var data = app.union($scope.comment),
                    article = $scope.article;
                restAPI.save({
                    ID: article._id,
                    OP: 'comment'
                }, data, function (data) {
                    var comment = data.data,
                        replyToComment = $scope.comment.replyToComment;
                    article.commentsList.unshift(comment);
                    article.comments += 1;
                    article.updateTime = Date.now();
                    if (replyToComment) {
                        app.some(article.commentsList, function (x, i) {
                            if (replyToComment === x._id) {
                                article.commentsList[i].commentsList.push(comment._id);
                                return true;
                            }
                        });
                    }
                    commentCache.put(comment._id, comment);
                    initReply();
                });
            }
        };
        $scope.$on('genPagination', function (event, p, s) {
            event.stopPropagation();
            var params = {
                ID: ID,
                OP: 'comment',
                p: p,
                s: myConf.pageSize(s, 'comment', 10)
            };
            app.promiseGet(params, restAPI, app.param(params), listCache).then(function (data) {
                var pagination = data.pagination || {},
                    commentsList = data.data;
                pagination.pageSize = myConf.pageSize(pagination.pageSize, 'comment');
                $scope.pagination = pagination;
                app.each(commentsList, function (x) {
                    checkArticleIs(x);
                    commentCache.put(x._id, x);
                });
                $scope.article.commentsList = commentsList;
                app.anchorScroll.toView('#comments', true);
            });
        });

        mdEditor().run();
        app.promiseGet({
            ID: ID
        }, restAPI, ID, app.cache.article).then(function (data) {
            var pagination = data.pagination || {},
                article = data.data;
            pagination.pageSize = myConf.pageSize(pagination.pageSize, 'comments');
            checkArticleIs(article);
            app.each(article.commentsList, function (x) {
                commentCache.put(x._id, x);
            });
            global.title2 = article.title;
            $scope.pagination = pagination;
            $scope.article = article;
            initReply();

            app.promiseGet({
                ID: article.author._id,
                OP: 'article'
            }, app.restAPI.user, article.author._id, listCache).then(function (data) {
                var user = data.user,
                    author = $scope.article.author;
                app.checkFollow(user);
                app.union(author, user);
                author.articlesList = data.data;
            });
        });
        getList('hots').then(function (data) {
            $scope.hotArticles = data.data.slice(0, 10);
        });
    }
]).controller('articleEditorCtrl', ['app', '$scope', '$routeParams', 'mdEditor', 'getMarkdown',
    function (app, $scope, $routeParams, mdEditor, getMarkdown) {
        var ID = $routeParams.ID && 'A' + $routeParams.ID,
            toStr = app.toStr,
            locale = app.locale,
            global = app.rootScope.global,
            filter = app.filter,
            lengthFn = filter('length'),
            cutTextFn = filter('cutText'),
            restAPI = app.restAPI.article,
            articleCache = app.cache.article,
            article = {
                title: '',
                content: '',
                refer: '',
                tagsList: []
            },
            originData = app.union(article);

        if (!global.isLogin) {
            app.location.search({}).path('/');
        }

        function initArticle(data) {
            originData = app.union(article);
            if (data) {
                data = app.union(data);
                app.each(data.tagsList, function (x, i, list) {
                    list[i] = x.tag;
                });
                data.refer = data.refer && data.refer.url;
                app.intersect(originData, data);
            }
            $scope.article = app.union(originData);
            app.checkDirty(article, originData, $scope.article);
            preview(data);
        }

        function preview(value) {
            var parent = $scope.parent,
                article = $scope.article;
            if (value) {
                parent.title = locale.ARTICLE.preview + toStr(article.title);
                parent.content = article.content;
            } else {
                getMarkdown.success(function (data) {
                    parent.title = locale.ARTICLE.markdown;
                    parent.content = data;
                });
            }
        }

        global.title2 = app.locale.ARTICLE.title;
        $scope.parent = {
            edit: !! ID,
            wmdPreview: true,
            contentBytes: 0,
            titleBytes: 0,
            title: '',
            content: ''
        };

        $scope.validateTooltip = app.union(app.rootScope.validateTooltip);
        $scope.validateTooltip.placement = 'bottom';

        $scope.checkTitleMin = function (scope, model) {
            var length = lengthFn(model.$value);
            $scope.parent.titleBytes = length;
            if ($scope.parent.wmdPreview) {
                $scope.parent.title = locale.ARTICLE.preview + app.sanitize(app.trim(model.$value), 0);
            }
            return length >= global.TitleMinLen;
        };
        $scope.checkTitleMax = function (scope, model) {
            return lengthFn(model.$value) <= global.TitleMaxLen;
        };
        $scope.checkContentMin = function (scope, model) {
            var length = lengthFn(model.$value);
            $scope.parent.contentBytes = length;
            if ($scope.parent.wmdPreview) {
                $scope.parent.content = model.$value;
            }
            return length >= global.ContentMinLen;
        };
        $scope.checkContentMax = function (scope, model) {
            return lengthFn(model.$value) <= global.ContentMaxLen;
        };
        $scope.checkTag = function (scope, model) {
            var list = model.$value || '';
            list = angular.isString(list) ? list.split(/[,，、]/) : list;
            return list.length <= global.ArticleTagsMax;
        };
        $scope.getTag = function (tag) {
            var tagsList = $scope.article.tagsList;
            if (tagsList.indexOf(tag.tag) < 0 && tagsList.length < global.ArticleTagsMax) {
                $scope.article.tagsList = tagsList.concat(tag.tag); // 此处push方法不会更新tagsList视图
            }
        };

        $scope.wmdPreview = function () {
            var parent = $scope.parent;
            parent.wmdPreview = !parent.wmdPreview;
            preview(parent.wmdPreview);
        };

        $scope.submit = function () {
            var data = app.union($scope.article);
            if (app.validate($scope)) {
                if (app.checkDirty(article, originData, data)) {
                    data.title = app.sanitize(app.trim(data.title), 0);
                    restAPI.save({
                        ID: ID || 'index',
                        OP: ID && 'edit'
                    }, data, function (data) {
                        var article = data.data;
                        articleCache.put(article._id, data);
                        initArticle(article);
                        app.toast.success(locale.ARTICLE[ID ? 'updated' : 'added'] + article.title);
                        var timing = app.timing(null, 1000, 2);
                        timing.then(function () {
                            app.location.search({}).path('/' + article._id);
                        });
                    });
                } else {
                    app.toast.info(locale.ARTICLE.noUpdate);
                }
            }
        };

        $scope.$watchCollection('article', function (value) {
            app.checkDirty(article, originData, value);
        });

        mdEditor().run();
        if (ID) {
            app.promiseGet({
                ID: ID
            }, restAPI, ID, articleCache).then(function (data) {
                initArticle(data.data);
            });
        } else {
            initArticle();
        }
    }
]).controller('adminCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var global = app.rootScope.global,
            path = $routeParams.OP || 'index';

        if (!global.isEditor) {
            return app.location.search({}).path('/');
        }

        function tplName(path) {
            path = path === 'comment' ? 'article' : path;
            return 'admin-' + path + '.html';
        }

        $scope.parent = {
            getTpl: app.getFile.html(tplName(path)),
            viewPath: path
        };
        global.title2 = app.locale.ADMIN[path];
    }
]).controller('adminUserCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var originData = {},
            restAPI = app.restAPI.user,
            myConf = app.myConf,
            locale = app.locale,
            params = {
                ID: 'admin',
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'userAdmin', 20)
            },
            userList = [{
                _id: '',
                name: '',
                locked: false,
                email: '',
                role: 0,
                score: 0,
                date: 0,
                lastLoginDate: 0
            }];

        function initUserList(list) {
            originData = app.intersect(app.union(userList), list);
            $scope.userList = app.union(originData);
            $scope.parent.editSave = !! app.checkDirty(userList, originData, $scope.userList);
        }

        $scope.parent = {
            editSave: false,
            isSelectAll: false
        };
        $scope.pagination = {};
        $scope.roleArray = [0, 1, 2, 3, 4, 5];

        $scope.selectAll = function () {
            app.each($scope.userList, function (x) {
                x.isSelect = $scope.parent.isSelectAll;
            });
        };
        $scope.reset = function () {
            $scope.userList = app.union(originData);
        };
        $scope.submit = function () {
            var list = [{
                _id: '',
                locked: false,
                role: 0
            }];
            if (app.validate($scope)) {
                var data = app.checkDirty(userList, originData, $scope.userList);
                if (app.isEmpty(data)) {
                    app.toast.info(locale.USER.noUpdate);
                } else {
                    data = app.intersect(list, data);
                    restAPI.save({
                        ID: 'admin'
                    }, {
                        data: data
                    }, function (data) {
                        var updated = [];
                        app.each(data.data, function (x) {
                            app.some($scope.userList, function (y) {
                                if (x._id === y._id) {
                                    app.union(y, x);
                                    updated.push(x.name);
                                    return true;
                                }
                            });
                        });
                        initUserList($scope.userList);
                        app.toast.success(locale.USER.updated + updated.join(', '), locale.RESPONSE.success);
                    });
                }
            }
        };
        $scope.$watch('userList', function (value) {
            $scope.parent.editSave = !! app.checkDirty(userList, originData, value);
        }, true);
        app.promiseGet(params, restAPI).then(function (data) {
            var pagination = data.pagination || {};
            pagination.path = app.location.path();
            pagination.pageSize = myConf.pageSize(pagination.pageSize, 'userAdmin');
            pagination.sizePerPage = [20, 100, 200];
            $scope.pagination = pagination;
            initUserList(data.data);
        });
    }
]).controller('adminTagCtrl', ['app', '$scope', '$routeParams',
    function (app, $scope, $routeParams) {
        var originData = {},
            restAPI = app.restAPI.tag,
            myConf = app.myConf,
            locale = app.locale,
            params = {
                ID: 'index',
                p: $routeParams.p,
                s: $routeParams.s || myConf.pageSize(null, 'tagAdmin', 20)
            },
            tagList = [{
                _id: '',
                articles: 0,
                tag: '',
                users: 0
            }];

        function initTagList(list) {
            originData = app.union(app.union(tagList), list);
            $scope.tagList = app.union(originData);
            $scope.parent.editSave = !! app.checkDirty(tagList, originData, $scope.tagList);
        }

        $scope.parent = {
            editSave: false
        };
        $scope.pagination = {};
        $scope.removeTag = null;

        $scope.removeTagModal = {
            confirmBtn: locale.BTN_TEXT.confirm,
            confirmFn: function () {
                var tag = $scope.removeTag;
                restAPI.remove({
                    ID: tag._id
                }, function () {
                    app.some($scope.tagList, function (x, i, list) {
                        if (x._id === tag._id) {
                            list.splice(i, 1);
                            app.toast.success(locale.TAG.removed + tag.tag, locale.RESPONSE.success);
                            return true;
                        }
                    });
                    initTagList($scope.tagList);
                    $scope.removeTag = null;
                });
                return true;
            },
            cancelBtn: locale.BTN_TEXT.cancel,
            cancelFn: function () {
                $scope.removeTag = null;
                return true;
            }
        };

        $scope.checkTag = function (scope, model) {
            var tag = app.toStr(model.$value);
            return !/[,，、]/.test(tag);
        };
        $scope.checkTagMin = function (scope, model) {
            return app.filter('length')(model.$value) >= 3;
        };
        $scope.reset = function () {
            $scope.tagList = app.union(originData);
        };
        $scope.remove = function (tag) {
            $scope.removeTag = tag;
            $scope.removeTagModal.modal(true);
        };
        $scope.submit = function () {
            var list = [{
                _id: '',
                tag: ''
            }];
            if (app.validate($scope)) {
                var data = app.checkDirty(tagList, originData, $scope.tagList);
                if (app.isEmpty(data)) {
                    app.toast.info(locale.TAG.noUpdate);
                } else {
                    data = app.intersect(list, data);
                    restAPI.save({
                        ID: 'admin'
                    }, {
                        data: data
                    }, function (result) {
                        var updated = [];
                        app.each(data, function (x) {
                            var tag = result.data[x._id];
                            app.some($scope.tagList, function (y, i, list) {
                                if (x._id === y._id) {
                                    if (tag) {
                                        app.union(y, tag);
                                        updated.push(tag.tag);
                                    } else {
                                        list.splice(i, 1);
                                    }
                                    return true;
                                }
                            });
                        });
                        initTagList($scope.tagList);
                        app.toast.success(locale.TAG.updated + updated.join(', '), locale.RESPONSE.success);
                    });
                }
            }
        };

        $scope.$watch('tagList', function (value) {
            $scope.parent.editSave = !! app.checkDirty(tagList, originData, value);
        }, true);
        app.promiseGet(params, restAPI).then(function (data) {
            var pagination = data.pagination || {};
            pagination.path = app.location.path();
            pagination.pageSize = myConf.pageSize(pagination.pageSize, 'tagAdmin');
            pagination.sizePerPage = [20, 50, 100];
            $scope.pagination = pagination;
            initTagList(data.data);
        });
    }
]).controller('adminArticleCtrl', ['app', '$scope',
    function (app, $scope) {

    }
]).controller('adminGlobalCtrl', ['app', '$scope',
    function (app, $scope) {
        var originData = {},
            tagsArray = [],
            locale = app.locale,
            filter = app.filter,
            restAPI = app.restAPI.index,
            lengthFn = filter('length'),
            global = {
                domain: '',
                title: '',
                url: '',
                logo: '',
                email: '',
                description: '',
                metatitle: '',
                metadesc: '',
                keywords: '',
                robots: '',
                TimeInterval: 0,
                ArticleTagsMax: 0,
                UserTagsMax: 0,
                TitleMinLen: 0,
                TitleMaxLen: 0,
                SummaryMaxLen: 0,
                ContentMinLen: 0,
                ContentMaxLen: 0,
                UserNameMinLen: 0,
                UserNameMaxLen: 0,
                register: true,
                emailVerification: true,
                UsersScore: [null, null, null, null, null, null],
                ArticleStatus: [null, null],
                ArticleHots: [null, null, null, null, null],
                userCache: 0,
                articleCache: 0,
                commentCache: 0,
                listCache: 0,
                tagCache: 0,
                collectionCache: 0,
                messageCache: 0,
                paginationCache: [null, null],
                smtp: {
                    host: '',
                    secureConnection: true,
                    port: 0,
                    auth: {
                        user: '',
                        pass: ''
                    },
                    senderName: '',
                    senderEmail: ''
                }
            };


        function initglobal(data) {
            $scope.global = app.union(data);
            originData = app.union(data);
            originData = app.intersect(app.union(global), originData);
            $scope.editGlobal = app.union(originData);
            app.checkDirty(global, originData, $scope.editGlobal);
        }

        $scope.parent = {
            switchTab: 'tab1'
        };
        $scope.reset = function () {
            $scope.editGlobal = app.union(originData);
        };
        $scope.submit = function () {
            var data = app.union($scope.editGlobal);
            if (app.validate($scope)) {
                data = app.checkDirty(global, originData, data);
                if (app.isEmpty(data)) {
                    app.toast.info(locale.ADMIN.noUpdate);
                } else {
                    restAPI.save({
                        OP: 'admin'
                    }, data, function (data) {
                        initglobal(data.data);
                        var updated = app.union(originData);
                        delete updated.smtp;
                        delete updated.email;
                        app.union(app.rootScope.global, updated);
                        app.toast.success(locale.ADMIN.updated, locale.RESPONSE.success);
                    });
                }
            }
        };

        $scope.$watchCollection('editGlobal', function (value) {
            app.checkDirty(global, originData, value);
        });
        app.promiseGet({
            OP: 'admin'
        }, restAPI).then(function (data) {
            initglobal(data.data);
        });
    }
]);