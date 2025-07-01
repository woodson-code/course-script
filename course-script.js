// ==UserScript==
// @name         绕过课程多标签页限制
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  防止在打开多个标签页时课程页面关闭或重定向。
// @author       [您的名字]
// @match        *://wangda.chinamobile.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    console.debug = () => {}
    console.dir = () => {}
    console.info = () => {}
    console.table = () => {}
    console.clear = () => {}
    console.log = () => {}

    // 存储原始的 loadjs.d 方法
    const originalLoadjsD = window.loadjs.d;

    // 覆盖 loadjs.d 方法，以便在模块被定义时进行拦截和修改
    window.loadjs.d = function(moduleName, factory, deps) {
        if (moduleName === "./app/study/course/detail/player-helper") {
            console.warn("拦截到 player-helper 模块定义，准备覆盖 multipleClientStudy。");
            return originalLoadjsD(moduleName, function(e, n, a) {
                // 执行原始的 factory 函数来获取原始模块的 exports
                factory(e, n, a);

                // 获取原始的 player-helper 内部对象 (这里假设它会暴露给外部，通常在 CommonJS 模块中 via n.exports)
                const originalPlayerHelper = n.exports;

                // 覆盖 originalPlayerHelper 中的 multipleClientStudy 方法
                if (originalPlayerHelper && originalPlayerHelper.WS && originalPlayerHelper.WS.multipleClientStudy) {
                    originalPlayerHelper.WS.multipleClientStudy = function() {
                        console.warn("player-helper.WS.multipleClientStudy 被调用，但已阻止其默认行为。");
                        // 阻止其重定向和发送消息，只打印日志
                    };
                    console.warn("成功覆盖 player-helper.WS.multipleClientStudy。");
                } else {
                    console.warn("未能在 player-helper 中找到或覆盖 WS.multipleClientStudy。");
                }
            }, deps);
        }
        // 对于其他模块，正常调用原始的 loadjs.d
        return originalLoadjsD.apply(this, arguments);
    };


    // --- 策略 1：阻止 window.close() 和 window.location.replace() ---

    // 覆盖 window.close 以不执行任何操作
    window.close = function() {
        console.warn('window.close() 被调用，但被 Tampermonkey 脚本阻止。');
    };

    // 覆盖 window.location.replace
    const originalReplace = window.location.replace;
    try {
        Object.defineProperty(window.location, 'replace', {
            value: function(url) {
                if (url.includes('home/error-page/40205') || url.includes('home/error-page/40903') || url.includes('study/errors')) {
                    console.warn('阻止了 window.location.replace() 到错误页面的操作：', url);
                    return;
                }
                console.warn('window.location.replace() 被调用：', url);
                originalReplace.call(window.location, url);
            },
            writable: true,
            configurable: true
        });
    } catch (e) {
        console.error("无法定义 window.location.replace 属性:", e);
    }

    // 捕获并阻止 window.setlocationHref 的调用
    // 根据JS代码，似乎有一个全局的 window.setlocationHref 函数
    if (window.setlocationHref) {
        const originalSetlocationHref = window.setlocationHref;
        window.setlocationHref = function(url) {
            if (url.includes('home/error-page/40205') || url.includes('home/error-page/40903') || url.includes('study/errors')) {
                console.warn('阻止了 window.setlocationHref() 到错误页面的操作：', url);
                return;
            }
            console.warn('window.setlocationHref() 被调用：', url);
            originalSetlocationHref.apply(this, arguments); // 如果确实需要允许其他跳转，则保留这行
        };
        console.warn("成功覆盖 window.setlocationHref。");
    } else {
        // 如果 setlocationHref 不存在，尝试覆盖原生的 window.location.href setter
        const originalHrefDescriptor = Object.getOwnPropertyDescriptor(Location.prototype, 'href') ||
                                       Object.getOwnPropertyDescriptor(Window.prototype, 'location');
        const originalHrefGetter = originalHrefDescriptor ? originalHrefDescriptor.get : null;
        const originalHrefSetter = originalHrefDescriptor ? originalHrefDescriptor.set : null;

        if (originalHrefGetter && originalHrefSetter) {
            try {
                Object.defineProperty(window.location, 'href', {
                    get: function() {
                        return originalHrefGetter.call(window.location);
                    },
                    set: function(url) {
                        if (url.includes('home/error-page/40205') || url.includes('home/error-page/40903') || url.includes('study/errors')) {
                            console.warn('阻止了 window.location.href 对错误页面的赋值：', url);
                            return;
                        }
                        console.warn('window.location.href 被设置为：', url);
                        originalHrefSetter.call(window.location, url);
                    },
                    configurable: true
                });
                console.warn("成功覆盖 window.location.href setter。");
            } catch (e) {
                console.error("无法定义 window.location.href 属性:", e);
            }
        } else {
            console.warn("无法获取原始的 window.location.href getter/setter，可能无法完全阻止重定向。");
        }
    }


    // --- 策略 2：禁用 BroadcastChannel 相关逻辑 ---
    if (window.BroadcastChannel) {
        window.BroadcastChannel = class {
            constructor(channelName) {
                console.warn(`BroadcastChannel 构造函数被调用： ${channelName}，但其功能已被禁用。`);
                this.name = channelName;
            }
            postMessage(message) {
                console.warn(`BroadcastChannel.postMessage called on channel ${this.name} with message:`, message, ' (阻止)');
            }
            set onmessage(handler) {
                console.warn(`BroadcastChannel.onmessage 处理程序为 ${this.name} 设置 (阻止执行原始处理程序)`);
            }
            get onmessage() {
                return null;
            }
            close() {
                console.warn(`BroadcastChannel.close 在通道 ${this.name} 上被调用 (阻止)`);
            }
        };

        if (window.hasOwnProperty('app') && window.app.hasOwnProperty('on')) {
             window.app.on("logout", function() {
                console.warn("捕获到 App 注销事件，并阻止其触发 courseProgressUpdate。");
                return false;
            });
        }
    }

    // --- 策略 3：覆盖 navigator.sendBeacon ---
    const originalSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function(url, data) {
        if (url.includes('/course-study/course-front/video-progress-new') ||
            url.includes('/course-study/course-front/doc-progress-new')) {
            console.warn('阻止了 navigator.sendBeacon 到进度更新 URL 的操作：', url, data);
            return true;
        }
        console.warn('navigator.sendBeacon 被调用：', url, data);
        return true;
    };


    // --- 策略 4：直接禁用 'beforeunload' 事件监听器 ---
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'beforeunload' && listener && listener.toString().includes('flowHandler')) {
            console.warn('阻止了包含 flowHandler 逻辑的 "beforeunload" 监听器。');
            return;
        }
        if (type === 'unload' && listener && listener.toString().includes('player')) {
             console.warn('阻止了与播放器相关的 "unload" 监听器。');
             return;
        }
        originalAddEventListener.call(this, type, listener, options);
    };

    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
        if (type === 'beforeunload' && listener && listener.toString().includes('flowHandler')) {
            console.warn('忽略了尝试移除不存在的 "beforeunload" 监听器 (flowHandler)。');
            return;
        }
        if (type === 'unload' && listener && listener.toString().includes('player')) {
            console.warn('忽略了尝试移除不存在的 "unload" 监听器 (player)。');
            return;
        }
        originalRemoveEventListener.call(this, type, listener, options);
    };

    // 直接覆盖 window.onbeforeunload
    window.onbeforeunload = function(e) {
        console.warn('window.onbeforeunload 被阻止。');
    };

    console.warn('绕过课程多标签页限制脚本已激活。');
})();