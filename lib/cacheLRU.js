function CacheLRU(capacity) {
    /*  利用Buffer写的一个LRU缓存，capacity为缓存容量，为0时不限容量。
myCache = new CacheLRU(capacity); //构造缓存
myCache.get(key); //读取名为key的缓存值
myCache.put(key, value); //写入名为key的缓存值
myCache.remove(key); //删除名为key的缓存值
myCache.removeAll(); //清空缓存
myCache.info(); //返回myCache缓存信息，包括：
{capacity: 缓存容量,
length: 当前已使用容量,
size: 缓存数据大小bytes,
ratio: 缓存命中率
}
*/
    this.capacity = capacity || Number.MAX_VALUE;
    this.data = {};
    this.hash = {};
    this.linkedList = {
        length: 0,
        head: null,
        end: null
    }
    if (capacity <= 0) this.capacity = Number.MAX_VALUE;
};
CacheLRU.prototype.get = function(key) {
    key = '_' + key;
    var lruEntry = this.hash[key];
    if (!lruEntry) return;
    refresh(this.linkedList, lruEntry);
    return JSON.parse(this.data[key].toString());
};
CacheLRU.prototype.put = function(key, value) {
    key = '_' + key;
    var lruEntry = this.hash[key];
    if (value === undefined) return this;
    if (!lruEntry) {
        this.hash[key] = {key: key};
        this.linkedList.length += 1;
        lruEntry = this.hash[key];
    }
    refresh(this.linkedList, lruEntry);
    this.data[key] = new Buffer(JSON.stringify(value));
    if (this.linkedList.length > this.capacity) this.remove(this.linkedList.end.key.slice(1));
    return this;
};
CacheLRU.prototype.remove = function(key) {
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
CacheLRU.prototype.removeAll = function() {
    this.data = {};
    this.hash = {};
    this.linkedList = {
        length: 0,
        head: null,
        end: null
    }
    return this;
};
CacheLRU.prototype.info = function() {
    var size = 0,
        count = 0;
    for (var key in this.data) {
        size += this.data[key].length;
    }
    return {
        capacity: this.capacity,
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
}

// 对两个链表对象建立链接，形成一条链
function link(nextEntry, prevEntry) {
    if (nextEntry != prevEntry) {
        if (nextEntry) nextEntry.p = prevEntry;
        if (prevEntry) prevEntry.n = nextEntry;
    }
}

module.exports = CacheLRU;

// test:
/*var user = new CacheLRU(5);
user.put('user1', {name:'admin', age: 30});
user.put('user2', {name:'user', age: 31});
user.put('user3', {name:'guest', age: 32});
user.put('user4', {name:'guest', age: 34});
user.put('user5', {name:'guest', age: 35});
console.log(user.get('user1'));
console.log(user.get('user2'));
console.log(user.get('user3'));
user.put('user6', {name:'guest', age: 36});
console.log(user.info());
*/
