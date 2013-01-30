/*

 */
var db = require('./mongoDao.js').db,
    merge = require('../lib/tools.js').merge,
    intersect = require('../lib/tools.js').intersect,
    globalConfig = require('./json.js').GlobalConfig;

var callbackFn = function(err, doc) {
    if (err) console.log(err);
    return doc;
};

var that = db.bind('global', {

    getGlobalConfig: function(callback) {
        callback = callback || callbackFn;
        that.findOne({
            _id: globalConfig._id
        }, {
            sort: {
                _id: -1
            },
            fields: {
                _id: 0,
                visitHistory: 0
            }
        }, function(err, doc) {
            if (doc === null) doc = merge(globalConfig);
            return callback(err, doc);
        });
    },

    setGlobalConfig: function(Obj, callback) {
        var setObj = {},
            newObj = merge(defaultObj),
            defaultObj = {
                domain: '',
                title: '',
                url: '',
                logo: '',
                email: '',
                description: '',
                metatitle: '',
                metadesc: '',
                visit: 0,
                users: 0,
                topics: 0,
                comments: 0,
                maxOnlineNum: 0,
                maxOnlineTime: 0,
                visitHistory: 0,
                ArticleTagsMax: 0,
                UserTagsMax: 0,
                TitleMinLen: 0,
                TitleMaxLen: 0,
                SummaryMinLen: 0,
                SummaryMaxLen: 0,
                CommentMinLen: 0,
                CommentMaxLen: 0,
                ContentMinLen: 0,
                ContentMaxLen: 0,
                UserNameMinLen: 0,
                UserNameMaxLen: 0,
                register: true
            };
            callback = callback || callbackFn;

            newObj = intersect(newObj, Obj);
            if (newObj.visitHistory) {
                setObj.$push = {
                    visitHistory: newObj.visitHistory
                };
                delete newObj.visitHistory;
            }
            setObj.$set = newObj;
            that.update({
                _id: globalConfig._id
            }, setObj, {
                w: 1
            }, function(err, doc) {
                return callback(err, doc);
            });
    },

    initGlobalConfig: function(callback) {
        callback = callback || callbackFn;
        globalConfig.date = Date.now();
        that.insert(
        globalConfig, {
            w: 1
        }, function(err, doc) {
            return callback(err, doc);
        });
    },

    getVisitHistory: function(_idArray, callback) {
        callback = callback || callbackFn;
        if(!Array.isArray(_idArray)) _idArray = [_idArray];
        that.find({
            _id: {
                $in: _idArray
            }
        }, {
            fields: {
                _id: 0,
                data: 1
            }
        }).each(function(err, doc) {
            return callback(err, doc);
        });
    },

    setVisitHistory: function(Obj, callback) {
        var setObj = {},
            defaultObj = {
                data: [0,0,'','']
            };
            callback = callback || callbackFn;
            defaultObj = intersect(defaultObj, Obj);
            setObj.$push = {
                data: defaultObj.data
            };
            console.log(setObj);
            that.update({
                _id: Obj._id
            }, setObj, {
                w: 1
            }, function(err, doc) {
                if (err) {
                    Obj._id +=1;
                    that.initVisitHistory(Obj, callback);}
                else return callback(err, doc);
            });
    },

    initVisitHistory: function(Obj, callback) {
        var newObj = {
            _id: 1,
            data: []
        }
        if (Obj && Obj._id) newObj._id = Obj._id;
        callback = callback || callbackFn;

        that.insert(
        newObj, {
            w: 1
        }, function(err, doc) {
            return callback(err, doc);
        });
    }

});

module.exports = {
    getGlobalConfig: that.getGlobalConfig,
    setGlobalConfig: that.setGlobalConfig,
    initGlobalConfig: that.initGlobalConfig,
    getVisitHistory: that.getVisitHistory,
    setVisitHistory: that.setVisitHistory,
    initVisitHistory: that.initVisitHistory
};
