'use strict';
/*global require, module, Buffer*/

function CacheLRU(capacity) {
    /*  利用Buffer写的一个LRU缓存，capacity为缓存容量，为0时不限容量。
myCache = new CacheLRU(capacity); //构造缓存
myCache.get(key); //读取名为key的缓存值
myCache.put(key, value); //写入名为key的缓存值
myCache.remove(key); //删除名为key的缓存值
myCache.removeAll(); //清空缓存
myCache.info(); //返回myCache缓存信息
LRU原理：对所有缓存数据的key构建hash链表，当对某一数据进行get或put操作时，将其key提到链表前端（最新）。当进行put数据超出容量时，删除链表尾端（最旧）的缓存数据。
hash链表操作可直接定位key，无需历遍整个hash对象，故读写极快。缓存容量不再影响读写速度。
*/
    this.capacity = capacity || Number.MAX_VALUE;
    this.data = {};
    this.hash = {};
    this.linkedList = {
        length: 0,
        head: null,
        end: null
    };
    if (capacity <= 0) {
        this.capacity = Number.MAX_VALUE;
    }
}
CacheLRU.prototype.get = function (key) {
    var lruEntry = this.hash[key];
    if (!lruEntry) {
        return;
    }
    refresh(this.linkedList, lruEntry);
    return JSON.parse(this.data[key].toString());
};
CacheLRU.prototype.put = function (key, value) {
    var lruEntry = this.hash[key];
    if (value === undefined) {
        return this;
    }
    if (!lruEntry) {
        this.hash[key] = {
            key: key
        };
        this.linkedList.length += 1;
        lruEntry = this.hash[key];
    }
    refresh(this.linkedList, lruEntry);
    this.data[key] = new Buffer(JSON.stringify(value));
    if (this.linkedList.length > this.capacity) {
        this.remove(this.linkedList.end.key);
    }
    return this;
};
CacheLRU.prototype.update = function (key, fn) {
    var data = this.get(key);
    if (!data) {
        return this;
    }
    data = fn(data);
    this.put(key, data);
    return this;
};
CacheLRU.prototype.remove = function (key) {
    var lruEntry = this.hash[key];
    if (!lruEntry) {
        return this;
    }
    if (lruEntry === this.linkedList.head) {
        this.linkedList.head = lruEntry.p;
    }
    if (lruEntry === this.linkedList.end) {
        this.linkedList.end = lruEntry.n;
    }
    link(lruEntry.n, lruEntry.p);
    this.data[key] = null;
    delete this.hash[key];
    delete this.data[key];
    this.linkedList.length -= 1;
    return this;
};
CacheLRU.prototype.removeAll = function () {
    this.data = {};
    this.hash = {};
    this.linkedList = {
        length: 0,
        head: null,
        end: null
    };
    return this;
};
CacheLRU.prototype.info = function () {
    return {
        capacity: this.capacity,
        length: this.linkedList.length,
    };
};

// 更新链表，把get或put方法操作的key提到链表head，即表示最新

function refresh(linkedList, entry) {
    if (entry !== linkedList.head) {
        if (!linkedList.end) {
            linkedList.end = entry;
        } else if (linkedList.end === entry) {
            linkedList.end = entry.n;
        }

        link(entry.n, entry.p);
        link(entry, linkedList.head);
        linkedList.head = entry;
        linkedList.head.n = null;
    }
}

// 对两个链表对象建立链接，形成一条链

function link(nextEntry, prevEntry) {
    if (nextEntry !== prevEntry) {
        if (nextEntry) {
            nextEntry.p = prevEntry;
        }
        if (prevEntry) {
            prevEntry.n = nextEntry;
        }
    }
}

module.exports = CacheLRU;