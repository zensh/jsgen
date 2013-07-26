'use strict';
/*global angular */

angular.module('jsGen.tools', []).
factory('tools', function () {
    Date.now = Date.now || function () {
        return new Date().getTime();
    };
    var breaker = {};

    return {
        trim: trim,
        each: each,
        some: some,
        union: union,
        toStr: toStr,
        hasOwn: hasOwn,
        isEmpty: isEmpty,
        isArray: isArray,
        intersect: intersect,
        checkType: checkType
    };

    function trim(str) {
        str = toStr(str);
        str = str.replace(/ +/g, ' ');
        str = str.replace(/^ /, '');
        str = str.replace(/ $/, '');
        return str;
    }

    function isArray(obj) {
        return Array.isArray && Array.isArray(obj) || Object.prototype.toString.call(obj) === '[object Array]';
    }

    function toStr(value) {
        return (value || value === 0) && (value + '') || '';
    }

    function hasOwn(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function isEmpty(obj) {
        for (var key in obj) {
            if (hasOwn(obj, key)) {
                return false;
            }
        }
        return true;
    }

    function each(obj, iterator, context, right) {
        iterator = iterator || angular.noop;
        if (!obj) {
            return;
        } else if (obj.length === +obj.length) {
            var i, l;
            if (!right) {
                for (i = 0, l = obj.length; i < l; i++) {
                    if (iterator.call(context, obj[i], i, obj) === breaker) {
                        return;
                    }
                }
            } else {
                for (i = obj.length - 1; i >= 0; i--) {
                    if (iterator.call(context, obj[i], i, obj) === breaker) {
                        return;
                    }
                }
            }
        } else {
            for (var key in obj) {
                if (hasOwn(obj, key)) {
                    if (iterator.call(context, obj[key], key, obj) === breaker) {
                        return;
                    }
                }
            }
        }
    }

    function some(obj, iterator, context) {
        var result = false,
            nativeSome = Array.prototype.some;

        iterator = iterator || angular.noop;
        if (!obj) {
            return result;
        } else if (nativeSome && obj.some === nativeSome) {
            return obj.some(iterator, context);
        } else {
            each(obj, function (value, index, list) {
                result = iterator.call(context, value, index, list);
                if (result) {
                    return breaker;
                }
            });
            return !!result;
        }
    }

    function checkType(obj) {
        var type = typeof obj;
        if (obj === null) {
            return 'null';
        } else if (type === 'object' && isArray(obj)) {
            return 'array';
        } else {
            return type;
        }
    }

    //深度并集复制，用于数据对象复制、数据对象更新，若同时提供参数 a 对象和 b 对象，则将 b 对象所有属性（原始类型，忽略函数）复制给 a 对象（同名则覆盖），
    //返回值为深度复制了 b 后的 a，注意 a 和 b 必须同类型;
    //若只提供参数 a，则 union 函数返回 a 的克隆，与JSON.parse(JSON.stringify(a))相比，克隆效率略高。

    function union(a, b) {
        var type = checkType(a);

        if (b === undefined) {
            b = a;
            a = type === 'object' ? {} : [];
        }
        if (type === checkType(b)) {
            if (type === 'object' || type === 'array') {
                each(b, function (x, i) {
                    var type = checkType(x);
                    if (type === 'object' || type === 'array') {
                        a[i] = type === checkType(a[i]) ? a[i] : (type === 'object' ? {} : []);
                        union(a[i], x);
                    } else {
                        a[i] = type === 'function' ? null : x;
                    }
                });
            } else {
                a = type === 'function' ? null : b;
            }
        }
        return a;
    }

    //深度交集复制，用于数据对象校验，即以 a 为模板，当a 和 b 共有属性且属性值类型一致时，将 b 的属性值复制给 a，对于 a 有 b 没有或 b 有 a 没有的属性，均删除，返回相交复制后的 a;
    // var a = {q:0,w:'',e:{a:0,b:[0,0,0]}}, b = {r:10,w:'hello',e:{a:99,b:[1,2,3,4,5]}};
    // intersect(a, b);  // a 变成{w:'hello',e:{a:99,b:[1,2,3]}}
    //如果 a 或其属性是 null，则完全复制 b 或其对应属性
    //如果 a 或其属性是 {} 或 [], 且 b 或其对应属性类型一致（即对象类型或数组类型），则完全复制
    //如果 a 的某属性是数组，且只有一个值，则以该值为模板，将 b 对应的该属性的数组的值校检并复制
    // var a = {q:0,w:null,e:{a:0,b:[0]}}, b = {r:10,w:'hello',e:{a:99,b:[function(){},1,2,3,'4',5]}};
    // intersect(a, b);  // 注意a与上面的区别
    // var a = {q:0,w:null,e:{a:0,b:[null]}}, b = {r:10,w:'hello',e:{a:99,b:[function(){},1,2,3,'4',5]}};
    // intersect(a, b);  // 注意a与上面的区别

    function intersect(a, b) {
        var type = checkType(a);

        if (type === checkType(b) && (type === 'array' || type === 'object')) {
            if (isEmpty(a)) {
                union(a, b);
            } else if (type === 'array' && a.length === 1) {
                var o = a[0],
                    typeK = checkType(o);
                a.length = 0;
                if (typeK !== 'function') {
                    each(b, function (x) {
                        var typeB = checkType(x);
                        if (typeK === 'null' || typeK === typeB) {
                            if (typeK === 'object' || typeK === 'array') {
                                a.push(intersect(union(o), x));
                            } else {
                                a.push(union(x));
                            }
                        }
                    });
                }
            } else {
                each(a, function (x, i) {
                    var typeK = checkType(x);
                    if (type === 'array' || hasOwn(b, i)) {
                        if (typeK === 'function' && type === 'array') {
                            a[i] = null;
                        } else if (typeK === 'null') {
                            a[i] = union(b[i]);
                        } else if (typeK === checkType(b[i])) {
                            if (typeK === 'object' || typeK === 'array') {
                                intersect(a[i], b[i]);
                            } else {
                                a[i] = b[i];
                            }
                        } else {
                            delete a[i];
                        }
                    } else {
                        delete a[i];
                    }
                });
            }
        }
        return a;
    }
});