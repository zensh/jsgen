module.exports.UIDString = 'abcdefghijklmnopqrstuvwxyz';
module.exports.UserPre = {
	name: new Buffer(15 * 1024)
}
module.exports.User = {
	_id: 0,
	name: null,
	email: null,
	passwd: null,
	resetpwdKey: null,
	resetDate: null,
	loginAttempts: 0,
	locked: false,
	social: {
		weibo: {
			id: null,
			name: null
		},
		qq: {
			id: null,
			name: null
		},
		google: {
			id: null,
			name: null
		},
		baidu: {
			id: null,
			name: null
		}
	},
	sex: null,
	role: 'guest',
	avatar: null,
	desc: null,
	date: 0,
	score: 0,
	lastLoginDate: 0,
	login: [{
		date: 0,
		ip: '0.0.0.0'
	}],
	fans: 0,
	fansList: [],
	follow: 0,
	followList: [],
	tagsList: [],
	topics: 0,
	topicsList: [],
	collections: 0,
	collectionsList: [],
	comments: 0,
	commentsList: [],
	collect: 0,
	collectList: [],
	messages: {
		topics: [],
		collections: [],
		comments: [],
		fans: [],
		receive: []
	},
	receiveList: [],
	sendList: []
};