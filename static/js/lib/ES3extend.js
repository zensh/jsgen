/*!
 * ES3extend.js v0.1.0 <https://github.com/zensh/ES3extend>
 * Copyright 2013 zensh <https://github.com/zensh>
 * Available under MIT license <http://mths.be/mit>
 *
 * Array.prototype.every
 * Array.prototype.filter
 * Array.prototype.forEach
 * Array.prototype.indexOf
 * Array.prototype.lastIndexOf
 * Array.prototype.map
 * Array.prototype.reduce
 * Array.prototype.reduceRight
 * Array.prototype.some
 * Array.isArray
 * Date.now
 * Function.prototype.bind
 * Object.create
 * Object.keys
 * String.prototype.trim
 */

;(function () {

    if (!(!Object.getOwnPropertyNames || 'prototype' in Object.getOwnPropertyNames)) {
        return;
        // if ES5, return
    }

    Array.prototype.every = Array.prototype.every || function (callback, obj) {
        if (typeof callback !== 'function') {
            throw TypeError(callback + ' is not a function');
        }
        if (obj && typeof obj !== 'object') {
            throw TypeError(obj + ' is not a object');
        }
        var result;
        for (var i = 0, len = this.length; i < len; i++) {
            if (obj) {
                result = callback.call(obj, this[i], i, this);
            } else {
                result = callback(this[i], i, this);
            }
            if (!result) {
                return false;
            }
        }
        return true;
    };

    Array.prototype.filter = Array.prototype.filter || function (callback, obj) {
        if (typeof callback !== 'function') {
            throw TypeError(callback + ' is not a function');
        }
        if (obj && typeof obj !== 'object') {
            throw TypeError(obj + ' is not a object');
        }
        var result, array = [];
        for (var i = 0, len = this.length; i < len; i++) {
            if (obj) {
                result = callback.call(obj, this[i], i, this);
            } else {
                result = callback(this[i], i, this);
            }
            if (result) {
                array.push(this[i]);
            }
        }
        return array;
    };

    Array.prototype.forEach = Array.prototype.forEach || function (callback, obj) {
        if (typeof callback !== 'function') {
            throw TypeError(callback + ' is not a function');
        }
        if (obj && typeof obj !== 'object') {
            throw TypeError(obj + ' is not a object');
        }
        for (var i = 0, len = this.length; i < len; i++) {
            if (this[i] === undefined) {
                continue;
            }
            if (obj) {
                callback.call(obj, this[i], i, this);
            } else {
                callback(this[i], i, this);
            }
        }
    };

    Array.prototype.indexOf = Array.prototype.indexOf || function (value, start) {
        if (start && typeof start !== 'number') {
            throw TypeError(start + ' is not a number');
        }
        var start = start || 0,
            len = this.length;
        if (start > 0) {
            start = Math.floor(start);
        } else if (start < 0) {
            start = Math.ceil(start) + len;
        }
        for (var i = start; i < len; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    };

    Array.prototype.lastIndexOf = Array.prototype.lastIndexOf || function (value, start) {
        if (start && typeof start !== 'number') {
            throw TypeError(start + ' is not a number');
        }
        var len = this.length,
            start = start || len - 1;
        if (start > 0) {
            start = Math.floor(start);
        } else if (start < 0) {
            start = Math.ceil(start) + len;
        }
        for (var i = start; i >= 0; i--) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    };

    Array.prototype.map = Array.prototype.map || function (callback, obj) {
        if (typeof callback !== 'function') {
            throw TypeError(callback + ' is not a function');
        }
        if (obj && typeof obj !== 'object') {
            throw TypeError(obj + ' is not a object');
        }
        var array = [];
        for (var i = 0, len = this.length; i < len; i++) {
            if (obj) {
                array[i] = callback.call(obj, this[i], i, this);
            } else {
                array[i] = callback(this[i], i, this);
            }
        }
        return array;
    };

    Array.prototype.reduce = Array.prototype.reduce || function (callback, initial) {
        if (typeof callback !== 'function') {
            throw TypeError(callback + ' is not a function');
        }
        var result = initial,
            len = this.length;
        if (initial !== undefined) {
            if (len === 0) {
                return result;
            }
            for (var i = 0; i < len; i++) {
                result = callback(result, this[i], i, this);
            }
        } else {
            if (len === 0) {
                throw TypeError('Reduce of empty array with no initial value');
            }
            result = this[0];
            if (len === 1) {
                return result;
            }
            for (var i = 1; i < len; i++) {
                result = callback(result, this[i], i, this);
            }
        }
        return result;
    };

    Array.prototype.reduceRight = Array.prototype.reduceRight || function (callback, initial) {
        if (typeof callback !== 'function') {
            throw TypeError(callback + ' is not a function');
        }
        var result = initial,
            len = this.length;
        if (initial !== undefined) {
            if (len === 0) {
                return result;
            }
            for (var i = len - 1; i >= 0; i--) {
                result = callback(result, this[i], i, this);
            }
        } else {
            if (len === 0) {
                throw TypeError('Reduce of empty array with no initial value');
            }
            result = this[len - 1];
            if (len === 1) {
                return result;
            }
            for (var i = len - 2; i >= 0; i--) {
                result = callback(result, this[i], i, this);
            }
        }
        return result;
    };

    Array.prototype.some = Array.prototype.some || function (callback, obj) {
        if (typeof callback !== 'function') {
            throw TypeError(callback + ' is not a function');
        }
        if (obj && typeof obj !== 'object') {
            throw TypeError(obj + ' is not a object');
        }
        var result;
        for (var i = 0, len = this.length; i < len; i++) {
            if (obj) {
                result = callback.call(obj, this[i], i, this);
            } else {
                result = callback(this[i], i, this);
            }
            if (result) {
                return true;
            }
        }
        return false;
    };

    Array.isArray = Array.isArray || function (obj) {
        return typeof obj === 'object' && Object.prototype.toString.call(obj) === '[object Array]';
    };

    Date.now = Date.now || function () {
        return new Date().valueOf();
    };

    Function.prototype.bind = Function.prototype.bind || function (obj) {
        var self = this,
            boundArgs = arguments;
        if (obj && typeof obj !== 'object') {
            throw TypeError(obj + ' is not a object');
        }
        return function () {
            var args = [];
            for (var i = 1, len = boundArgs.length; i < len; i++) {
                args.push(boundArgs[i]);
            }
            for (var i = 0, len = arguments.length; i < len; i++) {
                args.push(arguments[i]);
            }
            return self.apply(obj, args);
        };
    };

    Object.create = Object.create || function (obj) {
        var type = typeof obj;
        if (obj === null) {
            return {};
        }
        if (type !== 'object' || type !== 'function') {
            throw TypeError('Object prototype may only be an Object or null');
        }

        function F() {};
        F.prototype = obj;
        return new F;
    };

    Object.keys = Object.keys || function (obj) {
        if (typeof obj !== 'object') {
            throw TypeError(obj + ' is not a object');
        }
        var result = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                result.push(key);
            }
        }
        return result;
    };

    String.prototype.trim = String.prototype.trim || function () {
        return this.replace(/(^\s*)|(\s*$)/g, '');
    };
})();
