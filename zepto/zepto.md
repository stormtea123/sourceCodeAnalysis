#Zepto.js

##Zepto.js源码解析

* [默认源码](https://github.com/stormtea123/sourceCodeAnalysis/tree/master/zepto/zepto.js)
* [selector模块](https://github.com/stormtea123/sourceCodeAnalysis/tree/master/zepto/selector.js)

###Zepto.js默认可以使用的选择器方法：

    $("#test")
    $("#test").find("p")
    $(".test")
    $("p")
    $("p").eq(0)
    $("p").first()
    $("p").last()
    $(".current").siblings()
    $(".current").siblings("li")
    $(">*")
    $("li").not(".item")
    $("div").filter(".test")
    $("input[type='checkbox']").parent().is("form")
    $("#test").closest(".test")
    $("#demo").children()

###引入selector模块之后，新增的选择器方法：

    //返回可见元素
    $(".item:visible")

    //返回不可见元素
    $(".item:hidden")

    //如果当前dom对象的selected属性返回true则返回当前DOM对象
    $("option:selected")

    //如果当前dom对象的checked属性返回true则返回当前DOM对象
    $("input:checked")

    //返回当前DOM对象的父节点
    $("div.test:parent")

    //符合条件集合的第一项
    $("div:first")

    //符合条件集合的最后一向
    $("div:last")

    //符合条件集合中的指定项
    $("ul.nav li:eq(1)")

    //返回集合中包含指定文本的项
    $(".test:contains(test)")

    //返回集合中包含sel元素的项
    $("div:has(p)")
    
    //返回类名包含parent的DOM对象的第一个子节点
    $(".parent").find(">*:eq(0)")



