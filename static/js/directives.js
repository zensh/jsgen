'use strict';

/* Directives */

angular.module('jsGen.directives', []).
directive('ngParseMarkdown', ['MdParse', function(MdParse) {
    // <div ng-parse-markdown="document"></div>
    // document是Markdown格式或一般文档字符串，解析成DOM后插入<div>
    return function(scope, element, attr) {
        element.addClass('ng-binding').data('$binding', attr.ngParseMarkdown);
        scope.$watch(attr.ngParseMarkdown, function ngParseMarkdownWatchAction(value) {
            value = MdParse(value);
            element.html(value || '');
            element.children('pre').addClass('prettyprint linenums');
            element.children('code').addClass('prettyprint');
            element.find('a').attr('target', function() {
                if (this.host !== location.host) return '_blank';
            });
            prettyPrint();
        });
    };
}]).
directive('ngTiming', function() {
    return {
        transclude: true,
        scope: true,
        template: '<i>{{timing}}</i>',
        link: function(scope, element, attr) {
            element.addClass('ng-binding').data('$binding', attr.ngTiming);
            scope.$watch(attr.ngTiming, function ngTimingWatchAction(value) {
                var time = Number(value) || 0;
                scope.timing = time;
                if (time <= 0) return;
                var key = setInterval(function() {
                    scope.timing = --time;
                    scope.$digest();
                    if (time <= 0) {
                        clearInterval(key);
                        scope.$emit('timeout');
                    }
                }, 1000);
            });
        }
    };
 }).
directive('ngPagination', function() {
    // <div ng-pagination="pagination"></div>
    // 基于Bootstrap框架
    // pagination是一个对象，如：
    // {
    //     now: 1,  // 默认当前页
    //     total: 1,  //总页数
    //     num: 20, //分页的每页数量
    //     nums: [20, 50, 100]  //自定义num，不定长，可留空
    // }
    // 翻页事件发生时触发pagination事件
    return {
        transclude: true,
        scope: true,
        template: '<ul class="pagination">' +
                            '<li><a href="#" ng-click="paginationTo(\'first\')"><i class=" glyphicon glyphicon-step-backward"></i></a></li>' +
                            '<li><a href="#" ng-click="paginationTo(\'prev\')"><i class="glyphicon glyphicon-backward"></i></a></li>' +
                            '<li class="disabled"><a>{{now}}</a></li>' +
                            '<li><a href="#" ng-click="paginationTo(\'next\')"><i class="glyphicon glyphicon-forward"></i></a></li>' +
                            '<li><a href="#" ng-click="paginationTo(\'last\')"><i class="glyphicon glyphicon-step-forward"></i></a></li>' +
                            '<li ng-repeat="n in nums"><a href="#" ng-click="setNum(n)" title="每页{{n}}">{{n}}</a></li>' +
                         '</ul>',
        link: function(scope, element, attr) {
            element.addClass('ng-binding').data('$binding', attr.ngPagination);
            scope.$watch(attr.ngPagination, function ngPaginationWatchAction(value) {
                scope.now = value.now;
                scope.nums = value.nums;
                scope.paginationTo = function(to) {
                    var p = 1;
                    var params = {};
                    var last = Math.ceil(value.total / value.num);
                    switch (to) {
                        case 'first':
                            p = 1;
                            break;
                        case 'prev':
                            p = scope.now - 1;
                            if (p < 1) p = 1;
                            break;
                        case 'next':
                            p = scope.now + 1;
                            if (p > last) p = last;
                            break;
                        case 'last':
                            p = last;
                            break;
                    }
                    params = {
                        n: value.num,
                        p: p
                    };
                    scope.$emit('pagination', params);
                };
                scope.setNum = function(num) {
                    scope.$emit('pagination', {
                        n: num,
                        p: 1
                    });
                };
            }, true);
            attr.ngPagination.now = attr.ngPagination.now || 1;
            attr.ngPagination.total = attr.ngPagination.total || 1;
            attr.ngPagination.num = attr.ngPagination.num || 20;
        }
    };
});
