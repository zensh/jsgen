jsGen
=====

jsGen is web software you can generate a beautiful website or blog with javascript, Building with MongoDB, Node.js and Angular.js


jsGen是一个纯javascript编写的网站平台，采用NodeJS编写服务器程序，MongoDB作为数据库，AngularJS编写前端程序。jsGen还使用了rrestjs框架和mongoskin驱动。

正在填...


页面URL链接示例：

/  //首页

/home  //登录用户首页

/user  //注册用户列表
/Uxxxxx
/user/Uxxxxx  //ID为Uxxxxx的用户页面，他人查看的用户信息页面
/user/login  //用户登录独立页面
/user/register  //用户注册独立页面

/article  //最新发表的文章列表
/article/update //最新更新文章列表，按新修改或新回复排序
/article/top  //热门文章列表，按文章热度排序
/Axxx
/article/Axxx  //ID为Axxx的文章详细页面
/article/add

/collection  //最新合集列表
/Oxxx
/collection/Oxxx //ID为Oxxx的合集详细页面
/collection/top //热门合集列表
/collection/add



API URL链接，GET、POST、PUT、DELETE请求，JSON数据格式

/api/index  //GET方法，获取全局配置数据，包括网站名。。。

/api/user/index  //GET、POST、DELETE请求，对当前登录用户做相关操作
/api/user/Uxxxxx  //GET请求，获取用户Uxxxxx公开信息
/api/user/login  //POST请求，登录认证 {logname: 'name or email or Uid', logpwd: 'HmacSHA256(sha256(pwd), logname)', redirect:'uri'},{err: null}
/api/user/logout  //GET请求，注销
/api/user/register  //PUT请求，注册用户
/api/user/admin

/api/article/index
/api/article/latest
/api/article/update
/api/article/top
/api/article/Axxx
/api/article/admin

/api/comment/index
/api/comment/latest
/api/comment/top
/api/comment/Cxxx
/api/comment/admin

/api/collection/index
/api/collection/Oxxx
/api/collection/latest
/api/collection/top
/api/collection/admin

/api/message/index
/api/message/Mxxx

/api/tag/
