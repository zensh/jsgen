var jsGen = exports = function() {return coding(true);};
========================================================

jsGen is web software you can generate a beautiful website or blog with javascript, Building with MongoDB, Node.js and Angular.js


jsGen是一个纯javascript编写的网站平台，采用NodeJS编写服务器程序，MongoDB作为数据库，AngularJS编写前端应用。jsGen还使用了rrestjs框架和mongoskin驱动。

jsGen是专门正对移动网站开发的系统。其基本原理：客户端浏览器发起访问请求后，NodeJS服务器先响应由AngularJS编写的应用框架，这个框架是html模板、js和css组成的静态文件（压缩后发送）。客户端获取到AngularJS应用后，再由AngularJS与后台的NodeJS服务器API接口通信，根据用户请求相关数据，这些数据是纯粹json数据包，AngularJS获取到json数据包后再编译成相关页面展现给用户。因此，对于用户的访问请求，只需在首次载入视图模板（html、js、css），其后的所有请求都是纯json数据交换，不再包含html代码，大大减少了数据流量。

正在填...


**页面URL链接示例：**

    /  //首页

    /home  //登录用户首页

    /user  //注册用户列表
    /Uxxxxx
    /user/Uxxxxx  //ID为Uxxxxx的用户页面，他人查看的用户信息页面
    /login  //用户登录独立页面
    /register  //用户注册独立页面

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



**API URL链接，GET、POST、PUT、DELETE请求，JSON数据格式**

    /api/index  //GET方法，获取全局配置数据，包括网站名。。。

    /api/user/index  //GET、POST、DELETE请求，对当前登录用户做相关操作
    /api/user/Uxxxxx  //GET请求，获取用户Uxxxxx公开信息
    /api/user/login  //POST请求，登录认证 {logname: 'name or email or Uid', logpwd: 'HmacSHA256(sha256(pwd), logname)', redirect:'uri'},{err: null}
    /api/user/logout  //GET请求，注销
    /api/user/register  //PUT请求，注册用户
    /api/user/admin  //管理员后台用户管理

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
