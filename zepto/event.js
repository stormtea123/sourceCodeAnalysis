//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;
(function($) {
    var _zid = 1,
        undefined,
        slice = Array.prototype.slice,
        isFunction = $.isFunction,
        isString = function(obj) {
            return typeof obj == 'string'
        },
        handlers = {},
        specialEvents = {},
        //据本人测试IE9/IE10的window对象支持onfocusin
        focusinSupported = 'onfocusin' in window,
        focus = {
            focus: 'focusin',
            blur: 'focusout'
        },
        hover = {
            mouseenter: 'mouseover',
            mouseleave: 'mouseout'
        }

    specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

    function zid(element) {
        return element._zid || (element._zid = _zid++)
    }

    function findHandlers(element, event, fn, selector) {
        event = parse(event)
        if (event.ns) var matcher = matcherFor(event.ns)
        return (handlers[zid(element)] || []).filter(function(handler) {
            return handler && (!event.e || handler.e == event.e) && (!event.ns || matcher.test(handler.ns)) && (!fn || zid(handler.fn) === zid(fn)) && (!selector || handler.sel == selector)
        })
    }
    //将事件类型转换成一个对象
    function parse(event) {
        //转换成字符串再分割
        var parts = ('' + event).split('.')
        return {
            //事件名
            e: parts[0],
            //命名空间
            ns: parts.slice(1).sort().join(' ')
        }
    }

    function matcherFor(ns) {
        return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
    }
    //指定调用事件处理程序是在捕获阶段还是冒泡阶段，true表示在捕获阶段处理事件程序
    function eventCapture(handler, captureSetting) {
        return handler.del &&
            //focus、blur不会冒泡所以要把转成成focusin、focusout
            (!focusinSupported && (handler.e in focus)) ||
            !!captureSetting
    }
    //尝试把用户绑定的事件(focus、blur、mouseenter、mouseleave)转换成javscript支持的事件
    function realEvent(type) {
        return hover[type] || (focusinSupported && focus[type]) || type
    }

    function add(element, events, fn, data, selector, delegator, capture) {
        var id = zid(element),
            set = (handlers[id] || (handlers[id] = []))
        //基于空格将events分割成一个数组，并循环
        events.split(/\s/).forEach(function(event) {
            //如果event是ready等待文档加载完执行回调
            //$(element).on("ready",function(){})
            if (event == 'ready') return $(document).ready(fn)
            var handler = parse(event)
            handler.fn = fn
            handler.sel = selector
                // emulate mouseenter, mouseleave
            if (handler.e in hover) fn = function(e) {
                //失去光标的元素
                var related = e.relatedTarget
                if (!related || (related !== this && !$.contains(this, related)))
                    return handler.fn.apply(this, arguments)
            }
            handler.del = delegator
            var callback = delegator || fn
            //从这里开始研究
            handler.proxy = function(e) {
                e = compatible(e)
                if (e.isImmediatePropagationStopped()) return
                e.data = data
                var result = callback.apply(element, e._args == undefined ? [e] : [e].concat(e._args))
                if (result === false) e.preventDefault(), e.stopPropagation()
                return result
            }
            handler.i = set.length
            set.push(handler)
            //绑定事件
            //eventCapture(handler, capture)用来指定调用事件处理程序是在捕获阶段还是冒泡阶段，true表示在捕获阶段处理事件程序
            if ('addEventListener' in element)
                element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
        })
    }

    function remove(element, events, fn, selector, capture) {
        var id = zid(element);
        (events || '').split(/\s/).forEach(function(event) {
            findHandlers(element, event, fn, selector).forEach(function(handler) {
                delete handlers[id][handler.i]
                if ('removeEventListener' in element)
                    element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
            })
        })
    }

    $.event = {
        add: add,
        remove: remove
    }
    //接受一个函数，然后返回一个新函数，并且这个新函数始终保持了特定的上下文语境
    $.proxy = function(fn, context) {
        //arguments有大于3个参数，args等于排除前2个参数的结果
        var args = (2 in arguments) && slice.call(arguments, 2);
        if (isFunction(fn)) {
            var proxyFn = function() {
                return fn.apply(context, args ? args.concat(slice.call(arguments)) : arguments)
            }
            proxyFn._zid = zid(fn)
            return proxyFn
        //context是字符串，此时context是fn的方法
        } else if (isString(context)) {
            if (args) {
                //unshift和concat目的类似
                args.unshift(fn[context], fn)
                return $.proxy.apply(null, args)
            } else {
                return $.proxy(fn[context], fn)
            }
        } else {
            throw new TypeError("expected function")
        }
    }

    $.fn.bind = function(event, data, callback) {
        return this.on(event, data, callback)
    }
    $.fn.unbind = function(event, callback) {
        return this.off(event, callback)
    }
    $.fn.one = function(event, selector, data, callback) {
        return this.on(event, selector, data, callback, 1)
    }

    var returnTrue = function() {
            return true
        },
        returnFalse = function() {
            return false
        },
        //匹配大写字母A-Z开头或returnValue结尾或layerX结尾或layerY结尾
        ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$)/,
        eventMethods = {
            preventDefault: 'isDefaultPrevented',
            stopImmediatePropagation: 'isImmediatePropagationStopped',
            stopPropagation: 'isPropagationStopped'
        }
    //compatible → 兼容的，修正event对象
    function compatible(event, source) {
        if (source || !event.isDefaultPrevented) {
            //如果没有source则，用event来赋值source
            source || (source = event)
            //predicate → 谓词、谓语
            $.each(eventMethods, function(name, predicate) {
                var sourceMethod = source[name]
                event[name] = function() {
                    this[predicate] = returnTrue
                    return sourceMethod && sourceMethod.apply(source, arguments)
                }
                event[predicate] = returnFalse
            })

            if (source.defaultPrevented !== undefined ? source.defaultPrevented :
                'returnValue' in source ? source.returnValue === false :
                source.getPreventDefault && source.getPreventDefault())
                event.isDefaultPrevented = returnTrue
        }
        return event
    }
    //创建事件副本
    function createProxy(event) {
        var key, proxy = {
            originalEvent: event
        }
        for (key in event)
            if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

        return compatible(proxy, event)
    }

    $.fn.delegate = function(selector, event, callback) {
        return this.on(event, selector, callback)
    }
    $.fn.undelegate = function(selector, event, callback) {
        return this.off(event, selector, callback)
    }
    //事件委托
    $.fn.live = function(event, callback) {
        $(document.body).delegate(this.selector, event, callback)
        return this
    }
    //取消事件委托
    $.fn.die = function(event, callback) {
        $(document.body).undelegate(this.selector, event, callback)
        return this
    }
    //在选择元素上绑定一个或多个事件的事件处理函数
    //$("#demo").on("click","li",{},function(){},true)
    $.fn.on = function(event, selector, data, callback, one) {
        var autoRemove, delegator, $this = this
        
        //当event是对象的时候，以对象字面量的形式同时绑定多个事件
        if (event && !isString(event)) {
            $.each(event, function(type, fn) {
                $this.on(type, selector, data, fn, one)
            })
            return $this
        }
        //$("#demo").on("click",{},function(){},true)
        //$("#demo").on("click",function(){})
        if (!isString(selector) && !isFunction(callback) && callback !== false)
            callback = data, data = selector, selector = undefined
        //$("#demo").on("click", "tr", function(event){});
        //$("#demo").on("click", "tr", false);
        if (callback === undefined || data === false)
            callback = data, data = undefined
        
        if (callback === false) callback = returnFalse

        return $this.each(function(_, element) {
            //只绑定一次事件的时候
            if (one) autoRemove = function(e) {
                remove(element, e.type, callback)
                return callback.apply(this, arguments)
            }
            if (selector) delegator = function(e) {
                var evt, match = $(e.target).closest(selector, element).get(0)
                if (match && match !== element) {
                    evt = $.extend(createProxy(e), {
                        currentTarget: match,
                        liveFired: element
                    })
                    return (autoRemove || callback).apply(match, [evt].concat(slice.call(arguments, 1)))
                }
            }

            add(element, event, callback, data, selector, delegator || autoRemove)
        })
    }
    //在选择元素上移除一个或多个事件的事件处理函数
    $.fn.off = function(event, selector, callback) {
        var $this = this
        if (event && !isString(event)) {
            $.each(event, function(type, fn) {
                $this.off(type, selector, fn)
            })
            return $this
        }

        if (!isString(selector) && !isFunction(callback) && callback !== false)
            callback = selector, selector = undefined

        if (callback === false) callback = returnFalse

        return $this.each(function() {
            remove(this, event, callback, selector)
        })
    }
    //在每一个匹配的元素上触发某类事件
    $.fn.trigger = function(event, args) {
        event = (isString(event) || $.isPlainObject(event)) ? $.Event(event) : compatible(event)
        event._args = args
        return this.each(function() {
            // handle focus(), blur() by calling them directly
            if (event.type in focus && typeof this[event.type] == "function") this[event.type]()
                // items in the collection might not be DOM elements
            else if ('dispatchEvent' in this) this.dispatchEvent(event)
            else $(this).triggerHandler(event, args)
        })
    }

    // triggers event handlers on current element just as if an event occurred,
    // doesn't trigger an actual event, doesn't bubble
    //触发指定的事件类型上所有绑定的处理函数
    //但不会执行浏览器默认动作，也不会产生事件冒泡
    $.fn.triggerHandler = function(event, args) {
        var e, result
        this.each(function(i, element) {
            e = createProxy(isString(event) ? $.Event(event) : event)
            e._args = args
            e.target = element
            $.each(findHandlers(element, event.type || event), function(i, handler) {
                result = handler.proxy(e)
                if (e.isImmediatePropagationStopped()) return false
            })
        })
        return result
    }

    // shortcut methods for `.bind(event, fn)` for each event type
    ;
    ('focusin focusout focus blur load resize scroll unload click dblclick ' +
        'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' +
        'change select keydown keypress keyup error').split(' ').forEach(function(event) {
        $.fn[event] = function(callback) {
            return (0 in arguments) ?
                this.bind(event, callback) :
                this.trigger(event)
        }
    })

    $.Event = function(type, props) {
        if (!isString(type)) props = type, type = props.type
        var event = document.createEvent(specialEvents[type] || 'Events'),
            bubbles = true
        if (props)
            for (var name in props)(name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
        event.initEvent(type, bubbles, true)
        return compatible(event)
    }

})(Zepto)