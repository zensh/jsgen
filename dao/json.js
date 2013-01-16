module.exports.UIDString = 'abcdefghijklmnopqrstuvwxyz';  // 用户Uid字母表
module.exports.IDString = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';  // 文章、标签、评论、信息等id的字母表
module.exports.UserPre = {
	name: new Buffer(15 * 1024)  // 注册用户时给用户文档预分配文档空间15k，注册时用户初始数据大小只有1k多
};
module.exports.User = {
	_id: 0,  // 用户数据库id，整数，对外显示Uid形式为‘Uxxxxx’，其中x为Uid字母表字符，长度>=5，通过users的convertID方法相互转换。第一用户管理员Uid为‘Uadmin’，对应_id为61061
	name: null,  // 用户名，小写英文字母、数字、下划线_、或者汉字，4至15字节长（2至5汉字）
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
	articles: 0,
	articlesList: [],
	collections: 0,
	collectionsList: [],
	comments: 0,
	commentsList: [],
	collect: 0,
	collectList: [],
	messages: {
		article: [],
		collection: [],
		comment: [],
		fan: [],
		receive: []
	},
	receiveList: [],
	sendList: []
};

module.exports.Article = {
	_id: 0,
	author: 0,
	date: 0,
	display: 0,  //文章状态，0:publish：全可见;2:private：自己可见;1:friend：朋友（相互关注的）可见,3:forbid
	commend: 0,  //编辑是否推荐0:normal 1:recommend 2:top
	title: null,  //文章标题，最多60字节，可全局定义
	summary: null,  //文章摘要，最多360个字节，可全局定义
	content: null,  //文章内容，最多1024×20字节，可全局定义
	draft: null,  //文章内容存稿|草稿，未发表的版本，最多1024×20字节，可全局定义
	hots: 0,  //文章热度，访问+1，评论+2,支持+2,收藏+5,推荐+20
	visitors: 0,  //访问次数
	updateTime: 0,  //最后更新时间	
	update: [{  //编辑更新记录，
		_id: 0,  //编辑者的DBRef
		date: 0  //编辑时间
		}
	],
	refer: 0,
	tags: [],  //文章标签列表，最多允许5个标签
	favors: 0,  //支持的数量
	favorsList: [],  //支持者列表，
	collectors: 0,  //收藏的数量
	collectorsList: [], //收藏者列表，
	comments: 0,  //用户发表评论数
	commentsList: [] //评论列表
};

module.exports.Comment = {
	_id: 0,  //评论id显示为Cxxxxx，
	author: 0,  //作者的DBRef
	topic: 0,  //评论主题的DBRef
	refer: {  //引用评论，
		_id: 0,  //引用评论的DBRef
		author: 0  //引用评论的用户DBRef
		},
	date: 0, //发表时间
	content: null,  //文章内容，最多1024×20字节，可全局定义
	favors: 0,  //支持的数量
	favorsList: [],  //支持者列表，
	opposes: 0,  //反对者的数量
	opposesList: []  //反对者列表，
};

module.exports.Collection = {
	_id: 0,  //合集id显示为Oxxxxx
	author: 0,  //创建者的DBRef
	date: 0, //创建时间
	title: null,  //合集标题，最多60字节，可全局定义
	summary: null,  //合集摘要，最多360个字节，可全局定义
	subsection: [{  //合集由分部组成，分部由文章组成
		title: null,  //分部标题，可以为null，表示直接由文章组成合集
		summary: null,  //分部摘要，最多360个字节，可全局定义
		topics: [{  //分部中的文章
			_id: 0,  //文章的DBRef
			author: 0,  //作者的DBRef
			}]
		}
	],
	articles: 0,
	updateTime: 0,  //最后更新时间	
	update: [{  //编辑更新记录，
		_id: 0,  //编辑者的DBRef
		date: 0  //编辑时间
		}
	],
	collectors: 0,  //收藏的数量
	collectorsList: [] //收藏者列表，
};

module.exports.Message = {
	_id: 0,  //消息id显示为Mxxxxx
	author: 0,  //发送者的DBRef
	receiver: [{  //接收者名单列表，
		_id: 0,  //接收者的DBRef
		read: false  //接收者是否阅读消息，fasle为未读
		}
	],
	date: 0, //发表时间
	title: null,  //消息标题
	content: null  //文章内容，最多360字节，可全局定义
};

module.exports.Tag = {
	_id: 0,  //消息id显示为Txxxxx
	tag: null,  //标签名称，英文单词或中文词组（大于两个字）
	topics: 0,
	topicsList: [],  //该标签对应的文章列表，
	users: 0,
	usersList: []  //该标签对应的用户列表，
};