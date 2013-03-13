function CacheTL(timeLimit, capacity, keyMode) {
    /*利用Buffer写的一个Time Limit定时定容缓存，timeLimit为过期时间，毫秒，为0时永不过期，capacity为缓存容量，为0时不限容量。
    keyMode键模式，为真时，表示仅存储键，不存储值，并且get方法不更新缓存。
myCache.get(key); //读取名为key的缓存值
myCache.put(key, value); //写入名为key的缓存值
myCache.remove(key); //删除名为key的缓存值
myCache.removeAll(); //清空缓存
myCache.info(); //返回myCache缓存信息
*/

    this.capacity = capacity || Number.MAX_VALUE;
    this.timeLimit = timeLimit || 0;
    this.keyMode = keyMode || false;
    this.data = {};
    this.hash = {};
    this.linkedList = {
        length: 0,
        head: null,
        end: null
    }
    if (capacity <= 0) this.capacity = Number.MAX_VALUE;
    if (timeLimit < 0) this.timeLimit = 0;
};
CacheTL.prototype.get = function (key) {
    key = '_' + key;
    var lruEntry = this.hash[key];
    if (!lruEntry) return;
    if (!this.keyMode) {
        lruEntry.time = Date.now();
        refresh(this.linkedList, lruEntry);
        return JSON.parse(this.data[key].toString());
    } else return true;
};
CacheTL.prototype.put = function (key, value) {
    key = '_' + key;
    var lruEntry = this.hash[key];
    var that = this;
    if (!this.keyMode && value === undefined) return this;
    if (!lruEntry) {
        this.hash[key] = {
            key: key
        };
        this.linkedList.length += 1;
        lruEntry = this.hash[key];
    }
    lruEntry.time = Date.now();
    refresh(this.linkedList, lruEntry);
    if (!this.keyMode) this.data[key] = new Buffer(JSON.stringify(value));
    if (this.linkedList.length > this.capacity) this.remove(this.linkedList.end.key.slice(1));
    if (this.timeLimit > 0) setTimeout(function () {
        process.nextTick(clear.bind(that));
    }, this.timeLimit);
    return this;
};
CacheTL.prototype.remove = function (key) {
    key = '_' + key;
    var lruEntry = this.hash[key];
    if (!lruEntry) return this;
    if (lruEntry === this.linkedList.head) this.linkedList.head = lruEntry.p;
    if (lruEntry === this.linkedList.end) this.linkedList.end = lruEntry.n;
    link(lruEntry.n, lruEntry.p);
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
CacheTL.prototype.info = function () {
    var size = 0,
        data = this.linkedList.head;

    if (!this.keyMode) {
        while (data) {
            size += this.data[data.key].length;
            data = data.p;
        }
    }
    return {
        timeLimit: this.timeLimit,
        capacity: this.capacity,
        keyMode: this.keyMode ? true : false,
        length: this.linkedList.length,
        size: jsGen.lib.tools.formatBytes(size),
    };
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
        if (nextEntry) nextEntry.p = prevEntry;
        if (prevEntry) prevEntry.n = nextEntry;
    }
};

function clear() {
    var now = Date.now(),
        data = this.linkedList.end;

    while (data && (now - data.time > this.timeLimit)) {
        delete this.data[data.key];
        delete this.hash[data.key];
        this.linkedList.length -= 1;
        data = data.n;
    }
    this.linkedList.end = data;
    if (!data) this.linkedList.head = null;
};

module.exports = CacheTL;

// test:
/*var user = new CacheTL(2 * 1000, 3, 1); //时间限制为5秒钟，5秒前的缓存内容将被删除
var time = Date.now();
user.put('user0', {
    name: 'admin',
    age: 30
});
user.put('user1', {
    name: 'admin',
    age: 30
});
user.put('user2', {
    name: 'admin',
    age: 30
});
user.put('user3', {
    name: 'admin',
    age: 30
});
(function timeLoop() {
        console.log(Date.now() - time + 'ms');
        console.log(user.linkedList);
        if (!user.linkedList.length) return;
        setTimeout(timeLoop, 1000);
})();*/
