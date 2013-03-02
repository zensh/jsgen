function CacheLRU(capacity) {
/*  利用Buffer写的一个LRU缓存，capacity为缓存容量，为0时构造一般缓存。
    myCache = new CacheLRU(capacity); //构造缓存
    myCache.get(key); //读取名为key的缓存值
    myCache.put(key, value); //写入名为key的缓存值
    myCache.remove(key); //删除名为key的缓存值
    myCache.removeAll(); //删除所有缓存值
    myCache.info(); //返回myCache缓存信息，包括：
    {capacity: 缓存容量,
            length: 当前已使用容量,
            size: 缓存数据大小bytes,
            ratio: 缓存命中率,
            keys: 当前已缓存的数据名称（key）数组
    }
*/
    this.capacity = capacity || 0;
    this.cache = {};
    this.hash = {};
    this.miss = 0;
    if(capacity < 0) this.capacity = 0;
};
//为了提高取值效率，get方法只有取值和取值计数操作，key为string类型。
CacheLRU.prototype.get = function(key) {
    key = '_' + key;
    if(this.hash[key]) this.hash[key] += 1;
    else this.miss += 1;
    return JSON.parse(this.cache[key].toString());
};
//LRU cache由存值put方法实现
CacheLRU.prototype.put = function(key, value) {
    key = '_' + key;
    if(this.capacity === 0) {
        this.cache[key] = new Buffer(JSON.stringify(value));
        this.hash[key] = 1;
    } else {
        var r = Object.keys(this.hash);
        if(r.length < this.capacity) {
            this.cache[key] = new Buffer(JSON.stringify(value));
            this.hash[key] = 1;
        } else {
            that = this;
            r.sort(function(a, b) {
                return that.hash[a] - that.hash[b];
            });
            delete this.cache[r[0]];
            delete this.hash[r[0]];
            this.cache[key] = new Buffer(JSON.stringify(value));
            this.hash[key] = 1;
        }
    }
    return this;
};
CacheLRU.prototype.info = function() {
    var keys = Object.keys(this.hash);
    var hit = 0, size = 0;
    keys.forEach(function(key, i) {
        if(this.hash[key]) hit += this.hash[key];
        size += this.cache[key].length;
        keys[i] = key.slice(1);
    }, this);
    return {
        capacity: this.capacity,
        length: keys.length,
        size: size,
        ratio: hit / (this.miss + hit),
        keys: keys
    };
};
CacheLRU.prototype.remove = function(key) {
    key = '_' + key;
    delete this.cache[key];
    delete this.hash[key];
    return this;
};
CacheLRU.prototype.removeAll = function() {
    this.cache = {};
    this.hash = {};
    return this;
};

module.exports = CacheLRU;

// test:
/*var user = new CacheLRU(10);
user.put('user1', {name:'admin', age: 30});
user.put('user2', {name:'user', age: 31});
user.put('user3', {name:'guest', age: 32});
console.log(user.get('user1'));
console.log(user.get('user2'));
console.log(user.get('user3'));
console.log(user.info());*/
