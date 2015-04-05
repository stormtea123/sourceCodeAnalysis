;(function($) {
    var zepto = $.zepto,
        oldQsa = zepto.qsa,
        oldMatches = zepto.matches

    function visible(elem) {
        elem = $(elem)
            //确保能获取到elem的width值和height值并且样式display不等于none
        return !!(elem.width() || elem.height()) && elem.css("display") !== "none"
    }
    //不支持复杂的选择器，例如:
    //li:has(label:contains("foo")) + li:has(label:contains("bar"))
    //ul.inner:first > li
    var filters = $.expr[':'] = {
            //返回可见元素
            //例如：”.item:visible“
            visible: function() {
                if (visible(this)) return this
            },
            //返回不可见元素
            //例如：”.item:hidden”
            hidden: function() {
                if (!visible(this)) return this
            },
            //如果当前dom对象的selected属性返回true则返回当前DOM对象
            //例如：”option:selected“
            selected: function() {
                if (this.selected) return this
            },
            //如果当前dom对象的checked属性返回true则返回当前DOM对象
            //例如：”input:checked“
            checked: function() {
                if (this.checked) return this
            },
            //返回当前DOM对象的父节点
            //例如："div.test:parent"
            parent: function() {
                return this.parentNode
            },
            //符合条件集合的第一项
            //例如：”div:first“
            first: function(idx) {
                if (idx === 0) return this
            },
            //符合条件集合的最后一向
            //例如：”div:last“
            last: function(idx, nodes) {
                if (idx === nodes.length - 1) return this
            },
            //符合条件集合中的指定项
            //例如：”ul.nav li:eq(1)“
            eq: function(idx, _, value) {
                if (idx === value) return this
            },
            //返回集合中包含指定文本的项
            //".test:contains(test)"
            contains: function(idx, _, text) {
                if ($(this).text().indexOf(text) > -1) return this
            },
            //返回集合中包含sel元素的项
            //例如：“div:has(p)”
            has: function(idx, _, sel) {
                if (zepto.qsa(this, sel).length) return this
            }
        }
        //匹配例如：“:eq(index)“、“:has(selector)”、”ul.nav li:eq(1)“、”div:first“、"> *:eq(0)"
    var filterRe = new RegExp('(.*):(\\w+)(?:\\(([^)]+)\\))?$\\s*'),
        //匹配例如：“ >”
        childRe = /^\s*>/,
        classTag = 'Zepto' + (+new Date())

    function process(sel, fn) {
            //引用哈希 in `a[href^=#]` 表达式
            sel = sel.replace(/=#\]/g, '="#"]')
            var filter, arg, match = filterRe.exec(sel)
            if (match && match[2] in filters) {
                filter = filters[match[2]], arg = match[3]
                sel = match[1]
                if (arg) {
                    //确保arg是数字或尝试矫正字符串为数字
                    var num = Number(arg)
                    if (isNaN(num)) arg = arg.replace(/^["']|["']$/g, '')
                    else arg = num
                }
            }
            return fn(sel, filter, arg)
        }
        //改写zepto对象的qsa方法
        //先处理selector，例如当selecotr是”ul.nav li:eq(1)“时，通过process函数执行回调function("ul.nav", filters[eq], 1){...},回调函数会获取到一个nodeList集合（所有祖先节点为ul.nav的li节点），循环此nodeList集合调用filters对象的eq方法，找到nodeList集合中的第1项
    zepto.qsa = function(node, selector) {

        return process(selector, function(sel, filter, arg) {
            try {
                var taggedParent
                if (!sel && filter) sel = '*'
                else if (childRe.test(sel))
                //例如：$(".parent").find(">*:eq(0)")，selector是：">*:eq(0)"
                //此时对父节点(node)增加一个唯一的类，拼接一个sel(.Zepto1428253034595 >*)这样的类传入选择器方法oldQsa
                    taggedParent = $(node).addClass(classTag), sel = '.' + classTag + ' ' + sel
                var nodes = oldQsa(node, sel)
            } catch (e) {
                console.error('error performing selector: %o', selector)
                throw e
            } finally {
                //if (taggedParent) taggedParent.removeClass(classTag)
            }
            return !filter ? nodes :
                zepto.uniq($.map(nodes, function(n, i) {
                    return filter.call(n, i, nodes, arg)
                }))
        })
    }
    //重写matches方法，比如filter方法需要用到此方法
    //例如：$("div").filter(".item:hidden")
    zepto.matches = function(node, selector) {
        return process(selector, function(sel, filter, arg) {
            return (!sel || oldMatches(node, sel)) &&
                (!filter || filter.call(node, null, arg) === node)
        })
    }
})(Zepto)