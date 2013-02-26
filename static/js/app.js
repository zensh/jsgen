'use strict';

// Declare app level module which depends on filters, and services
angular.module('jsGen', ['jsGen.filters', 'jsGen.services', 'jsGen.directives']).
config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.
    when('/', {
        templateUrl: '/static/tpl/index.html',
        controller: jsGen.indexCtrl
    }).
    when('/login', {
        templateUrl: 'static/tpl/login.html',
        controller: jsGen.userLoginCtrl
    }).
    when('/register', {
        templateUrl: 'static/tpl/register.html',
        controller: jsGen.userRegisterCtrl
    }).
    when('/home', {
        templateUrl: 'static/tpl/user.html',
        controller: jsGen.homeCtrl
    }).
    when('/admin', {
        templateUrl: 'static/tpl/admin.html',
        controller: jsGen.adminCtrl
    }).
    when('/U:id', {
        templateUrl: 'static/tpl/user.html',
        controller: jsGen.userViewCtrl
    }).
    when('/A:id', {
        templateUrl: 'static/tpl/article.html',
        controller: jsGen.articleCtrl
    }).
    when('/T:id', {
        templateUrl: 'static/tpl/tag.html',
        controller: jsGen.tagCtrl
    }).
    when('/O:id', {
        templateUrl: 'static/tpl/collection.html',
        controller: jsGen.collectionCtrl
    }).
    otherwise({
        redirectTo: '/'
    });
    $locationProvider.html5Mode(true);
}]);

var jsGen = {
    global: {}
};

(function() {
    function checkType(obj) {
        var type = typeof obj;
        if(obj === null) return 'null';
        if(type !== 'object') return type;
        if(Array.isArray(obj)) return 'array';
        return type;
    };

    function equal(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    };

    //深度并集复制，若同时提供参数 a 对象和 b 对象，则将 b 对象所有属性（原始类型，忽略函数）复制给 a对象（同名则覆盖），
    //返回值为深度复制了 b 后的 a，注意 a 和 b 必须同类型;
    //若只提供参数 a，则 union 函数返回 a 的克隆，与JSON.parse(JSON.stringify(a))相比，克隆效率略高。
    function union(a, b) {
        if(b === undefined) {
            var s, type = checkType(a);
            if(type === 'object') s = {};
            else if(type === 'array') s = [];
            else if(type === 'function') return undefined;
            else return a;
            for(var key in a) {
                if(!a.hasOwnProperty(key)) continue;
                if(typeof a[key] === 'object' && a[key] !== null) {
                    s[key] = union(a[key]);
                } else s[key] = a[key];
            }
            return s;
        }
        if(checkType(a) !== checkType(b)) return a;
        for(var key in b) {
            if(!b.hasOwnProperty(key)) continue;
            var typeBkey = checkType(b[key]);
            if(typeBkey === 'object') {
                if(checkType(a[key]) !== 'object') a[key] = {};
                union(a[key], b[key]);
            } else if(typeBkey === 'array') {
                if(checkType(a[key]) !== 'array') a[key] = [];
                union(a[key], b[key]);
            } else if(typeBkey !== 'function') a[key] = b[key];
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
        if(a && b) {
            var typeA = checkType(a),
                typeB = checkType(b);
            if(typeA === 'array' && typeB === 'array' && a.length <=1) {
                if(a.length === 0) union(a, b);
                else {
                    var o = union(a[0]);
                    var typeAkey = checkType(a[0]);
                    if(typeAkey !== 'function') b.forEach(function(key, i) {
                        typeBkey = checkType(key);
                        if(typeBkey === typeAkey) {
                            if(typeBkey === 'object' || typeBkey === 'array') {
                                a[i] = union(o);
                                intersect(a[i], key);
                            } else a[i] = key;
                        }
                    });
                }
            } else if(typeA === 'object' && typeB === 'object' && Object.keys(a).length === 0) {
                union(a, b);
            } else {
                for(var key in a) {
                    var typeBkey = checkType(b[key]);
                    if(b.hasOwnProperty(key) && checkType(a[key]) === typeBkey && typeBkey !== 'function') {
                        if(typeBkey === 'object' || typeBkey === 'array') {
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
        if(a && b) {
            var typeA = checkType(a),
                typeB = checkType(b),
                ignore = ignore || undefined;
                keyMode = keyMode || undefined;
            if(typeA !== typeB || (typeA !== 'object' && typeA !== 'array')) return a;
            if(ignore) {
                if(typeof ignore === 'object') {
                    return complement(a, complement(b, ignore, true), keyMode);
                } else {if(!keyMode) keyMode = true;}
            }
            if(!keyMode) {
                if(typeB === 'array' && b.length ===1) {
                    var o = union(b[0]);
                    a.forEach(function(key, i) {
                        if(key === o) delete a[i];
                        else if(o && typeof o === 'object') complement(a[i], o);
                    });
                } else {
                    for(var key in a) {
                        if(a[key] === b[key]) delete a[key];
                        else if(b[key] && typeof b[key] === 'object') complement(a[key], b[key]);
                    }
                }
            } else {
                if(typeB === 'array' && b.length ===1) {
                    var o = union(b[0]);
                    a.forEach(function(key, i) {
                        if(o && typeof o === 'object') complement(a[i], o, true);
                        else if(typeof key === typeof o) delete a[i];
                    });
                } else {
                    for(var key in a) {
                        if(b[key] && typeof b[key] === 'object') complement(a[key], b[key], true);
                        else if(typeof a[key] === typeof b[key]) delete a[key];
                    }
                }
            }
            digestArray(a);
        }
        return a;
    };
    //数组去重，返回新数组，新数组中没有重复值。
    function uniqueArray(a) {
        if(!Array.isArray(a)) return a;

        var o = {},
            re = [];
        for(var i = a.length - 1; i >= 0; i--) {
            if(o[typeof a[i] + a[i]] !== 1) {
                o[typeof a[i] + a[i]] = 1;
                re.push(a[i]);
            }
        };

        return re.reverse();
    };
    //数组去undefined，修改原数组，去除undefined值的元素。
    function digestArray(a) {
        if(!Array.isArray(a)) return a;
        for(var i = a.length - 1; i >= 0; i--) {
            if(a[i] === undefined) a.splice(i,1);
        };
        return a;
    };

    if(!this.lib) this.lib = {};
    this.lib.checkType = checkType;
    this.lib.equal = equal;
    this.lib.union = union;
    this.lib.intersect = intersect;
    this.lib.complement = complement;
    this.lib.uniqueArray = uniqueArray;
    this.lib.digestArray = digestArray;
    return this;
}).call(jsGen);
