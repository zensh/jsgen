'use strict';
/*global require, module, Buffer, process, jsGen*/

var path = require('path'),
	processPath = path.dirname(process.argv[1]);//运行node的目录，这里可以方便替换下面baseDir的__dirname,方便用户自己搭建目录，利用node_modules加载rrestjs
module.exports = {
//通用配置
/*
* 注意，所有的路径配置的前面请加‘/’而后面不要加'/'！
*/
	server:'angularjs.cn',
	poweredBy: 'jsGen',
	listenPort:3000,//监听端口，如果配合clusterplus监听多个端口，这里也可以使用[3000, 3001, 3002, 3003]数组形式，rrestjs会智能分析
	//baseDir: path.join(__dirname, '/..'), //绝对目录地址，下面的目录配置都是根据这个目录的相对地址，这里是根据config文件进行配置地址
    baseDir:processPath,//这里是根据启动nodejs的命令目录来设置baseDir
    autoCreateFolders:false,//如果想要以node_modules加载rrestjs,则此项最好选择true,rrestjs会根据config自动创建静态文件目录和缓存目录等目录
	favicon:'/favicon.ico',  //favicon存放地址
	charset: 'utf-8',
	autoStatic:'/static',  //自动响应静态文件的uri，比如 http://rrestjs.com/static/rrest.jpg 将会自动响应给客户端，为了加速这里只能设置一级目录
	staticFolder:'/static',  //自动响应静态文件的根目录，比如  http://rrestjs.com/static/rrest.jpg 将返回 baseDir+'/static/rrest.jpg'
	staticParse:true,//是否开启静态文件压缩整合功能
    staticParseName:'parse',//压缩整合功能的名称，例如用户可以'/static/?parse=/index.body.css|/index.user.css|/user.face.css'压缩整合成一个css响应给客户端
	staticParseCacheTime:1000*60*60,//压缩整合缓存时间，1小时
	staticParseCacheFolder:'/tmp/static',//缓存整合功能的缓存文件夹
	staticParseMaxNumber:15,//整合压缩css或js文件的最大上限，建议不要超过15
	uploadFolder:'/tmp/upload', //文件上传的临时目录
	postLimit:1024*1024*3,//限制上传的postbody大小，单位byte
	connectTimeout:false,//限制客户端连接的时间，false为永远不超时，1000表示客户端和服务端1秒内没活跃则自动切断客户端连接
	manualRouter:false,//手动路由，可以在这里设置手动路由的对象，详细见manualRouter.js
	autoRouter:false,//自动路由，如果为false则表示关闭，如果为'/server'，则表示默认去server里寻找文件及方法，例如用户访问/user/face ，去回去server文件下找到user.js执行face的方法传入req,res对象
//cluster配置
	isCluster:false, //是否开启多进程集群
	isClusterAdmin:false,//进程监听管理功能是否开启
	CLusterLog:false,//是否打开cluster自带的控制台信息，生产环境建议关闭
	adminListenPort:20910,//管理员监听端口号
	adminAuthorIp:/^127.0.0.1$/,//允许访问管理的IP地址
	ClusterNum:2, //开启的进程数
	ClusterReload:'/api',//只有当进程数为1时，进入开发模式，可以监听此文件夹下的改动，包括子文件夹，不用重复 ctrl+c 和 上键+enter
	ClusterReloadExcept:['.swo', '.swp', '.swn', '.swx', '.bak'],//排除后缀名是此数组内的文件修改的重启进程
	Heartbeat:1000*60*2, //各个子进程和master进程之间的心跳间隔时间，如果为false表示不进行心跳检测，如果为1000表示每秒进行心跳检测，如果主进程没有收到子进程心跳，则会kill掉此子进程重新打开，防止子进程卡死，建议设置为1-5分钟。
	ClusterMaxMemory:false,//各个子进程最大的消耗内存数，如果超过这个上限则会记录错误日志，并且重启该子进程，设置为false表示不检测。建议设置为200MB以上
//静态文件配置
	staticMaxAge : 0, //静态文件的缓存周期，建议设置为7天
	staticGetOnly : true, //静态是否只能通过get获取
	staticLv2MaxAge : 1000*60*60, //静态文件2级缓存更新周期，建议设置为1小时
	staticLv2Number : 100,//静态文件2级缓存数量，可以根据内存的大小适当调整
//session配置
	isSession:true, //是否开启session，开启会影响性能。
	syncSession:false,//当多进程时是否开启session同步，开启会影响性能。
	sessionName:'Sid', //保存session id 的cookie 的name
	sessionExpire:1000*60*10, //false表示会话session，否则填入1000*60，表示session有效1分钟
	clearSessionSetInteval:1000*60*60, //自动清理垃圾session时间，建设设置为1小时
	clearSessionTime:1000*60*60*24,//会话session超时，建议设置为1天
//session内存存储
	sessionDbStore:false,//是否使用mongodb数据库存储session，如果设置为true，则不需要同步session
//deflate和gzip配置
	isZlib:true, //是否开启delate和gizp压缩，大并发压缩虽然可以减少传输字节数，但是会影响性能
	ZlibArray:['text/plain', 'application/javascript', 'text/css', 'application/xml', 'text/html'], //只压缩数组中的content-type响应
//logger log4js 配置
	isLog:true, //是否开启日志，过多的记录日志会影响性能，但是能记录系统运行情况
	logLevel:'error',//['trace','debug','info','warn','error', 'fatal'] 日志等级
	logPath:'/mylogs', // "/mylogs" 日志存放目录
	logMaxSize:1024*1024*10, //单个日志文件大小
	logFileNum:10, //当单个日志文件大小达标时，自动切分，这里设置最多切分多少个日志文件
//Template
	tempSet:'ejs', //使用哪种页面模版：jade或者ejs
	tempFolder :'/static/tpl', //默认读取模版的根目录
	tempHtmlCache:false, //是否开启模版的html缓存，当输出模版需要大量数据库或缓存I/O操作，且实时性要求不高时可以使用
	tempCacheTime:0,//模版缓存时间
	tempCacheFolder:'/tmp/tpl', //模版缓存 存放目录
//mongodb 配置
	isMongodb:true, //是否开启mongodb支持，注意：如果使用数据库存储session，这里必须开启
	MongodbIp:'127.0.0.1', //mongodb地址
	MongodbRC:false,//如果是false表示不使用mongodb的副本集，否则为字符串，表示副本集的名称
	MongodbRChost:[],//表示mongodb副本集的ip:port数组。
	MongodbPort:27017, //mongodb端口
	MongodbConnectString:false, //是否使用字符串连接，日入nae的连接方法，这个优先级高于地址+端口
	MongodbConnectTimeout:1000*30,//连接超时
	MongodbMaxConnect:50,//连接池连接数
	MongodbDefaultDbName:'jsGen',//默认使用的数据库名
	poolLogger:false,//是否记录连接池的日志，建议关闭
//自动加载模块 配置
	AutoRequire:false, //是否开启模块自动加载，加载只有的模块可以使用  rrest.mod.模块名 来进行调用
	ModulesFloder:'/modules', //自动加载模块的存放目录,只读一层目录
	ModulesExcept:[''], //自动加载模块目录中例外不加载的模块
//ip地址访问过滤
	IPfirewall:false, //是否开启IP过滤，开启会影响性能。
	BlackList:true,//如果是true，表示下面这些是黑名单，如果是false，表示下面这些是白名单，路径设置优先级大于IP
	ExceptIP:/^127.0.0.1$/, //正则表达式，匹配成功表示此IP可以正常访问,白名单
	ExceptPath:[],//例外的路径，如果用户访问这个url路径，无论在不在ip过滤列表中，都可以正常使用，白名单才能使用
	NotAllow:'No permission!', //禁止访问响应给客户端的信息
//客户端跨域功能
	isClientPipe:false  //如果为true，则提供给客户端跨域请求的功能
};
