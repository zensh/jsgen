function CacheTL(timeLimit, keyMode) {
    /*  利用Buffer写的一个Time Limit定时缓存，timeLimit为过期时间，毫秒，为0时构造一般缓存。
    keyMode键模式，为真时，表示仅存储键，不存储值（不使用this.cache）。
    myCache = new CacheTL(timeLimit); //构造缓存
    myCache.get(key); //读取名为key的缓存值
    myCache.put(key, value); //写入名为key的缓存值
    myCache.remove(key); //删除名为key的缓存值
    myCache.removeAll(); //删除所有缓存值
    myCache.info(); //返回myCache缓存信息，包括：
    {timeLimit: 缓存容量,
            length: 当前已使用容量,
            size: 缓存数据大小bytes,
            keys: 当前已缓存的数据名称（key）数组
    }
*/
    this.timeLimit = timeLimit || 0;
    this.keyMode = keyMode || false;
    this.cache = {};
    this.hash = {};
    if (timeLimit < 0) this.timeLimit = 0;
};
//清理过期缓存值
CacheTL.prototype.clear = function() {
    var that = this;
    var time = Date.now();
    Object.keys(this.hash).forEach(function(key) {
        if ((time - that.hash[key]) > that.timeLimit) {
            delete that.cache[key];
            delete that.hash[key];
        }
    });
    return this;
};
CacheTL.prototype.get = function(key) {
    key = '_' + key;
    var that = this;
    if (this.hash[key]) {
        if (this.keyMode) return this.hash[key];
        else return JSON.parse(this.cache[key].toString());
    }else return null;
};
CacheTL.prototype.put = function(key, value) {
    var that = this;
    key = '_' + key;
    if (!this.keyMode) this.cache[key] = new Buffer(JSON.stringify(value));
    this.hash[key] = Date.now();
    if (this.timeLimit > 0) setTimeout(function() {
        process.nextTick(that.clear.bind(that));
    }, this.timeLimit);
    return this;
};
CacheTL.prototype.info = function() {
    var keys = Object.keys(this.hash);
    var size = 0;
    keys.forEach(function(key, i) {
        size += this.cache[key].length;
        keys[i] = key.slice(1);
    }, this);
    return {
        timeLimit: this.timeLimit,
        length: keys.length,
        size: jsGen.lib.tools.formatBytes(size),
    };
};
CacheTL.prototype.remove = function(key) {
    key = '_' + key;
    delete this.cache[key];
    delete this.hash[key];
    return this;
};
CacheTL.prototype.removeAll = function() {
    this.cache = {};
    this.hash = {};
    return this;
};

module.exports = CacheTL;

// test:
/*var user = new CacheTL(5 * 1000); //时间限制为5秒钟，5秒前的缓存内容将被删除
var time = Date.now();
user.put('user', {
    name: 'admin',
    age: 30
});
(function timeLoop() {
    var u = user.get('user');
    if (u) {
        console.log(u);
        setTimeout(timeLoop, 1000);
    } else return console.log(Date.now() - time + 'ms');
})();*/
