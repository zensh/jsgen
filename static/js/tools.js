'use strict';
/*global angular */

angular.module('jsGen.tools', []).
factory('tools', function () {
    return function (o) {
        if (typeof o !== 'object') {
            return;
        } else {
            return (function () {
                this.digestArray = digestArray;
                this.complement = complement;
                this.intersect = intersect;
                this.checkType = checkType;
                this.isArray = isArray;
                this.isEmpty = isEmpty;
                this.hasOwn = hasOwn;
                this.union = union;
                this.each = each;
                return this;

                function isArray(obj) {
                    return Array.isArray && Array.isArray(obj) || Object.prototype.toString.call(obj) === '[object Array]';
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
                    if (!obj) {
                        return;
                    } else if (obj.length === +obj.length) {
                        var i, l;
                        if (!right) {
                            for (i = 0, l = obj.length; i < l; i++) {
                                iterator.call(context, obj[i], i, obj);
                            }
                        } else {
                            for (i = obj.length - 1; i >= 0; i--) {
                                iterator.call(context, obj[i], i, obj);
                            }
                        }
                    } else {
                        for (var key in obj) {
                            if (hasOwn(obj, key)) {
                                iterator.call(context, obj[key], key, obj);
                            }
                        }
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

                //深度补集运算，用于获取对象修改后的值。a为目标对象，b为对比对象。
                //a的某属性值与b的对应属性值全等时，删除a的该属性，运算直接修改a，返回值也是a。
                //ignore，不参与对比的属性模板;
                //keyMode为true时，对属性进行补集元算，即a的属性名在b中也存在时，则删除a中该属性。

                function complement(a, b, ignore, keyMode) {
                    if (a && b) {
                        var typeA = checkType(a),
                            typeB = checkType(b),
                            ignore = ignore || undefined;
                        keyMode = keyMode || undefined;
                        if (typeA !== typeB || (typeA !== 'object' && typeA !== 'array')) {
                            return a;
                        }
                        if (ignore) {
                            if (typeof ignore === 'object') {
                                return complement(a, complement(b, ignore, true), keyMode);
                            } else {
                                if (!keyMode) {
                                    keyMode = true;
                                }
                            }
                        }
                        if (!keyMode) {
                            if (typeB === 'array' && b.length === 1) {
                                var o = union(b[0]);
                                for (var i = a.length - 1; i >= 0; i--) {
                                    if (a[i] === o) {
                                        delete a[i];
                                    } else if (o && typeof o === 'object') {
                                        complement(a[i], o);
                                    }
                                }
                            } else {
                                for (var key in a) {
                                    if (a[key] === b[key]) {
                                        delete a[key];
                                    } else if (b[key] && typeof b[key] === 'object') {
                                        complement(a[key], b[key]);
                                    }
                                }
                            }
                        } else {
                            if (typeB === 'array' && b.length === 1) {
                                var o = union(b[0]);
                                for (var i = a.length - 1; i >= 0; i--) {
                                    if (o && typeof o === 'object') {
                                        complement(a[i], o, true);
                                    } else if (typeof a[i] === typeof o) {
                                        delete a[i];
                                    }
                                }
                            } else {
                                for (var key in a) {
                                    if (b[key] && typeof b[key] === 'object') {
                                        complement(a[key], b[key], true);
                                    } else if (typeof a[key] === typeof b[key]) {
                                        delete a[key];
                                    }
                                }
                            }
                        }
                        digestArray(a);
                    }
                    return a;
                }

                //数组去undefined，修改原数组，去除undefined值的元素。

                function digestArray(a) {
                    if (isArray(a)) {
                        for (var i = a.length - 1; i >= 0; i--) {
                            if (a[i] === undefined) {
                                a.splice(i, 1);
                            }
                        }
                    }
                    return a;
                }

            }).call(o);
        }
    };
});