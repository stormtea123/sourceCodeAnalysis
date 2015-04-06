/* 
 * Zepto.js 源码解读
 * 地址：https://github.com/stormtea123/sourceCodeAnalysis/tree/master/zepto/zepto.js
 * 支持网站：http://www.w3cmm.com/
*/

//把一个内部返回$(函数)的私有作用域赋值给Zepto，限制向全局作用域中添加过多的变量和函数
var Zepto = (function() {
    var undefined, key, $, classList, emptyArray = [],
        concat = emptyArray.concat,
        filter = emptyArray.filter,
        slice = emptyArray.slice,
        document = window.document,
        elementDisplay = {},
        classCache = {},
        cssNumber = {
            'column-count': 1,
            'columns': 1,
            'font-weight': 1,
            'line-height': 1,
            'opacity': 1,
            'z-index': 1,
            'zoom': 1
        },
        //匹配例如<b>、<!bb>
        fragmentRE = /^\s*<(\w+|!)[^>]*>/,
        singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
        tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
        rootNodeRE = /^(?:body|html)$/i,
        //匹配大写字母
        capitalRE = /([A-Z])/g,

        // special attributes that should be get/set via method calls
        methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

        adjacencyOperators = ['after', 'prepend', 'before', 'append'],
        table = document.createElement('table'),
        tableRow = document.createElement('tr'),
        containers = {
            'tr': document.createElement('tbody'),
            'tbody': table,
            'thead': table,
            'tfoot': table,
            'td': tableRow,
            'th': tableRow,
            '*': document.createElement('div')
        },
        readyRE = /complete|loaded|interactive/,
        simpleSelectorRE = /^[\w-]*$/,
        class2type = {},
        toString = class2type.toString,
        zepto = {},
        camelize, uniq,
        tempParent = document.createElement('div'),
        propMap = {
            'tabindex': 'tabIndex',
            'readonly': 'readOnly',
            'for': 'htmlFor',
            'class': 'className',
            'maxlength': 'maxLength',
            'cellspacing': 'cellSpacing',
            'cellpadding': 'cellPadding',
            'rowspan': 'rowSpan',
            'colspan': 'colSpan',
            'usemap': 'useMap',
            'frameborder': 'frameBorder',
            'contenteditable': 'contentEditable'
        },
        //被用来判断是否是数组，一般情况下使用ECMAScript5中新增的方法Array.isArray()来判断
        //当浏览器不支持Array.isArray()的时候使用object instanceof Array返回的布尔值来判断
        isArray = Array.isArray ||
        function(object) {
            return object instanceof Array
        }
    //element元素是否匹配selector
    zepto.matches = function(element, selector) {
        
        //确保element是html元素
        if (!selector || !element || element.nodeType !== 1) return false
        //尝试使用MatchesSelector
        var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
            element.oMatchesSelector || element.matchesSelector
        //if (matchesSelector) return matchesSelector.call(element, selector)
        //如果不存在element.parentNode，则创建一个div对象作为element父节点，调用zepto.qsa(parent, selector)筛选到所有父节点为parent的selector对象
        var match, parent = element.parentNode,
            temp = !parent
        if (temp)(parent = tempParent).appendChild(element)
        //按位非操作符，操作数的负值减1，~-1=0，~0=-1
        match = ~zepto.qsa(parent, selector).indexOf(element)
        temp && tempParent.removeChild(element)
        //当match值在filter回调函数中作为返回值时会被隐式转换，match为0时转换为成布尔值false，非零的数字转换为true
        return match
    }
    //获取JavaScript 对象的类型
    function type(obj) {
        return obj == null ? String(obj) :
            class2type[toString.call(obj)] || "object"
    }
    //参数是否为function函数
    function isFunction(value) {
        return type(value) == "function"
    }
    //参数是否为window对象
    function isWindow(obj) {
        return obj != null && obj == obj.window
    }
    //参数是否为document
    function isDocument(obj) {
        return obj != null && obj.nodeType == obj.DOCUMENT_NODE
    }
    //参数是否为对象
    function isObject(obj) {
        return type(obj) == "object"
    }
    //是否是“纯粹”的对象，这个对象是通过对象常量（"{}"） 或者 new Object 创建的，如果是，则返回true
    //Object.getPrototypeOf返回对象的原型
    function isPlainObject(obj) {
        return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype
    }
    //判断是否极有可能是数组，也可能是对象
    function likeArray(obj) {
        return typeof obj.length == 'number'
    }
    //过滤掉数组中的null、undefined
    function compact(array) {
        return filter.call(array, function(item) {
            return item != null
        })
    }
    //尝试创建当前数组一个副本
    function flatten(array) {
        return array.length > 0 ? $.fn.concat.apply([], array) : array
    }
    //把-后的首字母转换成大写
    camelize = function(str) {
        return str.replace(/-+(.)?/g, function(match, chr) {
            return chr ? chr.toUpperCase() : ''
        })
    }
    //修正css属性名
    function dasherize(str) {
        return str.replace(/::/g, '/')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z\d])([A-Z])/g, '$1_$2')
            .replace(/_/g, '-')
            .toLowerCase()
    }
    //数组去重，使用filter过滤出一个新数组（循环数组中的每一个元素，当在数组中出现的位置和当前序号相）
    uniq = function(array) {
        return filter.call(array, function(item, idx) {
            return array.indexOf(item) == idx
        })
    }
    //如果name已经缓存则从缓存中读取，否则重新匹配
    function classRE(name) {
        return name in classCache ?
            classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
    }
    //修正属性值，是否添加px值
    function maybeAddPx(name, value) {
        return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
    }
    //获取元素默认display属性值
    function defaultDisplay(nodeName) {
        var element, display
        if (!elementDisplay[nodeName]) {
            //创建DOM对象，插入body，获取默认属性，移除节点
            element = document.createElement(nodeName)
            document.body.appendChild(element)
            display = getComputedStyle(element, '').getPropertyValue("display")
            element.parentNode.removeChild(element)
            display == "none" && (display = "block")
            elementDisplay[nodeName] = display
        }
        return elementDisplay[nodeName]
    }
    //获取子节点
    function children(element) {
        //优先使用element.children返回指定元素的子元素集，如果元素没有children属性，遍历element.childNodes中的元素，返回一个元素是element类型的新数组
        return 'children' in element ?
            slice.call(element.children) :
            $.map(element.childNodes, function(node) {
                //排除换行、空格，如果node是element类型，返回node
                if (node.nodeType == 1) return node
            })
    }
    //定义一个普通的函数Z，将会通过new操作符来调用，从而变成构造函数
    function Z(dom, selector) {
        var i, len = dom ? dom.length : 0
        for (i = 0; i < len; i++) this[i] = dom[i]
        this.length = len
        this.selector = selector || ''
    }
    // 把传过来的html片段解析成DOM节点
    zepto.fragment = function(html, name, properties) {
        var dom, nodes, container

        //如果传入参数符合singleTagRE规则，例如<b></b>、<b>、<br />，则调用document.createElement创建DOM对象
        //RegExp.$1为第一个捕获组
        if (singleTagRE.test(html)) dom = $(document.createElement(RegExp.$1))
        //如果传入参数不符合singleTagRE规则
        if (!dom) {
            //矫正那些把有结束标签的标签当做没有结束标签写法的文档片段，例如把<b/>替换成<b></b>
            if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
            if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
            //如果没有匹配到table元素(tr,tbody,thead,tfoot,th,td)，调用document.createElement("div")，否则调用处理HTML DOM定义的表格属性和方法，例如document.createElement('tbody')或直接使用table
            if (!(name in containers)) name = '*'
            container = containers[name]
            //利用innerHTML把文档片段转化成DOM对象
            container.innerHTML = '' + html

            //将NodeList对象转化为数组，循环数组，并移除节点
            dom = $.each(slice.call(container.childNodes), function() {
                container.removeChild(this)
            })
        }
        //如果第三个参数是一个“纯粹”的对象，
        if (isPlainObject(properties)) {
            nodes = $(dom)
            //为nodes设置属性
            //例如：$("<div>",{"class":"test"})
            $.each(properties, function(key, value) {
                //如果key在 ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset']中，则调用$对象中相应的方法
                if (methodAttributes.indexOf(key) > -1) nodes[key](value)
                //调用 $.attr
                else nodes.attr(key, value)
            })
        }
        return dom
    }

    //返回一个Z的实例
    zepto.Z = function(dom, selector) {
        return new Z(dom, selector)
    }

    //判断object是否Z的实例
    zepto.isZ = function(object) {
        return object instanceof zepto.Z
    }

    // 一般情况下传入CSS选择器和可选的参考上下文context 
    zepto.init = function(selector, context) {
        var dom
        //如果没有传入参数, 返回一个Z的实例
        if (!selector) return zepto.Z()
        //如果selector是字符串
        else if (typeof selector == 'string') {
            //修剪字符串（去除两边可能的空格）
            selector = selector.trim()
                // 如果selector是一个html片段, 则根据selector创建相应的DOM节点，确保片段首字母是'<'，否则在Chrome 21 and Firefox 15会抛出错误
                // fragmentRE用来匹配html片段，例如：$("<p>test</p>")
            if (selector[0] == '<' && fragmentRE.test(selector))
                //调用解析片段方法fragment
                dom = zepto.fragment(selector, RegExp.$1, context), selector = null

                //如果有上下文，则先生成上下文的集合对象，再调用find方法从集合中找到selector
            else if (context !== undefined) return $(context).find(selector)
            //如果selector是css选择器
            else dom = zepto.qsa(document, selector)
        }
        //如果selector是函数，则等待dom加载就绪回调selecotr
        //例如：$(function(){...})
        else if (isFunction(selector)) return $(document).ready(selector)
        //如果selector是Z的实例，返回selector本身
        else if (zepto.isZ(selector)) return selector
        else {
            //如果selector是数组，则过滤掉数组中可能会有的null、undefined
            if (isArray(selector)) dom = compact(selector)
            //如果selector是对象就把它包裹到一个数组里
            else if (isObject(selector))
                dom = [selector], selector = null
            //selecotr是HTML片段但不是字符串，调用解析片段方法fragment
            else if (fragmentRE.test(selector))
                dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
                //如果有上下文，则先生成上下文的集合对象，再调用find方法从集合中找到selector
            else if (context !== undefined) return $(context).find(selector)
                //如果是selector选择器
            else dom = zepto.qsa(document, selector)
        }
        //返回zepto.Z，最终会创建一个Z的实例
        return zepto.Z(dom, selector)
    }

    // “$” 返回 zepto.init
    $ = function(selector, context) {
        return zepto.init(selector, context)
    }

    //通过源对象扩展目标对象的属性，源对象属性将覆盖目标对象属性
    //默认情况下为，复制为浅复制。如果deep为true表示深度复制
    function extend(target, source, deep) {
        for (key in source)
            //如果key为对象或数组需要递归用srouce[key]覆盖target[key]
            if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
                if (isPlainObject(source[key]) && !isPlainObject(target[key]))
                    target[key] = {}
                if (isArray(source[key]) && !isArray(target[key]))
                    target[key] = []
                extend(target[key], source[key], deep)
            } else if (source[key] !== undefined) target[key] = source[key]
    }
    //例如：$.extend(true,target,source)
    //例如：$.extend(target,source1,souce2,source3)
    $.extend = function(target) {
        var deep, args = slice.call(arguments, 1)
        //如果第一个元素是布尔值，此时根据布尔值来处理是否进行深度复制
        if (typeof target == 'boolean') {
            deep = target
            //移除args第一项并返回该项并赋值给target
            target = args.shift()
        }
        //循环arg分别调用extend
        args.forEach(function(arg) {
            extend(target, arg, deep)
        })
        return target
    }

    // `$.zepto.qsa` 是Zepto对象的 CSS 选择器实现方法
    //最终会返回一个数组或nodeList集合
    zepto.qsa = function(element, selector) {
        var found,
            maybeID = selector[0] == '#',
            maybeClass = !maybeID && selector[0] == '.',
            //nameOnly只留下类名，如果是id去掉"#"，如果是class去掉"."
            nameOnly = maybeID || maybeClass ? selector.slice(1) : selector,
            //simpleSelectorRE匹配是否正常的类名
            isSimple = simpleSelectorRE.test(nameOnly);
        //这里比较绕
        //尝试使用getElementById获取id
        //当element不是Element类型并且不是Document类型并且不是DocumentFragment类型时返回空数组
        //DocumentFragment 没有 getElementsByClassName/TagName，所以当selector是正常的类名且不是id的时候要检测是否支持getElementsByClassName/TagName，如果前面的条件都符合则selector极有可能是class，此时如果是class则调用getElementsByClassName，如果不是class则调用getElementsByTagName。当尝试element.getElementsByClassName失败时，调用querySelectorAll
        //slice.call最终会将对象转化为数组
        return (element.getElementById && isSimple && maybeID) ? // Safari DocumentFragment 没有 getElementById
            ((found = element.getElementById(nameOnly)) ? [found] : []) :
            (element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
            slice.call(
                isSimple && !maybeID && element.getElementsByClassName ? //DocumentFragment 没有 getElementsByClassName/TagName
                maybeClass ? element.getElementsByClassName(nameOnly) : //selector可能是class的时候
                element.getElementsByTagName(selector) : // 是标签的时候
                element.querySelectorAll(selector)
            )
    }
    //如果有selector则过滤到selector
    function filtered(nodes, selector) {
        return selector == null ? $(nodes) : $(nodes).filter(selector)
    }
    //检查父节点(parent)是否包含给定的dom节点(node)
    $.contains = document.documentElement.contains ?
        function(parent, node) {
            //排除parent和node一样的情况
            return parent !== node && parent.contains(node)
        } :
        function(parent, node) {
            //dom节点(node)的父节点时候和parent节点相等，如果相等返回true，否则返回false
            while (node && (node = node.parentNode))
                if (node === parent) return true
            return false
        }

    function funcArg(context, arg, idx, payload) {
        return isFunction(arg) ? arg.call(context, idx, payload) : arg
    }
    //设置或移除DOM属性
    function setAttribute(node, name, value) {
        value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
    }

    //设置或读取class, 使用className属性同时考虑SVGAnimatedString
    function className(node, value) {
        var klass = node.className || '',
            svg = klass && klass.baseVal !== undefined
        //读取
        if (value === undefined) return svg ? klass.baseVal : klass
        //设置
        svg ? (klass.baseVal = value) : (node.className = value)
    }

    //尝试转换一些类型的值
    // "true"  => true
    // "false" => false
    // "null"  => null
    // "42"    => 42
    // "42.5"  => 42.5
    // "08"    => "08"
    // JSON    => 尝试用$.parseJSON解析
    // String  => self
    function deserializeValue(value) {
        try {
            return value ?
                value == "true" ||
                (value == "false" ? false :
                    value == "null" ? null :
                    +value + "" == value ? +value :
                    /^[\[\{]/.test(value) ? $.parseJSON(value) :
                    value) : value
        } catch (e) {
            return value
        }
    }

    $.type = type
    $.isFunction = isFunction
    $.isWindow = isWindow
    $.isArray = isArray
    $.isPlainObject = isPlainObject
    //是否空对象
    $.isEmptyObject = function(obj) {
        var name
        for (name in obj) return false
        return true
    }
    //elem是否在array中
    $.inArray = function(elem, array, i) {
        return emptyArray.indexOf.call(array, elem, i)
    }

    $.camelCase = camelize
    //修剪空格
    $.trim = function(str) {
        return str == null ? "" : String.prototype.trim.call(str)
    }

    // plugin compatibility
    $.uuid = 0
    $.support = {}
    $.expr = {}
    $.noop = function() {}
    //遍历集合中所有元素，并收集遍历函数的返回值。若返回值为null或Returns，则不包含在返回的集合中。
    /*$.map( [ 0, 1, 2 ], function( n ) {
        return n + 4;
    });*/
    $.map = function(elements, callback) {
        var value, values = [],
            i, key
        if (likeArray(elements))
            //elements是数组的时候
            for (i = 0; i < elements.length; i++) {
                value = callback(elements[i], i)
                if (value != null) values.push(value)
            } else
            //elements是对象的时候
            for (key in elements) {
                value = callback(elements[key], key)
                if (value != null) values.push(value)
            }
        return flatten(values)
    }
    //遍历数组中每个元素或键值对象，当遍历函数返回false时，遍历停止
    $.each = function(elements, callback) {
        var i, key
        if (likeArray(elements)) {
            for (i = 0; i < elements.length; i++)
                if (callback.call(elements[i], i, elements[i]) === false) return elements
        } else {
            for (key in elements)
                if (callback.call(elements[key], key, elements[key]) === false) return elements
        }

        return elements
    }
    //获取一个新的数组，只包含回调函数返回ture的对象
    $.grep = function(elements, callback) {
        return filter.call(elements, callback)
    }
    //将 JavaScript 对象表示法 (JSON) 字符串转换为对象
    if (window.JSON) $.parseJSON = JSON.parse

    // Populate the class2type map
    //填充类型对
    $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
        class2type["[object " + name + "]"] = name.toLowerCase()
    })

    //用对象字面量的形式重写Zepto集合的原型方法
    $.fn = {
        //指定constructor属性指向zepto.Z，否则会指向Object构造函数
        constructor: zepto.Z,
        //指定length是让Zepto集合变成伪数组的一个必要条件
        length: 0,
        forEach: emptyArray.forEach,
        reduce: emptyArray.reduce,
        push: emptyArray.push,
        sort: emptyArray.sort,
        splice: emptyArray.splice,
        indexOf: emptyArray.indexOf,
        //添加元素到一个Zepto集合形成一个新数组。如果参数是一个数组，那么这个数组中的元素将会合并到Zepto集合中。
        concat: function() {
            var i, value, args = []
            //根据arguments生成一个新数组arg
            for (i = 0; i < arguments.length; i++) {
                value = arguments[i]
                args[i] = zepto.isZ(value) ? value.toArray() : value
            }
            //如果this是zepto.Z实例，则先转化成数组再调用concat方法拼接args
            //Array.prototype.concat.apply或[].concat.apply可以将一个包含多个数组元素的数组转换为一个一阶数组
            return concat.apply(zepto.isZ(this) ? this.toArray() : this, args)
        },

        //调用$.map(element,callback)后返回Zepto集合，和$(element).map(callback)回调参数顺序不同
        map: function(fn) {
            return $($.map(this, function(el, i) {
                return fn.call(el, i, el)
            }))
        },
        //从Zepto集合中提取指定的项，返回新Zepto集合
        //例如：$("span").slice(1,2)
        slice: function() {
            return $(slice.apply(this, arguments))
        },
        //当dom元素加载完毕出发callback
        //例如：$(document).reday(function(){})
        ready: function(callback) {
            // need to check if document.body exists for IE as that browser reports
            // document ready when it hasn't yet created the body element
            if (readyRE.test(document.readyState) && document.body) callback($)
            else document.addEventListener('DOMContentLoaded', function() {
                callback($)
            }, false)
            return this
        },
        //没有参数传进来的时候把Zeopto集合转化成数组，否则用方括号法访问指定序号的DOM对象
        get: function(idx) {
            return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
        },
        //返回get方法传参数
        toArray: function() {
            return this.get()
        },
        //Zepto集合的length属性值
        size: function() {
            return this.length
        },
        //移除节点
        remove: function() {
            return this.each(function() {
                if (this.parentNode != null)
                    this.parentNode.removeChild(this)
            })
        },
        //遍历执行callback
        each: function(callback) {
            emptyArray.every.call(this, function(el, idx) {
                return callback.call(el, idx, el) !== false
            })
            return this
        },
        //筛选出与指定表达式匹配的元素集合，如果参数为一个函数，函数返回有实际值得时候，元素才会被返回
        //在函数中，this 关键字指向当前的元素。
        //例如：$("div").filter(".test")
        filter: function(selector) {
            if (isFunction(selector)) return this.not(this.not(selector))
                //调用filter创建一个zepto.matches(element, selector)都返回true的新数组
            return $(filter.call(this, function(element) {
                return zepto.matches(element, selector)
            }))
        },
        //选择所有的selector元素(context是可选参数)，合并到调用add方法的Zepto结合，去除重复的项，返回一个新的Zepto集合对象
        add: function(selector, context) {
            return $(uniq(this.concat($(selector, context))))
        },
        //判断当前Zepto元素集合中的第一个元素是否被包含在选择器选择selector的结果集合中
        //示例：$( "input[type='checkbox']" ).parent().is( "form" )
        is: function(selector) {
            return this.length > 0 && zepto.matches(this[0], selector)
        },
        //过滤当前Zepto集合，获取一个新的Zepto集合
        //示例：$("li").not(".item")
        not: function(selector) {
            var nodes = []
            //selector是回调的时候，回调返回false时把Zepto集合当前项推入nodes中
            if (isFunction(selector) && selector.call !== undefined)
                this.each(function(idx) {
                    if (!selector.call(this, idx)) nodes.push(this)
                })
            else {
                //如果selector极有可能是数组又可以访问selector.item属性，则selector是一个伪数组(DOM对象集合)，用slice.call将其转化为数组
                var excludes = typeof selector == 'string' ? this.filter(selector) :
                    (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
                //排除掉selector集合
                this.forEach(function(el) {
                    if (excludes.indexOf(el) < 0) nodes.push(el)
                })
            }
            return $(nodes)
        },
        //当前Zepto集合是否包含符合选择器的元素
        //例如：$( "li" ).has( "ul" )
        //用filter获取回调返回true的当前Zepto集合中的项，当selector是对象的时候调用$.contains，否则调用find方法获取到包含selector的Zepto集合的length属性
        has: function(selector) {
            return this.filter(function() {
                return isObject(selector) ?
                    $.contains(this, selector) :
                    $(this).find(selector).size()
            })
        },
        //从当前Zepto集合中获取指定索引号的项
        //第一项$('li').eq(0)，最后一项$('li').eq(-1)
        eq: function(idx) {
            return idx === -1 ? this.slice(idx) : this.slice(idx, +idx + 1)
        },
        //从当前Zepto集合中获取第一项
        first: function() {
            var el = this[0]
            return el && !isObject(el) ? el : $(el)
        },
        //从当前Zepto集合中获取最后项
        last: function() {
            var el = this[this.length - 1]
            return el && !isObject(el) ? el : $(el)
        },
        //搜索所有与指定表达式匹配的元素
        find: function(selector) {
            //此时this指向当前Zepto元素集合，是一个数组形式的对象，又称伪数组
            var result, $this = this
            if (!selector) result = $()
            //如果selector是对象，此情况常在外部调用
            //例如：$("#demo").find(document.getElementById("span"))
            //例如：$("#demo").find($("span"))
            else if (typeof selector == 'object')
                //返回一个符合结果的新集合
                result = $(selector).filter(function() {
                    var node = this
                    //循环$this，判断node是否在$this的每一项中
                    return emptyArray.some.call($this, function(parent) {
                        return $.contains(parent, node)
                    })
                })
            //当前Zepto元素集合获取到的元素只有一个时候
            else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
            //当前Zepto元素集合获取到的元素是多个的时候，调用$.map返回一个由原数组中的每个元素调用一个指定方法后的返回值组成的新数组
            else result = this.map(function() {
                return zepto.qsa(this, selector)
            })
            return result
        },
        //从元素本身开始，逐级向上级元素匹配，并返回最先匹配selector的祖先元素
        //$("#test").closest("div")
        closest: function(selector, context) {
            var node = this[0],
                collection = false
            //如果selector是DOM对象
            if (typeof selector == 'object') collection = $(selector)
            //只要node不是collection集合对象中的项，便一直向上循环直至node是collection集合对象中的项终止
            while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
                node = node !== context && !isDocument(node) && node.parentNode
            return $(node)
        },
        //取得一个包含着所有匹配元素的祖先元素的元素集合（不包含根元素）
        //例如：$( "li.item-a" ).parents()
        parents: function(selector) {
            var ancestors = [],
                nodes = this
            //向上循环至nodes.length等于0（此时node=DOM对象html）
            while (nodes.length > 0)
                //nodes返回一个新数组，数组项为DOM对象
                nodes = $.map(nodes, function(node) {
                    if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
                        ancestors.push(node)
                        return node
                    }
                })
            //从ancestors集合中过滤出选择selector结果的DOM对象
            return filtered(ancestors, selector)
        },
        //取得一个包含着所有匹配元素的唯一父元素的元素集合
        //例如：$( "li.item-a" ).parent()
        parent: function(selector) {
            return filtered(uniq(this.pluck('parentNode')), selector)
        },
        //循环当前Zepto集合，取到每一项的子节点合并为一个数组，返回新的Zepto集合。如果配置了selecotr则过滤掉其它的
        children: function(selector) {
            return filtered(this.map(function() {
                return children(this)
            }), selector)
        },
        //循环当前Zepto集合，取到每一项的子节点合并为一个数组，返回新的Zepto集合，包括文字和注释节点。
        //例如：$(".test").contents()
        contents: function() {
            return this.map(function() {
                return this.contentDocument || slice.call(this.childNodes)
            })
        },
        //获取当前Zepto集合对象所有兄弟节点
        //先找到该节点的父节点，再找到父节点所有子节点，如果配置了selecotr则过滤掉其它的
        //例如：$(".current").siblings()
        siblings: function(selector) {
            return filtered(this.map(function(i, el) {
                return filter.call(children(el.parentNode), function(child) {
                    return child !== el
                })
            }), selector)
        },
        //清空当前Zepto集合每一项的DOM子节点
        empty: function() {
            return this.each(function() {
                this.innerHTML = ''
            })
        },
        //获取当前Zepto集合中每一项的属性值
        pluck: function(property) {
            return $.map(this, function(el) {
                return el[property]
            })
        },
        //通过HTML的style特性指定diplay属性值为none的时候转为""，""默认为显示
        //通过样式表指定diplay属性值为none的时候转化为元素默认display属性值
        show: function() {
            return this.each(function() {
                this.style.display == "none" && (this.style.display = '')
                if (getComputedStyle(this, '').getPropertyValue("display") == "none")
                    this.style.display = defaultDisplay(this.nodeName)
            })
        },
        //例如：$( "div.second" ).replaceWith( "<h2>New heading</h2>" );
        //在当前节点之前插入newContent，移除当前节点
        replaceWith: function(newContent) {
            return this.before(newContent).remove()
        },
        //在每个匹配的元素外层包上一个html结构
        //例如：$( ".inner" ).wrap( "<div class='new'></div>" );
        //structure可以是回调
        wrap: function(structure) {
            var func = isFunction(structure)
            if (this[0] && !func)
                var dom = $(structure).get(0),
                    clone = dom.parentNode || this.length > 1
            return this.each(function(index) {
                $(this).wrapAll(
                    func ? structure.call(this, index) :
                    clone ? dom.cloneNode(true) : dom
                )
            })
        },
        //在匹配元素外面包一层HTML结构
        wrapAll: function(structure) {
            if (this[0]) {
                //在当前Zepto集合第一项(DOM对象)前插入DOM对象(structure)
                $(this[0]).before(structure = $(structure))
                var children
                //遍历到DOM对象(structure)跟节点，插入当前Zepto集合第一项(DOM对象)
                while ((children = structure.children()).length) structure = children.first()
                $(structure).append(this)
            }
            return this
        },
        //将匹配的元素的子内容(包括文本节点)用一个HTML结构包裹起来
        wrapInner: function(structure) {
            var func = isFunction(structure)
            //先取到所有子节点的集合，再调用wrapAll在子节点外面包一层HTML结构
            return this.each(function(index) {
                var self = $(this),
                    contents = self.contents(),
                    dom = func ? structure.call(this, index) : structure
                contents.length ? contents.wrapAll(dom) : self.append(dom)
            })
        },
        //从DOM结构中移出匹配元素的父元素，只留下匹配元素
        unwrap: function() {
            this.parent().each(function() {
                $(this).replaceWith($(this).children())
            })
            return this
        },
        //循环Zepto集合对象分别深度克隆
        clone: function() {
            return this.map(function() {
                return this.cloneNode(true)
            })
        },
        //调用Zepto集合对象的css方法传入隐藏属性
        hide: function() {
            return this.css("display", "none")
        },
        //显示或隐藏匹配元素，setting为布尔值
        toggle: function(setting) {
            return this.each(function() {
                var el = $(this);
                (setting === undefined ? el.css("display") == "none" : setting) ? el.show(): el.hide()
            })
        },
        //获取当前Zepto集合中每一项的前一个兄弟节点，如果配置了selecotr则过滤掉其它的
        //例如：$("li.third-item").prev()
        prev: function(selector) {
            return $(this.pluck('previousElementSibling')).filter(selector || '*')
        },
        //获取当前Zepto集合中每一项的后一个兄弟节点，如果配置了selecotr则过滤掉其它的
        //例如：$("li.third-item").next()
        next: function(selector) {
            return $(this.pluck('nextElementSibling')).filter(selector || '*')
        },
        //设置或获取当前Zepto集合中每一项的HTMl表现
        html: function(html) {
            //0 in arguments用来判断是否有一个以上的参数？如果不是再判断当前Zepto集合集合是否有一个以上的项？如果是则获取当前Zepto集合中第一项所有子节点的HTMl表现
            return 0 in arguments ?
                this.each(function(idx) {
                    var originHtml = this.innerHTML
                    //通过funcArg判断html是否会函数，如果是则html是回调，执行html并改变其this指向，传入参数
                    $(this).empty().append(funcArg(this, html, idx, originHtml))
                }) :
                (0 in this ? this[0].innerHTML : null)
        },
        //设置或获取当前Zepto集合中每一项的文本
        text: function(text) {
            return 0 in arguments ?
                this.each(function(idx) {
                    //此处通过funcArg判断text是否会函数，如果是则text是回调，执行text并改变其this指向，传入参数
                    var newText = funcArg(this, text, idx, this.textContent)
                    this.textContent = newText == null ? '' : '' + newText
                }) :
                (0 in this ? this[0].textContent : null)
        },
        //读取或设置dom的属性
        //如果没有给定value参数，则读取Zepto集合一个元素的属性值
        //name可以是对象，可以同时给多个DOM对象设置多个属性
        //value可以是回调
        //例如：$("input").attr("title")
        attr: function(name, value) {
            var result
            return (typeof name == 'string' && !(1 in arguments)) ?
                (!this.length || this[0].nodeType !== 1 ? undefined :
                    (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
                ) :
                this.each(function(idx) {
                    if (this.nodeType !== 1) return
                    if (isObject(name))
                        for (key in name) setAttribute(this, key, name[key])
                    else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
                })
        },
        //移除DOM的属性
        //例如：$("input").removeAttr("title")
        removeAttr: function(name) {
            return this.each(function() {
                this.nodeType === 1 && name.split(' ').forEach(function(attribute) {
                    //setAttribute只有2个参数，此时会移除DOM
                    setAttribute(this, attribute)
                }, this)
            })
        },
        //读取或设置dom元素的属性值，用来处理boolean attributes/properties以及在html(比如：window.location)中不存在的properties。其他所有的attributes(在html中你看到的那些)可以而且应该继续使用.attr()方法来进行操作
        //例如：$(elem).prop("checked")，会返回布尔值
        prop: function(name, value) {
            //矫正属性名
            name = propMap[name] || name
            return (1 in arguments) ?
                this.each(function(idx) {
                    this[name] = funcArg(this, value, idx, this[name])
                }) :
                (this[0] && this[0][name])
        },
        //读取或写入dom的 data-* 属性
        //例如：$("body").data("foo", 52);
        data: function(name, value) {
            //把驼峰写法转成-连接写法，并把大写转换成小写，例如：borderWidth转换成border-width
            var attrName = 'data-' + name.replace(capitalRE, '-$1').toLowerCase()
            var data = (1 in arguments) ?
                this.attr(attrName, value) :
                this.attr(attrName)
            return data !== null ? deserializeValue(data) : undefined
        },
        //获取或设置元素的值
        //value可以是回调
        //如果是<select multiple>标签，则过滤到选择状态是selected的option，并取到其value属性值
        //例如：("select.foo").val();
        val: function(value) {
            return 0 in arguments ?
                this.each(function(idx) {
                    this.value = funcArg(this, value, idx, this.value)
                }) :
                (this[0] && (this[0].multiple ?
                    $(this[0]).find('option').filter(function() {
                        return this.selected
                    }).pluck('value') :
                    this[0].value))
        },
        //获得当前元素相对于document的位置，或根据coordinates(可选)来设置元素相对于document的偏移
        //coordinates是一个包括left/top属性的对象，值为number
        //例如：$("p:last").offset().left
        offset: function(coordinates) {
            if (coordinates) return this.each(function(index) {
                var $this = $(this),
                    coords = funcArg(this, coordinates, index, $this.offset()),
                    parentOffset = $this.offsetParent().offset(),
                    props = {
                        top: coords.top - parentOffset.top,
                        left: coords.left - parentOffset.left
                    }
                //如果定位属性为static则设置为relative
                if ($this.css('position') == 'static') props['position'] = 'relative'
                $this.css(props)
            })
            if (!this.length) return null
            //getBoundingClientRect元素在页面中相对于视口的位置
            var obj = this[0].getBoundingClientRect()
            return {
                left: obj.left + window.pageXOffset,
                top: obj.top + window.pageYOffset,
                width: Math.round(obj.width),
                height: Math.round(obj.height)
            }
        },
        //读取或设置dom元素的css属性
        //例如：$(elem).css("background-color")
        css: function(property, value) {
            //获取属性
            if (arguments.length < 2) {
                var computedStyle, element = this[0]
                if (!element) return
                computedStyle = getComputedStyle(element, '')
                if (typeof property == 'string')
                    return element.style[camelize(property)] || computedStyle.getPropertyValue(property)
                //获取多个属性["width","height"]
                else if (isArray(property)) {
                    var props = {}
                    //循环数组并获取属性值
                    $.each(property, function(_, prop) {
                        //先尝试获取style=""设置的属性，否则调用getComputedStyle方法
                        props[prop] = (element.style[camelize(prop)] || computedStyle.getPropertyValue(prop))
                    })
                    return props
                }
            }
            //设置属性
            var css = ''
            if (type(property) == 'string') {
                if (!value && value !== 0)
                    this.each(function() {
                        this.style.removeProperty(dasherize(property))
                    })
                else
                    css = dasherize(property) + ":" + maybeAddPx(property, value)
            //以对象形式添加属性
            } else {
                for (key in property)
                    if (!property[key] && property[key] !== 0)
                        this.each(function() {
                            this.style.removeProperty(dasherize(key))
                        })
                    else
                        css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
            }
            return this.each(function() {
                this.style.cssText += ';' + css
            })
        },
        //获得element在当前Zepto集合中的位置或当前Zeopto集合第一项在同辈元素中的位置
        index: function(element) {
            return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
        },
        //判断有没有class
        hasClass: function(name) {
            if (!name) return false
            return emptyArray.some.call(this, function(el) {
                return this.test(className(el))
            }, classRE(name))
        },
        //增加calss
        addClass: function(name) {
            if (!name) return this
            return this.each(function(idx) {
                if (!('className' in this)) return
                classList = []
                var cls = className(this),
                    newName = funcArg(this, name, idx, cls)
                newName.split(/\s+/g).forEach(function(klass) {
                    if (!$(this).hasClass(klass)) classList.push(klass)
                }, this)
                //如果有旧class则中间拼接空格负责拼接空，再拼接classList数组以空格分割的字符串
                classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
            })
        },
        //移除class
        removeClass: function(name) {
            return this.each(function(idx) {
                if (!('className' in this)) return
                if (name === undefined) return className(this, '')
                //取到className
                classList = className(this)
                //如果要移除name则用正则替换为空
                funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass) {
                    classList = classList.replace(classRE(klass), " ")
                })
                //设置新class(用空格替换掉name并且删除空格)
                className(this, classList.trim())
            })
        },
        //切换class，when为可选布尔值
        toggleClass: function(name, when) {
            if (!name) return this
            return this.each(function(idx) {
                var $this = $(this),
                    names = funcArg(this, name, idx, className(this))
                //$(".test").toggleClass("bounce spin")，name有空格的时候则为多个class需要循环
                names.split(/\s+/g).forEach(function(klass) {
                    (when === undefined ? !$this.hasClass(klass) : when) ?
                    $this.addClass(klass): $this.removeClass(klass)
                })
            })
        },
        //被隐藏在内容区域上方的像素数。通过这个属性可以改变元素的滚动位置
        scrollTop: function(value) {
            if (!this.length) return
            var hasScrollTop = 'scrollTop' in this[0]
            //取值，如果取不到DOM对象的scrollLeft属性值则取pageYOffset
            if (value === undefined) return hasScrollTop ? this[0].scrollTop : this[0].pageYOffset
            //设置值
            return this.each(hasScrollTop ?
                function() {
                    this.scrollTop = value
                } :
                function() {
                    this.scrollTo(this.scrollX, value)
                })
        },
        //被隐藏在内容区域左侧的像素数。通过这个属性可以改变元素的滚动位置
        scrollLeft: function(value) {
            if (!this.length) return
            var hasScrollLeft = 'scrollLeft' in this[0]
            //取值，如果取不到DOM对象的scrollLeft属性值则取pageXOffset
            if (value === undefined) return hasScrollLeft ? this[0].scrollLeft : this[0].pageXOffset
            ////设置值
            return this.each(hasScrollLeft ?
                function() {
                    this.scrollLeft = value
                } :
                function() {
                    this.scrollTo(value, this.scrollY)
                })
        },
        //获取当前集合中的第一项相对父元素的偏移
        position: function() {
            if (!this.length) return

            var elem = this[0],
                //获取最近的祖先定位元素
                offsetParent = this.offsetParent(),
                //获得当前元素相对于document的位置
                offset = this.offset(),
                //offsetParent集合第一项的节点名称是body或html则返回一个对象，否则返回offsetParent相对于document的位置
                parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? {
                    top: 0,
                    left: 0
                } : offsetParent.offset()

            //当前元素相对于document的位置减去margin外边距
            offset.top -= parseFloat($(elem).css('margin-top')) || 0
            offset.left -= parseFloat($(elem).css('margin-left')) || 0

            //最近的祖先定位元素减去border宽度
            parentOffset.top += parseFloat($(offsetParent[0]).css('border-top-width')) || 0
            parentOffset.left += parseFloat($(offsetParent[0]).css('border-left-width')) || 0

            //返回坐标差
            return {
                top: offset.top - parentOffset.top,
                left: offset.left - parentOffset.left
            }
        },
        //获取最近的祖先定位元素(absolute/relative/fixed)
        offsetParent: function() {
            return this.map(function() {
                var parent = this.offsetParent || document.body
                //rootNodeRE匹配body或html
                while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
                    parent = parent.offsetParent
                return parent
            })
        }
    }

    //移除节点
    $.fn.detach = $.fn.remove;
    // `width` and `height`
    ['width', 'height'].forEach(function(dimension) {
        //首字母转化成大写
        var dimensionProperty =
            dimension.replace(/./, function(m) {
                return m[0].toUpperCase()
            })
        $.fn[dimension] = function(value) {
            var offset, el = this[0]
            //获取值，如果是window获取innerWidth/innerHeight，如果是document获取scrollWidth/scrollHeight，否则获取调用offset方法
            if (value === undefined) return isWindow(el) ? el['inner' + dimensionProperty] :
                isDocument(el) ? el.documentElement['scroll' + dimensionProperty] :
                (offset = this.offset()) && offset[dimension]
            //设置值，调用css方法
            else return this.each(function(idx) {
                el = $(this)
                el.css(dimension, funcArg(this, value, idx, el[dimension]()))
            })
        }
    })

    function traverseNode(node, fun) {
        fun(node)
        for (var i = 0, len = node.childNodes.length; i < len; i++)
            traverseNode(node.childNodes[i], fun)
    }

    // Generate the `after`, `prepend`, `before`, `append`,
    // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` 方法.
    //例如：$( ".inner" ).before( "<p>Test</p>" );
    adjacencyOperators.forEach(function(operator, operatorIndex) {
        var inside = operatorIndex % 2 //=> prepend, append

        $.fn[operator] = function() {
            //如果参数是字符串则转换成DOM节点
            var argType, nodes = $.map(arguments, function(arg) {
                    argType = type(arg)
                    return argType == "object" || argType == "array" || arg == null ?
                        arg : zepto.fragment(arg)
                }),
                parent, copyByClone = this.length > 1
            //没有参数返回当前Zepto集合
            if (nodes.length < 1) return this

            return this.each(function(_, target) {
                //`prepend`与`append`转换成父节点
                parent = inside ? target : target.parentNode

                // `after`转换成target.nextSibling，`prepend`转换成target.firstChild，最后传入insertBefore
                target = operatorIndex == 0 ? target.nextSibling :
                    operatorIndex == 1 ? target.firstChild :
                    operatorIndex == 2 ? target :
                    null
                //父节点(document.documentElement)是否包含给定的dom节点(parent)
                var parentInDocument = $.contains(document.documentElement, parent)

                nodes.forEach(function(node) {
                    if (copyByClone) node = node.cloneNode(true)
                    else if (!parent) return $(node).remove()
                    //插入节点
                    //当operator是append时，target为null，insertBefore默认会插入到parent子节点的末尾
                    //如果node已经在DOM树中，node首先会从DOM树中移除
                    parent.insertBefore(node, target)
                    //执行插入的javascript
                    if (parentInDocument) traverseNode(node, function(el) {
                        if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
                            (!el.type || el.type === 'text/javascript') && !el.src)
                            window['eval'].call(window, el.innerHTML)
                    })
                })
            })
        }

        // after    => insertAfter
        // prepend  => prependTo
        // before   => insertBefore
        // append   => appendTo
        // 用法示例 $('<p>See the following table:</p>').insertBefore('table')
        $.fn[inside ? operator + 'To' : 'insert' + (operatorIndex ? 'Before' : 'After')] = function(html) {
            $(html)[operator](this)
            return this
        }
    })

    zepto.Z.prototype = Z.prototype = $.fn

    // 输出内部 API 函数在 `$.zepto` 命名空间下，例如$.zepto.uniq(数组去重)、$.zepto.deserializeValue(尝试转换一些类型的值)
    zepto.uniq = uniq
    zepto.deserializeValue = deserializeValue
        $.zepto = zepto
    return $
})()
//如果"$"还没有被占用，则指向Zepto
window.Zepto = Zepto
window.$ === undefined && (window.$ = Zepto)