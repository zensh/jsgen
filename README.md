{jsGen} <small>0.2.0</small>
=======
**——JavaScript Generated**

### 简介：

[JsGen][1] is a next generation，free, open source web software that you can generate a powerful website, such as blog, forum, etc. It is coded by pure JavaScript, based on Node.js, AngularJS, MongoDB.

jsGen是用纯JavaScript编写的新一代开源社区网站系统，主要用于搭建SNS类型的专业社区，对客户端AngularJS应用稍作修改也可变成多用户博客系统、论坛或者CMS内容管理系统。

jsGen基于NodeJS编写服务器端程序，提供静态文件响应和REST API接口服务;基于AngularJS编写浏览器端应用，构建交互式网页UI视图;基于MongoDB编写数据存储系统。

jsGen基本原理：客户端浏览器发起访问请求后，NodeJS服务器先响应由AngularJS编写的Web应用，这个应用是由html模板、js和css静态文件组成。客户端获取到AngularJS应用后，再由AngularJS与后台的NodeJS服务器API接口通信，根据用户请求交换数据，这些数据是纯粹json数据包，AngularJS获取到json数据包后再编译成相关页面展现给用户。因此，用户进入网站时，只需在首次载入视图模板（html、js、css），其后的所有请求都是纯json数据交换，不再包含html代码，大大减少了数据流量。

### 特点：

1. 前沿的WEB技术，前所未有的网站构架形态，前端与后端完全分离，前端由 **AngularJS** 生成视图，后端由 **Node.js** 提供REST API数据接口和静态文件服务。只需改动前端AngularJS应用形态，即可变成论坛、多用户博客、内容管理系统等。

2. 用户数据、文章评论数据、标签数据、分页缓存数据、用户操作间隔限时等都使用 **LRU缓存** ，降低数据库IO操作，同时保证同步更新数据。

3. 前后端利用 **json** 数据包进行数据通信。文章、评论采用 **Markdown** 格式编辑、存储，支持GitHub的GFM（GitHub Flavored Markdown），Markdown解析成HTML DOM并进行 **XSS攻击** 过滤由前端AngularJS应用完成。

4. **用户帐号系统**，关注（follow）用户/粉丝、邮箱验证激活、邮箱重置密码、SHA256加密安全登录、登录失败5次锁定/邮箱解锁、用户标签、用户积分、用户权限等级、用户阅读时间线等功能。用户首页展现用户关注标签、关注作者的相关的文章（即用户感兴趣的文章）。

5. **文章/评论系统**，文章、评论使用统一数据结构，均可被评论、支持、反对、标记（mark，即收藏），当评论达到一定条件（精彩评论）可自动提升为文章（独立出来，类branch功能），同样文章达到一定条件即可自动推荐。自动实时统计文章、评论热度，自动生成最新文章列表、一周内最热文章列表、一周内最热评论列表、最近更新文章列表。强大的文章、评论列表分页导航功能，缓存每个用户的分页导航浏览记录。

6. **标签系统**，文章和用户均可加标签，可设置文章、用户标签数量上限。用户通过标签设置自己关注话题，文章通过标签形成分类。标签在用户编辑个人信息或编辑文章时自动生成，自动管理，也可管理员后台管理。自动展现热门标签。

7. **文章合集系统**，作者、编辑、管理员可将一系列相关文章组成合集，形成有章节大纲目录的电子书形态。教程文档、主题合集甚至小说连载等均可由合集系统形成。（待完成）

8. **站内短信系统**，提供在文章、评论中 @用户的功能，重要短信发送邮件通知功能等。（待完成）

9. **后台管理系统**，网站参数设置、缓存设置、网站运行信息、文章、评论、用户、标签、合集、站内短信等管理。

10. **Robot SEO系统**，由于AngularJS网页内容在客户端动态生成，对搜索引擎robot天生免疫。jsGen针对robot访问，在服务器端动态生成robot专属html页面。搜索引擎Robot名称可在管理后台添加。

### 说明

**jsGen** 是为[AngularJS中文社区][2]开发的网站系统，测试版已经上线，还请大家温柔测试，积极反馈Bug。

在移动互联网爆炸式发展、webOS类系统（谷歌ChromeOS、火狐OS等）进入实用阶段、TV机顶盒应用即将爆发等大环境大趋势下，JavaScript无疑将成为WEB中最重要的开发语言，深入学习JavaScript势在必行。

AngularJS中文社区改版之后，致力于形成一个以AngularJS为主，WEB相关的各种JavaScript技术并行学习讨论交流的专业技术社区，我本人会将开发jsGen的经验心得形成文字与大家分享。

同时也因为我是半路转行的新手，jsGen是我边学边写的第一个编程作业。jsGen表现形式参考了[Node.js中文社区][11]，但核心构架完全自我设计，未经验证！测试版上线无疑将出现各种问题，希望大家能积极评测反馈。jsGen代码将会持续优化，并完善相关代码解释说明文档。对于JS新手来说，这也许是个好的学习实例。

非常感谢[GitHub][3]和在GitHub上贡献开源代码的[Node.js][4]、[AngularJS][5]、[MongoDB][6]、[Bootstrap][7]以及其他JavsScript插件的伟大码农们，还有国内码农贡献的[rrestjs][8]、[mongoskin][9]、[xss][10]等，是你们的贡献，让jsGen得以成型。jsGen也是开源免费（MIT协议）。

### 安装

系统需要Node.js和mongoDB。

config目录下的config.js配置jsGen运行参数，包括监听端口（默认3000）、数据库等，内有详细说明。

api目录下的install.js是jsGen运行初始化文件，其中第129、130行分别是超级管理员的用户Uid和用户名，请勿修改。第131行是管理员邮箱，第132行是管理员初始密码，这两处请自行修改。（内有说明）

    //如果未安装git工具，请手动下载jsGen。
    git clone git://github.com/zensh/jsgen.git
    //进入jsgen目录
    cd jsgen
    //npm安装依赖模块，请确保依赖模块全部安装好。
    npm install
    //启动jsgen（或者 node app.js）
    npm start

浏览器端输入网址[http://localhost:3000/](http://localhost:3000/)即可访问。

### 用户访问URL

用户访问URL路由逻辑完全由前端AngularJS应用决定，见`/static/js/app.js`。


    //网站首页
    /

    //登录页
    /login

    //注册页
    /register

    //登录用户首页
    /home

    //管理员后台
    /admin

    //添加文章页
    /add

    //标签聚合页
    /tag

    //重置密码、解锁请求页
    /reset/xxx

    //用户个人主页，Uxxxxx为用户唯一标志ID
    /Uxxxxx

    //文章编辑页
    /Axxx/edit

    //文章展示页,Axxx为文章、评论唯一标志ID，评论在文章下部展现，当然也可像文章一样独立展现。
    /Axxx

    //标签相关文章列表,Txxx为标签唯一标志ID
    //Txxx

    //合集展示页
    /Cxxx

### REST API接口

**API接口URL一般支持GET、POST、DELETE请求方法，GET、POST采用JSON作为数据交换格式**


    //获取网站全局配置文件、包括站点信息、部分站点参数
    /api/index (GET)

    //设置网站全局参数
    /api/admin (GET POST)

    //获取已登录用户信息，包括用户个人信息和用户关注而未读的文章列表
    /api/user (GET POST)
    /api/user/index (GET POST)

    //用户登录
    /api/user/login (POST)

    //退出登录
    /api/user/logout (GET)

    //用户注册
    /api/user/register (POST)

    //用户邮箱验证、申请解锁、重置密码、修改邮箱等涉及邮箱验证的操作
    /api/user/reset (GET POST)

    //用户管理相关后台接口
    /api/user/admin (GET POST)

    //获取已登录用户（自己）的文章列表
    /api/user/article (GET)

    //获取已登录用户（自己）的评论列表
    /api/user/comment (GET)

    //获取已登录用户（自己）的标记文章列表
    /api/user/mark (GET)

    //获取已登录用户（自己）的粉丝列表
    /api/user/fans (GET)

    //获取已登录用户（自己）的关注列表
    /api/user/follow (GET)

    //获取用户Uxxxxx的用户信息，包括用户公开的个人信息和用户最新发表的文章列表
    /api/user/Uxxxxx (GET POST)

    //获取用户Uxxxxx的文章列表
    /api/user/Uxxxxx/article (GET)

    //获取用户Uxxxxx的粉丝列表
    /api/user/Uxxxxx/fans (GET)

    //获取最新文章列表，添加文章
    /api/article (GET POST)
    /api/article/index (GET POST)

    //文章管理相关后台接口
    /api/article/admin (GET POST)

    //获取热门评论、批量获取指定ID的评论
    /api/article/comment (GET POST)

    //获取最新文章列表（按发表时间排序）
    /api/article/latest (GET)

    //获取最热文章列表（按文章热度排序）
    /api/article/hots (GET)

    //获取最近更新（按文章最后更新、最后评论时间排序）
    /api/article/update (GET)

    //获取文章Axxx的相信内容
    /api/article/Axxx (GET POST DELETE)

    //获取文章Axxx的更多评论
    /api/article/Axxx/comment (GET)


    //获取热门标签列表
    /api/tag (GET POST)

    //标签管理后台相关接口
    /api/tag/admin (GET POST)

    //获取标签Txxx包含的文章列表（按照发表时间排序）
    /api/tag/Txxx (GET POST)

    /api/message

    /api/collection


  [1]: https://github.com/zensh/jsgen
  [2]: http://angularjs.cn
  [3]: https://github.com/
  [4]: https://github.com/joyent/node
  [5]: https://github.com/angular/angular.js
  [6]: https://github.com/mongodb/mongo
  [7]: https://github.com/twitter/bootstrap
  [8]: https://github.com/DoubleSpout/rrestjs
  [9]: https://github.com/kissjs/node-mongoskin
  [10]: https://github.com/leizongmin/js-xss
  [11]: http://cnodejs.org/
