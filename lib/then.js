'use strict';
/*global module, process*/

/*!
 * then.js, version 0.2.0, 2013/08/14
 * The smallest promise!
 * https://github.com/zensh/then.js
 * (c) admin@zensh.com 2013
 * License: MIT
 */

(function () {
    var fail;

    function isFunction(fn) {
        return typeof fn === 'function';
    }

    function Promise() {
        this._success = function () {};
    }
    Promise.prototype.defer = function (err) {
        if (err === null || err === undefined) {
            this._success.apply(null, Array.prototype.slice.call(arguments, 1));
        } else if (fail || this._error) {
            return this._error ? this._error(err) : fail(err);
        } else {
            throw err;
        }
    };
    Promise.prototype.then = function (successHandler, errorHandler) {
        var that = new Promise(),
            defer = that.defer.bind(that);
        this._success = isFunction(successHandler) ? successHandler.bind(null, defer) : this._success;
        this._error = isFunction(errorHandler) && errorHandler.bind(null, defer);
        return that;
    };
    Promise.prototype.fail = function (errorHandler) {
        fail = isFunction(errorHandler) && errorHandler;
    };

    function then(startFn) {
        var that = new Promise(),
            defer = that.defer.bind(that),
            nextTick = typeof process === 'object' ? process.nextTick : setTimeout;

        nextTick(isFunction(startFn) ? startFn.bind(null, defer) : defer);
        return that;
    }

    if (typeof module === 'object') {
        module.exports = then;
    } else if (typeof window === 'object') {
        window.then = then;
    }
    return then;
})();