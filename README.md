{jsGen} <small>0.2.9</small>
=======
**——JavaScript Generated**

### 简介 (Introduction)

[JsGen][1] is a next generation，free, open source web software that you can generate a powerful website, such as blog, forum, etc. It is coded by pure JavaScript, based on Node.js, AngularJS, MongoDB.

jsGen是用纯JavaScript编写的新一代开源社区网站系统，主要用于搭建SNS类型的专业社区，对客户端AngularJS应用稍作修改也可变成多用户博客系统、论坛或者CMS内容管理系统。

jsGen基于NodeJS编写服务器端程序，提供静态文件响应和REST API接口服务;基于AngularJS编写浏览器端应用，构建交互式网页UI视图;基于MongoDB编写数据存储系统。

jsGen基本原理：客户端浏览器发起访问请求后，NodeJS服务器先响应由AngularJS编写的Web应用，这个应用是由html模板、js和css静态文件组成。客户端获取到AngularJS应用后，再由AngularJS与后台的NodeJS服务器API接口通信，根据用户请求交换数据，这些数据是纯粹json数据包，AngularJS获取到json数据包编译成相关页面展现给用户。因此，用户进入网站时，只需在首次载入视图模板（html、js、css），其后的所有请求都是纯json数据交换，不再包含html代码，大大减少了数据流量。

### 特点 (Features)

1. 前沿的WEB技术，前所未有的网站构架形态，前端与后端完全分离，前端由 **AngularJS** 生成视图，后端由 **Node.js** 提供REST API数据接口和静态文件服务。只需改动前端AngularJS应用视图形态，即可变成论坛、多用户博客、内容管理系统等。

2. 用户数据、文章评论数据、标签数据、分页缓存数据、用户操作间隔限时等都使用 **LRU缓存** ，降低数据库IO操作，同时保证同步更新数据。

3. 前后端利用 **json** 数据包进行通信。文章、评论采用 **Markdown** 格式编辑、存储，支持GitHub的GFM，AngularJS应用将Markdown解析成HTML DOM。

4. **用户帐号系统**，关注（follow）用户/粉丝、邮箱验证激活、邮箱重置密码、SHA256加密安全登录、登录失败5次锁定/邮箱解锁、用户标签、用户积分、用户权限等级、用户阅读时间线等功能。用户主页只展现感兴趣的最新文章（关注标签、关注作者的文章）。

5. **文章/评论系统**，文章、评论使用统一数据结构，均可被评论、支持、反对、标记（mark，即收藏），当评论达到一定条件（精彩评论）可自动提升为文章（进入文章列表展现，类branch功能），同样文章达到一定条件即可自动推荐。自动实时统计文章、评论热度，自动生成最新文章列表、一周内最热文章列表、一周内最热评论列表、最近更新文章列表。强大的文章、评论列表分页导航功能，缓存每个用户的分页导航浏览记录。

6. **标签系统**，文章和用户均可加标签，可设置文章、用户标签数量上限。用户通过标签设置自己关注话题，文章通过标签形成分类。标签在用户设置标签或文章设置标签时自动生成。自动展现热门标签。

7. **文章合集系统**，作者、编辑、管理员可将一系列相关文章组成合集，形成有章节大纲目录的在线电子书形态，可用于教程文档、主题合集甚至小说连载等。（待完成）

8. **站内短信系统**，提供在文章、评论中 @用户的功能，重要短信发送邮件通知功能等。（待完成）

9. **后台管理系统**，网站参数设置、缓存设置、网站运行信息、文章、评论、用户、标签、合集、站内短信等管理。

10. **Robot SEO系统**，由于AngularJS网页内容在客户端动态生成，对搜索引擎robot天生免疫。jsGen针对robot访问，在服务器端动态生成robot专属html页面。搜索引擎Robot名称可在管理后台添加。

### 更新 (Changelog)

 + 2013/04/09 jsGen v0.2.8 修复文章编辑器Bug。
 + 2013/04/07 jsGen v0.2.7 修复process.nextTick引起的bug（导致进程退出），优化热门文章统计、热门评论统计、最近更新统计。
 + 2013/04/07 jsGen v0.2.6 优化cacheTL，优化在线用户统计。
 + 2013/04/03 jsGen v0.2.5 修复cacheTL的bug（该Bug可能导致获取后台信息出错）。
 + 2013/04/02 jsGen v0.2.4 完善用户个人主页，显示阅读时间线、更新文章和已阅读文章列表。
 + 2013/04/02 jsGen v0.2.3 修复用户名、用户邮箱大小写漏洞。
 + 2013/04/02 jsGen v0.2.2 修正bug，调整BootStrap视图，使网页视觉效果更明了，可开启Node.js的cluster多进程功能。
 + 2013/04/01 jsGen v0.2.0 大幅优化用户、文章、标签ID相关代码，代码更简洁。
 + 2013/03/31 jsGen v0.1.2 修正bug，添加加载进度条。
 + 2013/03/30 jsGen v0.1.1 修正几个bug，添加forever启动脚本。
 + 2013/03/29 jsGen v0.1.0 测试版发布。

### 说明 (Annotation)

**jsGen** 是为[AngularJS中文社区][2]开发的网站系统，测试版已经上线，还请大家温柔测试，积极反馈Bug。

AngularJS中文社区改版之后，致力于形成一个以AngularJS为主，WEB相关的各种JavaScript技术并行的专业技术社区，我本人会将开发jsGen的经验心得形成文字与大家分享。

由于jsGen全新的构架设计未经验证，测试版可能出现各种bug，希望大家能积极评测反馈。jsGen代码将会持续优化，并完善相关代码解释说明文档。对于JS新手来说，这也许是个好的学习实例。

非常感谢[GitHub][3]和在GitHub上贡献开源代码的[Node.js][4]、[AngularJS][5]、[MongoDB][6]、[Bootstrap][7]以及其他JavsScript插件的伟大码农们，还有国内码农贡献的[rrestjs][8]、[mongoskin][9]、[xss][10]等，是你们的贡献，让jsGen得以成型。jsGen也是开源免费（MIT协议）。

### 安装 (Installation)

系统需要Node.js 0.10.x和mongoDB 2.4.x。

config目录下的config.js配置jsGen运行参数，包括监听端口（默认3000）、数据库等，内有说明。

api目录下的install.js是jsGen运行初始化文件，设置管理员初始密码，邮箱，内有说明。

    git clone git://github.com/zensh/jsgen.git    //如果未安装git工具，请手动下载jsGen。

    cd jsgen    //进入jsgen目录

    npm install node-gyp    //windows需要先运行此命令，linux不需要，另外windows请参考 https://github.com/TooTallNate/node-gyp/wiki/Visual-Studio-2010-Setup
    npm install    //npm安装依赖模块，请确保依赖模块全部安装好。

    npm start    //启动jsgen（或者 node app.js）

浏览器端输入网址[http://localhost:3000/](http://localhost:3000/)即可访问。

**更新：**

jsGen测试版升级比较频繁，更新流程如下：

    git pull    //获取jsGen更新

    npm update    //获取Node.js模块更新

    npm start    //重启jsGen

    rm tmp/static/*    //删除js、css静态缓存,可能会需要清空浏览器端缓存

### 用户访问URL

用户访问URL路由逻辑完全由前端AngularJS应用决定，见`/static/js/app.js`。

    /    //网站首页

    /login    //登录页

    /register    //注册页

    /home    //登录用户首页

    /admin    //管理员后台

    /add    //添加文章页

    /tag    //标签聚合页

    /reset/xxx    //重置密码、解锁请求页

    /Uxxxxx    //用户个人主页，Uxxxxx为用户唯一标志ID

    /Axxx/edit    //文章编辑页

    /Axxx    //文章展示页,Axxx为文章、评论唯一标志ID，评论在文章下部展现，当然也可像文章一样独立展现。

    /Txxx    //标签相关文章列表,Txxx为标签唯一标志ID

    /Cxxx    //合集展示页

### REST API接口

**API接口URL一般支持GET、POST、DELETE请求方法，GET、POST采用JSON作为数据交换格式**


    /api/index    //(GET) 获取网站全局配置文件、包括站点信息、部分站点参数

    /api/admin //(GET POST) 设置网站全局参数

    /api/user //(GET POST) 获取已登录用户信息，包括用户个人信息和用户关注而未读的文章列表
    /api/user/index (GET POST)

    /api/user/login //(POST) 用户登录

    /api/user/logout //(GET) 退出登录

    /api/user/register //(POST) 用户注册

    /api/user/reset //(GET POST) 用户邮箱验证、申请解锁、重置密码、修改邮箱等涉及邮箱验证的操作

    /api/user/admin //(GET POST) 用户管理相关后台接口

    /api/user/article //(GET) 获取已登录用户（自己）的文章列表

    /api/user/comment //(GET) 获取已登录用户（自己）的评论列表

    /api/user/mark //(GET) 获取已登录用户（自己）的标记文章列表

    /api/user/fans //(GET) 获取已登录用户（自己）的粉丝列表

    /api/user/follow //(GET) 获取已登录用户（自己）的关注列表

    /api/user/Uxxxxx //(GET POST) 获取用户Uxxxxx的用户信息，包括用户公开的个人信息和用户最新发表的文章列表

    /api/user/Uxxxxx/article //(GET) 获取用户Uxxxxx的文章列表

    /api/user/Uxxxxx/fans //(GET) 获取用户Uxxxxx的粉丝列表

    /api/article //(GET POST) 获取最新文章列表，添加文章
    /api/article/index //(GET POST)

    /api/article/admin //(GET POST) 文章管理相关后台接口

    /api/article/comment //(GET POST) 获取热门评论、批量获取指定ID的评论

    /api/article/latest //(GET) 获取最新文章列表（按发表时间排序）

    /api/article/hots //(GET) 获取最热文章列表（按文章热度排序）

    /api/article/update //(GET) 获取最近更新（按文章最后更新、最后评论时间排序）

    /api/article/Axxx //(GET POST DELETE) 获取文章Axxx的相信内容

    /api/article/Axxx/comment //(GET) 获取文章Axxx的更多评论

    /api/tag //(GET POST) 获取热门标签列表

    /api/tag/admin //(GET POST) 标签管理后台相关接口

    /api/tag/Txxx //(GET POST) 获取标签Txxx包含的文章列表（按照发表时间排序）

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
