'use strict';
/*global angular, _*/

angular.module('jsGen.directives', []).
directive('genParseMd', ['mdParse', 'sanitize', 'pretty',
    function (mdParse, sanitize, pretty) {
        // <div gen-parse-md="document"></div>
        // document是Markdown格式或一般文档字符串，解析成DOM后插入<div>
        return function (scope, element, attr) {
            scope.$watch(attr.genParseMd, function (value) {
                value = value + '';
                if (value) {
                    value = mdParse(value);
                    value = sanitize(value);
                    element.html(value);
                    element.find('pre').addClass('prettyprint'); // linenums have bug!
                    element.find('a').attr('target', function () {
                        if (this.host !== location.host) {
                            return '_blank';
                        }
                    });
                    pretty();
                } else {
                    element.html('');
                }
            });
        };
    }
]).
directive('genTabClick', function () {
    //<ul>
    //<li gen-tab-click="className"></li>
    //<li gen-tab-click="className"></li>
    //</ul>
    // 点击li元素时，该元素将赋予className类，并移除其它兄弟元素的className类
    return {
        link: function (scope, element, attr) {
            var className = attr.genTabClick;
            element.bind('click', function () {
                element.parent().children().removeClass(className);
                element.addClass(className);
            });
        }
    };
}).
directive('genPagination', ['getFile',
    function (getFile) {
        // <div gen-pagination="options"></div>
        // HTML/CSS基于Bootstrap框架
        // options = {
        //     locationPath: 'pathUrl',
        //     sizePerPage: [25, 50, 100],
        //     pageSize: 25,
        //     pageIndex: 1,
        //     total: 10
        // };
        return {
            scope: true,
            templateUrl: getFile.html('gen-pagination.html'),
            link: function (scope, element, attr) {
                scope.$watch(attr.genPagination, function (value) {
                    if (!angular.isObject(value)) {
                        return;
                    }
                    var i = 0, pageIndex = 1, showPages = [],
                        lastPage = Math.ceil(value.total / value.pageSize) || 1;

                    pageIndex = value.pageIndex >= 1 ? value.pageIndex : 1;
                    pageIndex = pageIndex <= lastPage ? pageIndex : lastPage;

                    showPages[0] = pageIndex;
                    if (pageIndex <= 6) {
                        while (showPages[0] > 1) {
                            showPages.unshift(showPages[0] - 1);
                        }
                    } else {
                        showPages.unshift(showPages[0] - 1);
                        showPages.unshift(showPages[0] - 1);
                        showPages.unshift('…');
                        showPages.unshift(2);
                        showPages.unshift(1);
                    }

                    if (lastPage - pageIndex <= 5) {
                        while (showPages[showPages.length - 1] < lastPage) {
                            showPages.push(showPages[showPages.length - 1] + 1);
                        }
                    } else {
                        showPages.push(showPages[showPages.length - 1] + 1);
                        showPages.push(showPages[showPages.length - 1] + 1);
                        showPages.push('…');
                        showPages.push(lastPage - 1);
                        showPages.push(lastPage);
                    }

                    scope.paginationPrev = pageIndex > 1 ? pageIndex - 1 : 0;
                    scope.paginationNext = pageIndex < lastPage ? pageIndex + 1 : 0;
                    scope.pageIndex = pageIndex;
                    scope.showPages = showPages;
                    scope.pageSize = value.pageSize;
                    scope.perPages = value.sizePerPage || [];
                    scope.locationPath = value.locationPath +'?p=';
                }, true);
            }
        };
    }
]).
directive('genModalMsg', ['getFile',
    function (getFile) {
        //<div gen-modal-msg="msgModal">[body]</div>
        // scope.msgModal = {
        //     id: 'msg-modal',    [required]
        //     title: 'message title',    [option]
        //     confirmBtn: 'confirm button name',    [option]
        //     confirmFn: function () {},    [option]
        //     cancelBtn: 'cancel button name',    [option]
        //     cancelFn: function () {}    [option]
        //     deleteBtn: 'delete button name',    [option]
        //     deleteFn: function () {}    [option]
        // };
        var uniqueModalId = 0;
        return {
            scope: true,
            transclude: true,
            templateUrl: getFile.html('gen-modal.html'),
            link: function (scope, element, attr) {
                var modalStatus,
                    modalElement = element.children(),
                    list = ['Confirm', 'Cancel', 'Delete'],
                    options = scope.$parent.$eval(attr.genModalMsg);

                function wrap(fn) {
                    return function () {
                        var value = angular.isFunction(fn) ? fn() : true;
                        showModal(!value);
                    };
                }

                function showModal(value) {
                    modalElement.modal(value ? 'show' : 'hide');
                }

                angular.extend(scope, options);
                options.modal = showModal;
                scope.id = scope.id || attr.genModalMsg + '-' + (uniqueModalId++);
                angular.forEach(list, function (name) {
                    var x = name.toLowerCase(),
                        cb = x + 'Cb',
                        fn = x + 'Fn',
                        btn = x + 'Btn';
                    scope[cb] = options[fn] && wrap(options[fn]);
                    scope[btn] = options[btn] || (options[fn] && name);
                });

                modalElement.on('shown', function (event) {
                    event.stopPropagation();
                    modalStatus = true;
                });
                modalElement.on('hidden', function (event) {
                    event.stopPropagation();
                    if (modalStatus && angular.isFunction(options.cancelFn)) {
                        options.cancelFn(); // when hide by other way, run cancelFn;
                    }
                    modalStatus = false;
                });
            }
        };
    }
]).
directive('genTooltip', ['$timeout',
    function ($timeout) {
        //<div data-original-title="tootip title" gen-tooltip="tootipOption"></div>
        // tootipOption = {
        //     validate: false, // if true, use for AngularJS validation
        //     validateMsg : {
        //         required: 'Required!',
        //         minlength: 'Too short!'
        //     }
        //     ...other bootstrap tooltip options
        // }
        return {
            require: '?ngModel',
            link: function (scope, element, attr, ctrl) {
                var enable = false,
                    option = scope.$eval(attr.genTooltip) || {};

                function invalidMsg(invalid) {
                    if (enable) {
                        var title = (ctrl.$name && ctrl.$name + ' ') || '';
                        ctrl.validate = option.validate;
                        invalid = ctrl.validate && invalid;
                        if (invalid && option.validateMsg) {
                            angular.forEach(ctrl.$error, function (value, key) {
                                title += (value && option.validateMsg[key] && option.validateMsg[key] + ', ') || '';
                            });
                        }
                        title = title.slice(0, -2) || attr.originalTitle || attr.title;
                        attr.$set('dataOriginalTitle', title ? title : '');
                        showTooltip(invalid);
                    } else {
                        showTooltip(false);
                    }
                }

                function validateFn(value) {
                    $timeout(function () {
                        invalidMsg(ctrl.$invalid);
                    });
                    return value;
                }

                function initTooltip() {
                    element.off('.tooltip').removeData('bs.tooltip');
                    element.tooltip(option);
                }

                function showTooltip(show) {
                    if (show) {
                        element.addClass('invalid-error').tooltip('show');
                    } else {
                        element.removeClass('invalid-error').tooltip('hide');
                    }
                }

                if (option.container === 'ngView') {
                    option.container = element.parents('.ng-view')[0] || element.parents('[ng-view]')[0];
                } else if (option.container === 'inner') {
                    option.container = element;
                }
                // use for AngularJS validation
                if (option.validate) {
                    option.template = '<div class="tooltip validate-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>';
                    option.trigger = 'manual';
                    option.placement = option.placement || 'right';
                    if (ctrl) {
                        ctrl.$formatters.push(validateFn);
                        ctrl.$parsers.push(validateFn);
                    } else {
                        scope.$watch(function () {
                            return attr.originalTitle || attr.dataOriginalTitle;
                        }, showTooltip);
                    }
                    scope.$on('genTooltipValidate', function (event, collect, turnoff) {
                        var visible = element.is(':visible');
                        enable = visible && !turnoff;
                        if (ctrl) {
                            if (collect && visible) {
                                collect.push(ctrl);
                            }
                            invalidMsg(ctrl.$invalid);
                        }
                    });
                } else if (option.click) {
                    // option.click will be 'show','hide','toggle', or 'destroy'
                    element.bind('click', function () {
                        element.tooltip(option.click);
                    });
                }
                element.bind('hidden.bs.tooltip', initTooltip);

                scope.$watch(function () {
                    return element.is(":visible");
                }, function (value) {
                    if (!value) {
                        element.tooltip('destroy');
                    } else {
                        initTooltip();
                    }
                });
            }
        };
    }
]).directive('genXeditable', ['getFile',
    function (getFile) {
        return {
            scope: {
                value: '=genXeditable'
            },
            templateUrl: getFile.html('gen-xeditable.html'),
            link: function (scope, element, attr) {
                var origin;

                element.bind('dblclick', function () {
                    origin = scope.value;
                    scope.isEdit = true;
                });
                scope.save = function () {
                    scope.placeholder = !scope.value;
                    scope.isEdit = false;
                    if (attr.save) {
                        scope.$parent.$eval(attr.save);
                    }
                };
                scope.cancel = function () {
                    scope.value = origin;
                    scope.isEdit = false;
                };
                element.addClass('gen-xeditable');
                scope.placeholder = !scope.value;
                scope.isEdit = false;
            }
        };
    }
]);