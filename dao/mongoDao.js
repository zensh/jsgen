'use strict';
/*global require, module, Buffer, jsGen*/

var mongoIp = jsGen.conf.MongodbIp || '127.0.0.1',
    mongoPort = jsGen.conf.MongodbPort || 27017,
    mongoDbName = jsGen.conf.MongodbDefaultDbName || 'jsGen',
    mongoskin = require('mongoskin');

module.exports = {
    db: mongoskin.db(mongoIp + ':' + mongoPort + '/?auto_reconnect=true', {
        w: 0,
        native_parser: true,
        database: mongoDbName
    })
};