{jsGen} <small>0.7.x</small>
=======
**——JavaScript Generated**

### Demo and community: [AngularJS.cn](http://angularjs.cn/)

### Note that from version 0.6.x uses the REDIS!

### 0.7.x updates description(Developing...)

 1. Adjust the front-end code framework, the use of bower and gruntjs management code;
 2. use localStorage in article editor;
 3. Online mode and development mode's port have changed to `3000`, development mode command:

     node app.js --dev

## Introduction

JsGen is a next-generation open source community website system written in pure JavaScript, mainly used for building professional SNS type community, client application AngularJS minor modifications can also be turned into a multi-user blog system, discussion forum or CMS content management system.

JsGen using NodeJS to write server-side program, provides static file response and service REST API interfaces. Based on AngularJS doing browser-side application, build interactive Web UI views. MongoDB write data storage system.

## installation

Systems need to be mongoDB 2.4.x and Node.js 0.10.x, Windows environment needs to be Python2.7 and VS2012 (for compiling Node.js plug-in node-gyp and it needs to be compiled)

**Dependencies: Node.js 0.10.x, redis 2.6.12, mongoDB 2.4.x. Windows: Python2.7 and VS2012**

`Config.js` in the "config" directory configuration jsGen operating parameters, port, database including, a description.

`install.js` in the "api" directory is jsGen to run the initialization files, set the initial passwords administrator mailbox, with instructions.

    git clone git://github.com/zensh/jsgen.git

    cd jsgen

    npm install node-gyp //Windows you need to run this command, Linux does not need
                         //This command depend on Python and vs2012, please refer to https://github.com/TooTallNate/node-gyp/wiki/Visual-Studio-2010-Setup

    npm install          //Windows runs under npm install --msvs_version=2012

    node app.js install  //Boot jsGen First time, parameter `install` use to initialize MongoDB

    npm start            //boot jsgen normally (or node app.js)

Browser-side enter the URL [http://localhost/](http://localhost/) will access master.

The default administrator **username: admin  password: admin@jsgen.org.**

## upgrade

    git pull origin //update jsGen

    npm update //update Node.js module

## Update (Changelog)

+ 2013/08/25 jsGen v0.6.0 PR Node.js server side code. Using REDIS as cache using then.js process asynchronous tasks.

+ 2013/07/29 jsGen AngularJS v0.5.0 refactoring client part, server-side code is adjusted accordingly. Using a pure CSS framework, optimized UI, compatible with IE8! Rewrite and optimize AngularJS code, add a number of cool features code, AngularJS code: farmers may wish to look at!

+ 2013/06/01 jsGen a v0.3.5 fixes some bug, tags allow spaces.

+ 2013/05/26 jsGen v0.3.4 fix bug in admin site settings does not appear, manage increasing email authentication settings, turn off email validation by default.

+ 2013/04/25 jsGen v0.3.3 optimized browser-side application AngularJS.

+ 2013/04/25 jsGen v0.3.2 Repair button to hide the comments Editor, enter the bug card (modifying Markdown.Editor.js), instruction prefixes to Gen.

+ 2013/04/25 jsGen v0.3.1 browser-side application AngularJS the Automatic Updates feature.

+ 2013/04/21 jsGen v0.3.0 user auto-login feature on the server side, manually verify that the user's mailbox. Update jQuery client application AngularJS, Bootstrap to the latest version, optimized UI.

+ 2013/04/13 jsGen v0.2.11 adjustment codes, upgrade AngularJS to 1.6.

+ 2013/04/13 jsGen v0.2.10 Adaptation.

+ 2013/04/13 jsGen v0.2.9 bug repair featured articles, featured reviews, optimize code, suspended Cluster.

+ 2013/04/09 jsGen v0.2.8 repair article editor Bug.

+ 2013/04/07 jsGen v0.2.7 fix bug that caused process.nextTick (process exited), optimize the popular articles and statistics, new popular review statistics, and statistics.

+ 2013/04/07 jsGen cacheTL v0.2.6 Optimization, optimize online user statistics.

+ 2013/04/03 jsGen v0.2.5 fix cacheTL bug (the Bug may cause error getting background information).

+ 2013/04/02 perfection jsGen v0.2.4 users personal page, read the timeline display, update and read articles lists.

+ 2013/04/02 jsGen v0.2.3 fix user name, user email vulnerabilities.

+ 2013/04/02 jsGen v0.2.2 fixed bug, adjust the BootStrap view, make Web pages visually more clear, open cluster of Node.js multi-process capabilities.

+ 2013/04/01 jsGen v0.2.0 substantially optimize user, article, label, ID code, code more concise.

+ 2013/03/31 jsGen v0.1.2 fixed bug, add a loading progress bar.

+ 2013/03/30 jsGen v0.1.1 fixed bug, add forever to start script.

+ 2013/03/29 jsGen v0.1.0 beta release.

## 0.5.x update instructions
1. compatible with IE8.
2. waiver Bootstrap 3 framework, instead of pure YUI CSS framework for inclusion into the partial framework Bootstrap code, such as Modal, Tooltip, etc.
3. use cool Icon:Font-Awesome.
4. animation, streamline the article list/summary mode switch.
5. toastr message, is used to display an error or success to request information.
6. optimize design by response, cell phones, flat-screen Viewer with perfect access.
7. separation of language mechanisms, can be easily switched to another language (separation of template languages not yet completed).
8. PR AngularJS code, all kinds of cool feature code is as follows.
9. global Loading detection, automatic response to loading, loading default delay of 1 second response. Responds to all HTTP requests within the AngularJS, such as API requests, requests for HTML templates.
10. Global Error detection, automatic filtering error response (that is, into controlller is a successful response), including the server itself of error responses like 404, 500, etc and defined error response from the server, toastr displays an error message.
11. the integrated Validation validation mechanism, collected through the genTooltip instructions and prompts the invalid input, combined with uiValidate on enter to complete any custom validation. Mainly used in user login, user registration, user modifications, publish articles, comments, Admin Configuration.
12. uniform Dirty detecting mechanism, and the Union/intersect function with the genModal directive to achieve, in the publish/edit post page configuration page, admin pages, user information, such as when data is modified, if not saved to leave, prompting warning message.
13. common genPagination directives, the effect is like Github, link and no link page navigation can be achieved. The former generate a URL, can produce record navigation (browser forward backward), specific results see article list. Which event mechanism, do not change the URL without navigating records (can't go back), specific effect details see article comment page in the page navigation.
14. the picture placeholder asynchronous load genSrc directive, currently primarily used for user profile picture. JsGen use the Gavatar, user Gavatar useless until loading is completed, the placeholder image displays local server, replace user avatar automatically after loading is complete.
15. There are other cool codes such as timer trigger timing, automatic positioning page elements anchorScroll (animation effects to facilitate work, replacing the built-in $anchorScroll AngularJS), do not have to worry about Digest error applyFn (instead of $apply), universal myConf Cookies to store service
