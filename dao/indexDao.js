/*
 */
var union = jsGen.lib.tools.union,
    intersect = jsGen.lib.tools.intersect,
    globalConfig = jsGen.lib.json.GlobalConfig;

var that = jsGen.dao.db.bind('global', {

    getGlobalConfig: function (callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
        that.findOne({
            _id: 'GlobalConfig'
        }, {
            sort: {
                _id: -1
            }
        }, callback);
    },

    setGlobalConfig: function (Obj, callback) {
        var setObj = {},
        newObj = {
            domain: '',
            title: '',
            url: '',
            logo: '',
            email: '',
            description: '',
            metatitle: '',
            metadesc: '',
            keywords: '',
            visitors: 0,
            users: 0,
            articles: 0,
            comments: 0,
            onlineNum: 0,
            onlineUsers: 0,
            maxOnlineNum: 0,
            maxOnlineTime: 0,
            visitHistory: 0,
            TimeInterval: 0,
            ArticleTagsMax: 0,
            UserTagsMax: 0,
            TitleMinLen: 0,
            TitleMaxLen: 0,
            SummaryMaxLen: 0,
            ContentMinLen: 0,
            ContentMaxLen: 0,
            UserNameMinLen: 0,
            UserNameMaxLen: 0,
            register: true,
            UsersScore: [0, 0, 0, 0, 0, 0, 0],
            ArticleStatus: [0, 0],
            ArticleHots: [0, 0, 0, 0, 0],
            userCache: 0,
            articleCache: 0,
            commentCache: 0,
            listCache: 0,
            tagCache: 0,
            collectionCache: 0,
            messageCache: 0,
            paginationCache: [0, 0],
            smtp: {
                host: '',
                secureConnection: true,
                port: 0,
                auth: {
                    user: '',
                    pass: ''
                },
                senderName: '',
                senderEmail: ''
            },
            info: {}
        };

        intersect(newObj, Obj);
        if (Obj.visitors) {
            setObj.$inc = {
                visitors: 1
            };
        } else if (Obj.visitHistory) {
            setObj.$push = {
                visitHistory: newObj.visitHistory
            };
            delete newObj.visitHistory;
        } else setObj.$set = newObj;

        if (callback) that.findAndModify({
            _id: 'GlobalConfig'
        }, [], setObj, {
            w: 1,
            new: true
        }, callback);
        else that.update({
            _id: 'GlobalConfig'
        }, setObj);
    },

    initGlobalConfig: function (callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
        globalConfig.date = Date.now();
        that.insert(
        globalConfig, {
            w: 1
        }, callback);
    },

    getVisitHistory: function (_idArray, callback) {
        callback = callback || jsGen.lib.tools.callbackFn;
        if (!Array.isArray(_idArray)) _idArray = [_idArray];
        that.find({
            _id: {
                $in: _idArray
            }
        }, {
            fields: {
                _id: 0,
                data: 1
            }
        }).each(callback);
    },

    setVisitHistory: function (Obj, callback) {
        var setObj = {},
        defaultObj = {
            data: [0, 0, '', '', '', ''] //[number,_id,IP,]
        };
        callback = callback || jsGen.lib.tools.callbackFn;
        defaultObj = intersect(defaultObj, Obj);
        setObj.$push = {
            data: defaultObj.data
        };
        that.update({
            _id: Obj._id
        }, setObj, {
            w: 1
        }, callback);
    },

    newVisitHistory: function (Obj, callback) {
        var newObj = {
            _id: 1,
            data: []
        }
        callback = callback || jsGen.lib.tools.callbackFn;
        if (Obj && Obj._id) newObj._id = Obj._id;

        that.insert(
        newObj, {
            w: 1
        }, callback);
    }

});

module.exports = {
    getGlobalConfig: that.getGlobalConfig,
    setGlobalConfig: that.setGlobalConfig,
    initGlobalConfig: that.initGlobalConfig,
    getVisitHistory: that.getVisitHistory,
    setVisitHistory: that.setVisitHistory,
    newVisitHistory: that.newVisitHistory
};
