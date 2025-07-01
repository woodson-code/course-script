// ==UserScript==
// @name         绕过课程多标签页和自动暂停限制 (自动1.5倍速)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  阻止多标签页检测重定向，禁用鼠标静止和试看时长导致的自动暂停，并自动设置为1.5倍速播放。
// @author       [您的名字]
// @match        *://wangda.chinamobile.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.debug = () => {}
    console.log = () => {}
    console.dir = () => {}
    console.info = () => {}
    console.table = () => {}
    console.clear = () => {}

    // 存储原始的 loadjs.d 方法
    const originalLoadjsD = window.loadjs.d;

    // 覆盖 loadjs.d 方法，以便在模块被定义时进行拦截和修改
    window.loadjs.d = function(moduleName, factory, deps) {
        // 拦截 player-helper 模块
        if (moduleName === "./app/study/course/detail/player-helper") {
            console.warn("拦截到 player-helper 模块定义，准备覆盖 multipleClientStudy。");
            return originalLoadjsD(moduleName, function(e, n, a) {
                factory(e, n, a);
                const originalPlayerHelper = n.exports;
                if (originalPlayerHelper && originalPlayerHelper.WS && originalPlayerHelper.WS.multipleClientStudy) {
                    originalPlayerHelper.WS.multipleClientStudy = function() {
                        console.warn("player-helper.WS.multipleClientStudy 被调用，但已阻止其默认行为。");
                    };
                    console.warn("成功覆盖 player-helper.WS.multipleClientStudy。");
                } else {
                    console.warn("未能在 player-helper 中找到或覆盖 WS.multipleClientStudy。");
                }
            }, deps);
        }
        // 拦截 video/view-video 模块
        else if (moduleName === "./app/study/course/detail/player/video/view-video") {
            console.warn("拦截到 video/view-video 模块定义，准备禁用自动暂停逻辑和设置倍速。");
            return originalLoadjsD(moduleName, function(e, n, a) {
                factory(e, n, a);
                const originalViewVideo = n.exports;

                if (originalViewVideo && originalViewVideo.mixin) {
                    // 覆盖 checkMouseStayTime 方法使其不执行任何操作
                    originalViewVideo.mixin.checkMouseStayTime = function() {
                        console.warn("阻止了 checkMouseStayTime 鼠标静止检测。");
                        this.module.dispatch("clearMouseStatyTime");
                        this.module.dispatch("stopRecordLearnTime");
                    };

                    // 覆盖 video 对象中的 timeupdate 和 canplay 逻辑
                    if (originalViewVideo.video) {
                        // 移除 timeupdate 中的试看暂停逻辑
                        const originalTimeupdate = originalViewVideo.video.timeupdate;
                        originalViewVideo.video.timeupdate = function(e) {
                            const n = this.bindings.state.data;
                            const a = Math.floor(e.currentTime());
                            // 移除原有的试看暂停代码
                            this.app.askbar.trigger("study.video.playTimeChange", a, e.duration());
                        };

                        // 在 canplay 事件中设置播放速度
                        const originalCanplay = originalViewVideo.video.canplay;
                        originalViewVideo.video.canplay = function(e) {
                            console.warn("视频 ready，尝试设置为 1.5 倍速。");
                            const player = this.components.player; // 获取 Video.js 播放器实例
                            if (player && typeof player.playbackRate === 'function') {
                                player.playbackRate(1.5); // 设置为 1.5 倍速
                                console.warn("视频播放速度已设置为: 1.5x");
                            } else {
                                console.warn("Video.js 播放器实例未找到或 playbackRate 方法不可用。");
                            }
                            // 调用原始的 canplay 逻辑
                            originalCanplay.call(this, e);
                        };

                        // 移除 playing 中的 checkMouseStayTime 调用
                        const originalPlaying = originalViewVideo.video.playing;
                        originalViewVideo.video.playing = function(e) {
                            const n = this;
                            const a = !!Number(n.bindings.ruleConfigRate.data.value);
                            const t = !!Number(n.module.renderOptions.useVideoSpeed);
                            const l = localStorage.getItem("cache-doubling-speed");
                            const i = this.bindings.playStamp.data.time;
                            const s = Date.now();
                            if (a && t && l) {
                                e.playbackRate(l);
                                // m = l; // 这行代码在原脚本中，保留或移除取决于是否影响其他地方
                            }
                            this.initTimeFn(e);
                            if (s - i < 1e3) { // 这段条件判断是原脚本中就有的
                                this.module.renderOptions.recordLearnTime();
                                // 移除原有的 this.module.renderOptions.checkMouseStayTime() 调用
                                // this.module.renderOptions.checkMouseStayTime(); // 已禁用
                                this.module.dispatch("changePlayStamp", s);
                            }
                            originalPlaying.call(this, e); // 调用原始的 playing 逻辑
                        };

                    }
                    console.warn("成功覆盖 video/view-video 中的自动暂停逻辑和设置倍速。");
                } else {
                    console.warn("未能在 video/view-video 中找到或覆盖 mixin/video 对象。");
                }
            }, deps);
        }
        // 拦截 audio-new/view-video 模块
        else if (moduleName === "./app/study/course/detail/player/audio-new/view-video") {
            console.warn("拦截到 audio-new/view-video 模块定义，准备禁用自动暂停逻辑和设置倍速。");
            return originalLoadjsD(moduleName, function(e, n, a) {
                factory(e, n, a);
                const originalViewAudio = n.exports;

                if (originalViewAudio && originalViewAudio.mixin) {
                    // 覆盖 checkMouseStayTime 方法使其不执行任何操作
                    originalViewAudio.mixin.checkMouseStayTime = function() {
                        console.warn("阻止了 audio-new/view-video 中的 checkMouseStayTime 鼠标静止检测。");
                        this.module.dispatch("clearMouseStatyTime");
                        this.module.dispatch("stopRecordLearnTime");
                    };

                    // 覆盖 video (实际上是 audio) 对象中的 timeupdate 和 canplay 逻辑
                    if (originalViewAudio.video) {
                        // 移除 timeupdate 中的试看暂停逻辑
                        const originalAudioTimeupdate = originalViewAudio.video.timeupdate;
                        originalViewAudio.video.timeupdate = function(e) {
                            const n = this.bindings.state.data;
                            const a = Math.floor(e.currentTime());
                            // 移除原有的试看暂停代码
                            this.app.askbar.trigger("study.video.playTimeChange", a, e.duration());
                        };

                        // 在 canplay 事件中设置播放速度
                        const originalAudioCanplay = originalViewAudio.video.canplay;
                        originalViewAudio.video.canplay = function(e) {
                            console.warn("音频 ready，尝试设置为 1.5 倍速。");
                            const player = this.components.player; // 获取 Video.js 播放器实例
                            if (player && typeof player.playbackRate === 'function') {
                                player.playbackRate(1.5); // 设置为 1.5 倍速
                                console.warn("音频播放速度已设置为: 1.5x");
                            } else {
                                console.warn("Video.js 播放器实例未找到或 playbackRate 方法不可用。");
                            }
                            // 调用原始的 canplay 逻辑
                            originalAudioCanplay.call(this, e);
                        };

                         // 移除 playing 中的 checkMouseStayTime 调用
                        const originalAudioPlaying = originalViewAudio.video.playing;
                        originalViewAudio.video.playing = function(e) {
                            const n = this;
                            const a = !!Number(n.bindings.ruleConfigRate.data.value);
                            const t = !!Number(n.module.renderOptions.useVideoSpeed);
                            const l = localStorage.getItem("cache-doubling-speed");
                            const i = this.bindings.playStamp.data.time;
                            const s = Date.now();
                            if (a && t && l) {
                                e.playbackRate(l);
                                // m = l; // 这行代码在原脚本中，保留或移除取决于是否影响其他地方
                            }
                            this.initTimeFn(e);
                            if (s - i < 1e3) { // 这段条件判断是原脚本中就有的
                                this.module.renderOptions.recordLearnTime();
                                // 移除原有的 this.module.renderOptions.checkMouseStayTime() 调用
                                // this.module.renderOptions.checkMouseStayTime(); // 已禁用
                                this.module.dispatch("changePlayStamp", s);
                            }
                            originalAudioPlaying.call(this, e); // 调用原始的 playing 逻辑
                        };
                    }
                    console.warn("成功覆盖 audio-new/view-video 中的自动暂停逻辑和设置倍速。");
                } else {
                    console.warn("未能在 audio-new/view-video 中找到或覆盖 mixin/video 对象。");
                }
            }, deps);
        }

        // 对于其他模块，正常调用原始的 loadjs.d
        return originalLoadjsD.apply(this, arguments);
    };


    // --- 策略：阻止 window.close() 和 window.location.replace() ---

    window.close = function() {
        console.warn('window.close() 被调用，但被 Tampermonkey 脚本阻止。');
    };

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
    if (window.setlocationHref) {
        const originalSetlocationHref = window.setlocationHref;
        window.setlocationHref = function(url) {
            if (url.includes('home/error-page/40205') || url.includes('home/error-page/40903') || url.includes('study/errors')) {
                console.warn('阻止了 window.setlocationHref() 到错误页面的操作：', url);
                return;
            }
            console.warn('window.setlocationHref() 被调用：', url);
            originalSetlocationHref.apply(this, arguments);
        };
        console.warn("成功覆盖 window.setlocationHref。");
    } else {
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


    // --- 策略：禁用 BroadcastChannel 相关逻辑 ---
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

    // --- 策略：覆盖 navigator.sendBeacon ---
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


    // --- 策略：直接禁用 'beforeunload' 事件监听器 ---
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

    console.warn('绕过课程多标签页和自动暂停限制脚本已激活。');

})();