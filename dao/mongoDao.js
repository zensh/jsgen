'use strict';
/*global require, module, Buffer, jsGen*/

var mongoIp = jsGen.conf.MongodbIp || '127.0.0.1',
    mongoPort = jsGen.conf.MongodbPort || 27017,
    mongoDbName = jsGen.conf.MongodbDefaultDbName || 'jsGen';

module.exports = {
    db: jsGen.module.mongoskin.db(mongoIp + ':' + mongoPort + '/?auto_reconnect=true', {
        database: mongoDbName
    })
};