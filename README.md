{jsGen} <small>0.5.x</small>
=======
**——JavaScript Generated**

### 在线演示及交流社区：[AngularJS中文社区][2]

### 本版更新说明 0.5.x

 1. 兼容IE8。
 2. 放弃Bootstrap 3框架，改用YUI的pure CSS框架，并入部分Bootstrap框架代码，如Modal、Tooltip等。
 3. 使用超酷的Icon：Font-Awesome。
 4. 动画效果，文章列表精简/摘要模式切换。
 5. toastr信息提示条，用于显示错误或成功的请求信息。
 6. 优化响应式设计，手机、平板浏览器可完美访问。
 7. 分离语言机制，可方便切换成其它语言（模板中的语言暂未分离，待完成）。
 8. 完全重构AngularJS代码，各种很酷的功能代码如下。
 9. 全局Loading检测，自动响应loading状态，默认延迟1秒响应loading。可响应AngularJS内部所有http请求，如API请求、html模板请求等。
 10. 全局Error检测，自动过滤错误响应（即进入到controlller中的都是成功响应），包括服务器自身的错误响应如404、500等和服务器定义的错误响应，toastr显示错误信息。
 11. 统一的Validation验证机制，通过`genTooltip`指令收集并提示无效输入，配合`uiValidate`可对输入完成任何自定义验证。主要应用于用户登录、用户注册、用户信息修改、发表文章、发表评论，管理后台配置等。
 12. 统一的Dirty检测机制，通过`genModal`指令和`union/intersect`函数实现，在发表/编辑文章页面、用户信息配置页面、后台管理页面等修改了数据时，若未保存离开，提示警告信息。
 13. 通用的`genPagination`指令，效果仿Github，可实现有链接和无链接分页导航。前者生成url，可产生导航记录（浏览器前进后退），具体效果见文章列表。后者通过事件机制实现，不改变url，无导航记录（不能前进后退），具体效果见文章详情页面中的评论分页导航。
 14. 图片预占位异步加载`genSrc`指令，目前主要用于用户头像。jsGen使用Gavatar，再用户的Gavatar没用加载完成之前，显示本地服务器的占位图像，加载完成后自动替换成用户头像。
 15. 还有其他很酷的代码如定时器触发器`timing`，自动定位页面元素的`anchorScroll`（动画效果，方便好使，取代AngularJS内置的$anchorScroll），无须担心digest错误的`applyFn`（代替$apply）,通用的Cookies存储服务`myConf`等

### 下版开发目标 0.6.0

 1. 优化重构服务器端node.js代码；
 2. 添加消息系统；

### 简介 (Introduction)

[JsGen][1]是用纯JavaScript编写的新一代开源社区网站系统，主要用于搭建SNS类型的专业社区，对客户端AngularJS应用稍作修改也可变成多用户博客系统、论坛或者CMS内容管理系统。

jsGen基于NodeJS编写服务器端程序，提供静态文件响应和REST API接口服务。基于AngularJS编写浏览器端应用，构建交互式网页UI视图。基于MongoDB编写数据存储系统。

[JsGen][1] is a next generation，free, open source web software that you can generate a powerful website, such as blog, forum, etc. It is coded by pure JavaScript, based on Node.js, AngularJS, MongoDB.

Node.js provide REST API server, AngularJS web app gets data from server and generate the view to user.

#### 安装 (Installation)

**系统需要Node.js 0.10.x和mongoDB 2.4.x**
**Windows环境需要Python2.7和VS2012（用于编译node-gyp及其它需要编译的Node.js插件）**

**Dependencies: Node.js 0.10.x and mongoDB 2.4.x.**
**Windows: Python2.7 and VS2012**

config目录下的config.js配置jsGen运行参数，包括监听端口、数据库等，内有说明。

api目录下的install.js是jsGen运行初始化文件，设置管理员初始密码，邮箱，内有说明。

    git clone git://github.com/zensh/jsgen.git
    cd jsgen
    npm install node-gyp    //windows需要先运行此命令，linux不需要
                            //此命令依赖python和vs2012，请参考 https://github.com/TooTallNate/node-gyp/wiki/Visual-Studio-2010-Setup
    npm install             //npm安装依赖模块，请确保依赖模块全部安装好。
                            //windows下请运行 npm install --msvs_version=2012
    npm start               //启动jsgen（或者 node app.js）

jsGen的Github源码包括两个分支：`master`和`dev`，默认为master分支：

 1. master分支的Javascript代码经过了压缩合并，用于线上运行，访问端口为**80**；

 2. dev分支为开发分支，可用于参观学习，访问端口为**3000**。

浏览器端输入网址[http://localhost/](http://localhost/)即可访问。

默认的管理员用户名: **admin** 密码: **admin@zensh.com**。

Default administrator username: **admin** password: **admin@zensh.com**.

#### 升级 (Update)

    git pull            //更新jsGen
    npm update          //更新Node.js模块
    npm start           //重启jsGen

### 更新 (Changelog)

 + 2013/07/29 jsGen v0.5.0 完全重构AngularJS客户端部分，服务器端代码做相应调整。使用pure CSS框架，优化UI，兼容IE8！重写并优化AngularJS代码，添加若干很酷的功能代码，在学习AngularJS的码农不妨看看！
 + 2013/06/01 jsGen v0.3.5 修复若干bug，标签允许空格。
 + 2013/05/26 jsGen v0.3.4 修复管理后台不出现网站设置的bug，管理后台增加邮箱验证设置，默认关闭邮箱验证。
 + 2013/04/25 jsGen v0.3.3 优化浏览器端AngularJS应用。
 + 2013/04/25 jsGen v0.3.2 修复评论编辑器按钮隐藏、输入卡的bug（修改了Markdown.Editor.js），指令前缀改为gen。
 + 2013/04/25 jsGen v0.3.1 浏览器端AngularJS应用自动更新功能。
 + 2013/04/21 jsGen v0.3.0 服务器端增加用户自动登录功能，用户邮箱手动验证。客户端AngularJS应用更新jQuery、Bootstrap至最新版，优化UI。
 + 2013/04/13 jsGen v0.2.11 调整代码，升级AngularJS到1.0.6。
 + 2013/04/13 jsGen v0.2.10 视觉调整。
 + 2013/04/13 jsGen v0.2.9 修复热门文章、热门评论bug，优化代码，暂停使用Cluster。
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

### 目录和文件 (menus and files)

    +api                // 服务器端API目录
        -article.js       // 文章和评论系统API接口
        -collection.js    // 合集系统API接口
        -index.js         // 网站全局信息API接口
        -install.js       // 初始化安装程序
        -message.js       // 站内信息系统API接口
        -tag.js           // 标签系统API接口
        -user.js          // 用户系统API
    +config
        -config.js        // 网站配置文件
    +dao                // MongoDB数据库访问层
        -articleDao.js    // 文章评论访问接口
        -collectionDao.js // 合集系统访问接口
        -indexDao.js      // 网站全局信息访问接口
        -messageDao.js    // 站内信息系统访问接口
        -mongoDao.js      // MongoDB访问接口
        -tagDao.js        // 标签系统访问接口
        -userDao.js       // 用户系统访问接口
    +lib                // 通用工具模块
        -anyBaseConverter.js  // 通用进制转换器
        -cacheLRU.js      // LRU缓存模块
        -cacheTL.js       // TL缓存模块
        -email.js         // SMTP Email模块
        -json.js          // 数据库格式模板
        -msg.js           // 程序信息
        -tools.js         // 核心工具函数
    +mylogs             // 日志目录，网站运行后产生内容
    +node_modules       // Node.js模块目录，npm install后产生内容
    +static             // 浏览器端AngularJS WEB应用
        +css
        +font-awesome     //很酷的web icon
        +img
        +js
            +lib            // AngularJS、jQuery等js模块
            -app.js         // 全局初始化模块
            -controllers.js // 控制器模块
            -directives.js  // 指令模块
            -filters.js     // 过滤器模块
            -locale_zh-cn.js// 语言包
            -router.js      // 路由模块
            -services.js    // 通用服务模块
            -tools.js       // 工具函数模块
        +md               // MarkDown文档
        +tpl              // html模板
        -favicon.ico
        -index.html       // AngularJS WEB应用入口文件
    +tmp                // 缓存目录
        +static           // 压缩js、css缓存目录，必须
        +tpl              // html模板文件缓存目录
        +upload           // 上传文件缓存目录
    -app.js             // Node.js入口文件
    -package.json       // jsGen信息文件

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

### 感谢 (Acknowledgments)

**jsGen** 是为[AngularJS中文社区][2]开发的网站系统，测试版已经上线，还请大家温柔测试，积极反馈Bug。

非常感谢[GitHub][3]和在GitHub上贡献开源代码的[Node.js][4]、[AngularJS][5]、[MongoDB][6]、[Bootstrap][7]以及其他JavsScript插件的伟大码农们，还有国内码农贡献的[rrestjs][8]、[mongoskin][9]、[xss][10]等。jsGen也是开源免费。

### MIT 协议

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
