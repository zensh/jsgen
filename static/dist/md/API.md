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
