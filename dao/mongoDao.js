var mongo = require('mongoskin'),
	conf = require('../config/config.js');

var mongoIp = conf.MongodbIp || '127.0.0.1',
	mongoPort = conf.MongodbPort || 27017,
	mongoDbName = conf.MongodbDefaultDbName || 'jsGen';

module.exports = {
	db: mongo.db(mongoIp + ':' + mongoPort + '/?auto_reconnect=true', {database: mongoDbName}),
	BSON: mongo.BSON
}
