function CacheTL(timeLimit, capacity, keyMode) {
    /*利用Buffer写的一个Time Limit定时定容缓存，timeLimit为过期时间，0表示不限时，capacity为缓存容量，为0时不限容量。
    keyMode键模式，为真时，表示仅存储键，不存储值，并且get方法不更新缓存。
    myCache.get(key); //读取名为key的缓存值
    myCache.put(key, value); //写入名为key的缓存值
    myCache.remove(key); //删除名为key的缓存值
    myCache.removeAll(); //清空缓存
    myCache.info(); //返回myCache缓存信息
    */

    this.capacity = capacity || Number.MAX_VALUE;
    this.timeLimit = timeLimit || 3000;
    this.keyMode = keyMode || false;
    this.data = {};
    this.hash = {};
    this.timer = null;
    this.linkedList = {
        length: 0,
        head: null,
        end: null
    }
    if (capacity <= 0) {
        this.capacity = Number.MAX_VALUE;
    }
    if (timeLimit < 0) {
        this.timeLimit = 0;
    }
};
CacheTL.prototype.get = function (key) {
    var lruEntry = this.hash[key];
    if (!lruEntry) {
        return;
    }
    if (!this.keyMode) {
        lruEntry.time = Date.now();
        refresh(this.linkedList, lruEntry);
        return JSON.parse(this.data[key].toString());
    } else {
        return true;
    }
};
CacheTL.prototype.put = function (key, value) {
    var lruEntry = this.hash[key];
    if (!this.keyMode && value === undefined) {
        return this;
    }
    if (!lruEntry) {
        this.hash[key] = {
            key: key
        };
        this.linkedList.length += 1;
        lruEntry = this.hash[key];
    }
    lruEntry.time = Date.now();
    refresh(this.linkedList, lruEntry);
    if (!this.keyMode) {
        this.data[key] = new Buffer(JSON.stringify(value));
    }
    if (this.linkedList.length > this.capacity) {
        this.remove(this.linkedList.end.key);
    }
    this.clear();
    return this;
};
CacheTL.prototype.remove = function (key) {
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
CacheTL.prototype.removeAll = function () {
    this.data = {};
    this.hash = {};
    this.linkedList = {
        length: 0,
        head: null,
        end: null
    }
    return this;
};
CacheTL.prototype.clear = function () {
    if (!this.timer && this.linkedList.length > 0) {
        this.timer = setInterval(clearOut, this.timeLimit / 10, this);
    }
};
CacheTL.prototype.info = function () {
    var size = 0,
        data = this.linkedList.head;
    if (!this.keyMode) {
        while (data) {
            if (this.data[data.key]) {
                size += this.data[data.key].length;
            }
            data = data.p;
        }
    }
    return {
        timeLimit: this.timeLimit,
        capacity: this.capacity,
        keyMode: !!this.keyMode,
        length: this.linkedList.length,
        size: jsGen.lib.tools.formatBytes(size),
    };
};

function clearOut (cache) {
    var now = Date.now(),
        end = cache.linkedList.end;
    while (end && (now - end.time >= cache.timeLimit)) {
        cache.data[end.key] = null;
        delete cache.data[end.key];
        delete cache.hash[end.key];
        cache.linkedList.length -= 1;
        cache.linkedList.end = end.n;
        end = cache.linkedList.end;
    }
    if (!end) {
        cache.linkedList.head = null;
    }
    if (cache.timer && cache.linkedList.length === 0) {
        clearInterval(cache.timer);
        cache.timer = null;
    }
};
// 更新链表，把get或put方法操作的key提到链表head，即表示最新

function refresh(linkedList, entry) {
    if (entry != linkedList.head) {
        if (!linkedList.end) {
            linkedList.end = entry;
        } else if (linkedList.end == entry) {
            linkedList.end = entry.n;
        }

        link(entry.n, entry.p);
        link(entry, linkedList.head);
        linkedList.head = entry;
        linkedList.head.n = null;
    }
};

// 对两个链表对象建立链接，形成一条链

function link(nextEntry, prevEntry) {
    if (nextEntry != prevEntry) {
        if (nextEntry) {
            nextEntry.p = prevEntry;
        }
        if (prevEntry) {
            prevEntry.n = nextEntry;
        }
    }
};

module.exports = CacheTL;
