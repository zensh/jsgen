**完整版《Markdown 语法说明 (简体中文版)》请访问[Wow!Ubuntu](http://wowubuntu.com/markdown/)**

## 一、段落、标题、区块 ##

**段落:** 一个以上的空行则会划分出不同的段落，一般的段落不需要用空白或换行缩进。

**标题:** 行首插入 1 到 6 个 `#` ，对应到标题 1 到 6 阶。

**区块:** 区块引用则使用 '`>`' 角括号。

Markdown 语法:

    # 这是一级标题
    ## 这是二级标题

    这是第一个段落！这是第一个段落！这是第一个段落！这是第一个段落！

    这是第二个段落！这是第二个段落！这是第二个段落！这是第二个段落！

    > ## 区块引用中的二级标题
    >
    > 区块引用区块引用区块引用
    > 区块引用区块引用区块引用

**输出效果：**

# 这是一级标题
## 这是二级标题

这是第一个段落！这是第一个段落！这是第一个段落！这是第一个段落！

这是第二个段落！这是第二个段落！这是第二个段落！这是第二个段落！

> ## 区块引用中的二级标题
>
> 区块引用区块引用区块引用
>
> 区块引用区块引用区块引用


### 二、修辞和强调 ###

使用一对单星号或双星号来标记需要强调的区段。

Markdown 语法:

    *这是使用单星号生成em标签的强调*。

    **这是使用双星号生成strong标签的强调**。

**输出效果：**

*这是使用单星号生成em标签的强调*。

**这是使用双星号生成strong标签的强调**。

## 三、列表 ##

无序列表使用*、+或-来做为列表的项目标记。

Markdown 语法:

    * 第一序列。
    * 第二序列。
    * 第三序列。

**输出效果：**

* 第一序列。
* 第二序列。
* 第三序列。

有序列表则是使用数字、英文句点、空格作为项目标记。

Markdown 语法:

    1. 第一序列。
    2. 第二序列。
    3. 第三序列。

**输出效果：**

1. 第一序列。
2. 第二序列。
3. 第三序列。

### 四、链接 ###

支持*行内* 和 *参考* 两种形式。

行内形式链接 Markdown 语法:

    这里就是[链接](http://angularjs.cn/)啦。

**输出效果：**

这里就是[链接](http://angularjs.cn/)啦。

参考形式链接 Markdown 语法:

    第一个链接是 [Google][1]，第二个链接是[Yahoo][2]，第三个链接是[MSN][3]。

    [1]: http://google.com/ "Google"
    [2]: http://search.yahoo.com/ "Yahoo Search"
    [3]: http://search.msn.com/ "MSN Search"

**输出效果：**

第一个链接是 [Google][1]，第二个链接是[Yahoo][2]，第三个链接是[MSN][3]。

[1]: http://google.com/ "Google"
[2]: http://search.yahoo.com/ "Yahoo Search"
[3]: http://search.msn.com/ "MSN Search"

## 五、图片 ##

图片的语法和链接很像，只是前面多了一个！号。

行内形式图片链接 Markdown 语法:

    ![淘宝网LOGO图片](http://img01.taobaocdn.com/tps/i1/T1Kz0pXzJdXXXIdnjb-146-58.png)

参考形式图片链接 Markdown 语法:

    ![淘宝网LOGO图片][logo]

    [logo]: http://img01.taobaocdn.com/tps/i1/T1Kz0pXzJdXXXIdnjb-146-58.png

**输出效果：**

![淘宝网LOGO图片][logo]

[logo]: http://img01.taobaocdn.com/tps/i1/T1Kz0pXzJdXXXIdnjb-146-58.png

### 六、代码 ###

行内代码可以使用反引号 `` ` `` 来标记代码区段，区段内的 `&`、`<` 和 `>` 都会被自动的转换成 HTML 实体：

行内代码 Markdown 语法:

    这里插入行内代码 `<div></div>`。

**输出效果：**

这里插入行内代码 `<div></div>`。

代码区块只要每行都缩进 4 个空格就可以了，而 `&`、`<` 和 `>` 也一样会自动转成 HTML 实体。

    区块代码 Markdown 语法:

        function Err(message, name) {
            return (function () {
                this.name = name || jsGen.lib.msg.err;
                this.message = message;
                return this;
            }).call(Object.create(Error.prototype));
        };

**输出效果：**

    function Err(message, name) {
        return (function () {
            this.name = name || jsGen.lib.msg.err;
            this.message = message;
            return this;
        }).call(Object.create(Error.prototype));
    };
