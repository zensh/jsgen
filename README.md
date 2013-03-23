{jsGen} ——JavaScript Generated
==============================


JsGen is a next generation，free, open source web software that you can generate a powerful website, such as blog, forum, etc. It is coded by pure JavaScript, based on Node.js, AngularJS, MongoDB.

jsGen是用纯JavaScript编写的新一代免费开源的实时社区网站系统，主要用于搭建SNS类型的专业社区，稍作修改也可变成多用户博客系统、论坛或者CMS内容管理系统。

jsGen基于NodeJS编写服务器端程序，提供静态文件响应和REST API接口服务;基于AngularJS编写浏览器端应用，构建实时交互的网页UI视图;基于MongoDB编写数据存储系统。

jsGen开发理念是提供强大的实时交互功能，尽量减少浏览器与服务器之间的数据流量，非常适合搭建移动网站系统。

jsGen基本原理：客户端浏览器发起访问请求后，NodeJS服务器先响应由AngularJS编写的Web应用，这个应用是由html模板、js和css静态文件组成。客户端获取到AngularJS应用后，再由AngularJS与后台的NodeJS服务器API接口通信，根据用户请求交换数据，这些数据是纯粹json数据包，AngularJS获取到json数据包后再编译成相关页面展现给用户。因此，用户进入网站时，只需在首次载入视图模板（html、js、css），其后的所有请求都是纯json数据交换，不再包含html代码，大大减少了数据流量。

## 特点：

## 用户访问URL

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

## REST API接口

**API接口采用JSON作为GET、POST、PUT、DELETE请求的数据交换格式**

    /api/index  //GET方法，获取全局配置数据，包括网站名。。。

    /api/user/index  //GET、POST、DELETE请求，对当前登录用户做相关操作
    /api/user/Uxxxxx  //GET请求，获取用户Uxxxxx公开信息
    /api/user/login  //POST请求，登录认证
    /api/user/logout  //GET请求，注销
    /api/user/register  //PUT请求，注册用户
    /api/user/admin  //GET POST PUT管理员后台用户管理

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
