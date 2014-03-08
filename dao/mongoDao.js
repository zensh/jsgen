'use strict';
/*global require, module, Buffer, jsGen*/

var mongoIp = jsGen.conf.MongodbIp || '127.0.0.1',
    mongoPort = jsGen.conf.MongodbPort || 27017,
    mongoDbName = jsGen.conf.MongodbDefaultDbName || 'jsGen',
    mongoskin = require('mongoskin'),
    db = mongoskin.db('mongodb://' + mongoIp + ':' + mongoPort + '/' + mongoDbName, {
        native_parser:true,
        auto_reconnect: true
    });

module.exports = {
    db: db
};