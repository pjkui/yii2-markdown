/*!
 * yii2-markdown DualEngine Controller
 *
 * 在 Cherry / Vditor 双引擎之间提供：
 *   - 工具栏中的「切换模式」按钮
 *   - 切换前确认对话框（纯 CSS）
 *   - 内存快照与「放弃转换」横幅
 *   - 双 hidden textarea ({name}_md / {name}_html) 同步
 *   - 自定义事件 yii2md:beforeSwitch / afterSwitch / revert
 *
 * 暴露：
 *   window.Yii2Markdown.DualEngine.init(opts?)        // 由 DOMContentLoaded 自动调用
 *   window.Yii2Markdown.DualEngine.switchTo(id, to)   // 编程式切换
 *   window.Yii2Markdown.DualEngine.revert(id)         // 放弃本次转换
 *
 * 依赖：
 *   - converter.js（window.Yii2Markdown.Converter.{markdownToHtml, htmlToMarkdown}）
 *   - 当 N 号实例运行 Cherry 时存在 window.cherry{N}
 *   - 当 N 号实例运行 Vditor 时存在 window.vditor_{N}
 *
 * DOM 约定（由 Editor.php / VditorEditor.php 输出）：
 *   <div class="yii2-markdown-root yii2-markdown-root--cherry"
 *        data-engine="cherry" data-is-markdown="1" data-instance-id="N">
 *     <textarea name="..." id="..."></textarea>
 *     <div id="cherry{N}"></div>
 *   </div>
 *
 *   <div class="yii2-markdown-root yii2-markdown-root--vditor"
 *        data-engine="vditor" data-is-markdown="0" data-instance-id="N">
 *     <div id="vditor{N}"></div>
 *     <textarea name="..." id="..." data-role="vditor-input"></textarea>
 *   </div>
 */
(function (global) {
    'use strict';

    var doc = global.document;
    if (!doc) return;

    var ns = global.Yii2Markdown = global.Yii2Markdown || {};
    if (ns.DualEngine && ns.DualEngine.__ready) return;

    // ---------------------------------------------------------------- helpers
    function log(msg) { try { console.log('[yii2md/DualEngine] ' + msg); } catch (e) {} }
    function warn(msg, err) { try { console.warn('[yii2md/DualEngine] ' + msg, err || ''); } catch (e) {} }

    function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
    function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

    function dispatch(name, detail) {
        try {
            doc.dispatchEvent(new CustomEvent(name, { detail: detail || {}, bubbles: true }));
        } catch (e) {
            // IE11 fallback (project doesn't target it but be safe)
            var ev = doc.createEvent('CustomEvent');
            ev.initCustomEvent(name, true, false, detail || {});
            doc.dispatchEvent(ev);
        }
    }

    function getConverter() {
        if (ns.Converter && ns.Converter.markdownToHtml && ns.Converter.htmlToMarkdown) {
            return ns.Converter;
        }
        warn('Converter not loaded — make sure ConverterAsset is registered before this script.');
        return null;
    }

    // ---------------------------------------------------------------- styles
    var STYLE_ID = 'yii2md-dual-engine-style';
    function injectStyles() {
        if (doc.getElementById(STYLE_ID)) return;
        var css = [
            '.yii2md-toolbar-extra{display:flex;gap:8px;align-items:center;padding:6px 10px;background:#f8fafc;border:1px solid #e5e7eb;border-bottom:none;border-radius:4px 4px 0 0;font-size:12px;color:#374151;flex-wrap:wrap}',
            '.yii2md-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;font-size:12px;line-height:1.4;background:#fff;color:#1f2937;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;transition:background .15s,border-color .15s}',
            '.yii2md-btn:hover{background:#f3f4f6;border-color:#9ca3af}',
            '.yii2md-btn[disabled]{opacity:.55;cursor:not-allowed}',
            '.yii2md-banner{display:flex;align-items:center;gap:12px;padding:8px 12px;background:#fef3c7;border:1px solid #fcd34d;border-bottom:none;color:#78350f;font-size:13px}',
            '.yii2md-banner .yii2md-banner-msg{flex:1}',
            '.yii2md-banner .yii2md-btn{background:#fff;border-color:#d97706;color:#92400e}',
            '.yii2md-banner .yii2md-btn:hover{background:#fef3c7}',
            // dialog
            '.yii2md-dialog-mask{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:9999;animation:yii2md-fade .12s ease-out}',
            '@keyframes yii2md-fade{from{opacity:0}to{opacity:1}}',
            '.yii2md-dialog{background:#fff;border-radius:6px;box-shadow:0 18px 38px rgba(15,23,42,.25);width:min(440px,92vw);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111827}',
            '.yii2md-dialog-title{padding:14px 18px;font-weight:600;font-size:15px;border-bottom:1px solid #e5e7eb}',
            '.yii2md-dialog-body{padding:16px 18px;font-size:13px;line-height:1.6;color:#374151}',
            '.yii2md-dialog-footer{display:flex;justify-content:flex-end;gap:8px;padding:10px 14px;background:#f9fafb;border-top:1px solid #e5e7eb}',
            '.yii2md-dialog-footer .yii2md-btn[data-action="confirm"]{background:#2563eb;color:#fff;border-color:#2563eb}',
            '.yii2md-dialog-footer .yii2md-btn[data-action="confirm"]:hover{background:#1d4ed8;border-color:#1d4ed8}',
            '[data-theme="dark"] .yii2md-toolbar-extra{background:#1f2937;border-color:#374151;color:#d1d5db}',
            '[data-theme="dark"] .yii2md-btn{background:#111827;color:#e5e7eb;border-color:#374151}',
            '[data-theme="dark"] .yii2md-btn:hover{background:#1f2937;border-color:#4b5563}',
            '[data-theme="dark"] .yii2md-banner{background:#451a03;border-color:#92400e;color:#fde68a}',
            '[data-theme="dark"] .yii2md-banner .yii2md-btn{background:#1f2937;color:#fde68a;border-color:#92400e}',
            '[data-theme="dark"] .yii2md-dialog{background:#1f2937;color:#f3f4f6}',
            '[data-theme="dark"] .yii2md-dialog-title{border-color:#374151}',
            '[data-theme="dark"] .yii2md-dialog-body{color:#d1d5db}',
            '[data-theme="dark"] .yii2md-dialog-footer{background:#111827;border-color:#374151}'
        ].join('\n');
        var s = doc.createElement('style');
        s.id = STYLE_ID;
        s.appendChild(doc.createTextNode(css));
        (doc.head || doc.documentElement).appendChild(s);
    }

    // ---------------------------------------------------------------- dialog
    function confirmDialog(opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            var mask = doc.createElement('div');
            mask.className = 'yii2md-dialog-mask';
            mask.innerHTML =
                '<div class="yii2md-dialog" role="dialog" aria-modal="true">' +
                  '<div class="yii2md-dialog-title"></div>' +
                  '<div class="yii2md-dialog-body"></div>' +
                  '<div class="yii2md-dialog-footer">' +
                    '<button type="button" class="yii2md-btn" data-action="cancel"></button>' +
                    '<button type="button" class="yii2md-btn" data-action="confirm"></button>' +
                  '</div>' +
                '</div>';
            mask.querySelector('.yii2md-dialog-title').textContent = opts.title || '请确认';
            mask.querySelector('.yii2md-dialog-body').textContent = opts.message || '';
            mask.querySelector('[data-action="cancel"]').textContent = opts.cancelText || '取消';
            mask.querySelector('[data-action="confirm"]').textContent = opts.confirmText || '确定';

            function close(ok) {
                if (mask.parentNode) mask.parentNode.removeChild(mask);
                resolve(!!ok);
            }
            mask.addEventListener('click', function (e) {
                var t = e.target;
                if (t === mask) return close(false);
                if (t.matches && t.matches('[data-action="cancel"]')) return close(false);
                if (t.matches && t.matches('[data-action="confirm"]')) return close(true);
            });
            doc.body.appendChild(mask);
        });
    }

    // ---------------------------------------------------------------- registry
    var instances = {}; // id -> instance state

    function getInstance(id) {
        return instances[String(id)] || null;
    }

    function readEngineValue(state) {
        try {
            if (state.engine === 'cherry') {
                var c = global['cherry' + state.id];
                return c && typeof c.getMarkdown === 'function' ? (c.getMarkdown() || '') : '';
            }
            if (state.engine === 'vditor') {
                var v = global['vditor_' + state.id];
                if (v && typeof v.getValue === 'function') return v.getValue() || '';
                if (v && typeof v.getHTML === 'function') return v.getHTML() || '';
            }
        } catch (e) { warn('readEngineValue failed', e); }
        return '';
    }

    function setEngineValue(state, value) {
        try {
            if (state.engine === 'cherry') {
                var c = global['cherry' + state.id];
                if (c && typeof c.setMarkdown === 'function') c.setMarkdown(value || '');
            } else if (state.engine === 'vditor') {
                var v = global['vditor_' + state.id];
                if (v && typeof v.setValue === 'function') v.setValue(value || '');
            }
        } catch (e) { warn('setEngineValue failed', e); }
    }

    // ---------------------------------------------------------------- hidden _md / _html sync
    function ensureHiddenFields(state) {
        var input = state.input;
        if (!input) return;
        var form = input.closest ? input.closest('form') : null;
        var baseName = input.getAttribute('name') || '';
        if (!baseName) return;
        // 名称：Post[content] -> Post[content_md] / Post[content_html]
        var mdName, htmlName;
        var m = baseName.match(/^(.*)\[([^\[\]]+)\]$/);
        if (m) {
            mdName = m[1] + '[' + m[2] + '_md]';
            htmlName = m[1] + '[' + m[2] + '_html]';
        } else {
            mdName = baseName + '_md';
            htmlName = baseName + '_html';
        }
        function findOrCreate(name, role) {
            var sel = 'input[type="hidden"][data-yii2md-role="' + role + '"][data-instance-id="' + state.id + '"]';
            var el = state.root.querySelector(sel);
            if (!el && form) el = form.querySelector(sel);
            if (!el) {
                el = doc.createElement('input');
                el.type = 'hidden';
                el.setAttribute('data-yii2md-role', role);
                el.setAttribute('data-instance-id', String(state.id));
                state.root.appendChild(el);
            }
            el.name = name;
            return el;
        }
        state.mdInput = findOrCreate(mdName, 'md');
        state.htmlInput = findOrCreate(htmlName, 'html');
    }

    function syncHidden(state) {
        var conv = getConverter();
        var current = readEngineValue(state);
        if (!state.mdInput || !state.htmlInput) return;
        if (state.engine === 'cherry') {
            state.mdInput.value = current || '';
            state.htmlInput.value = conv ? conv.markdownToHtml(current || '') : '';
        } else if (state.engine === 'vditor') {
            // Vditor wysiwyg 默认 getValue 返回 markdown；HTML 用 getHTML
            var md = current || '';
            var html = '';
            try {
                var v = global['vditor_' + state.id];
                if (v && typeof v.getHTML === 'function') html = v.getHTML() || '';
            } catch (e) {}
            // 若 getValue 拿到的不是 md（少数模式），就走转换
            state.mdInput.value = md;
            state.htmlInput.value = html || (conv ? conv.markdownToHtml(md) : '');
        }
    }

    // ---------------------------------------------------------------- toolbar UI
    function ensureToolbar(state) {
        if (state.toolbar) return state.toolbar;
        var bar = doc.createElement('div');
        bar.className = 'yii2md-toolbar-extra';
        bar.setAttribute('data-instance-id', String(state.id));

        var labelEngine = doc.createElement('span');
        labelEngine.className = 'yii2md-engine-label';
        bar.appendChild(labelEngine);

        var btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'yii2md-btn';
        btn.setAttribute('data-yii2md-action', 'switch');
        btn.setAttribute('data-instance-id', String(state.id));
        bar.appendChild(btn);

        // 插入位置：根容器最前
        if (state.root.firstChild) state.root.insertBefore(bar, state.root.firstChild);
        else state.root.appendChild(bar);

        state.toolbar = bar;
        state.toolbarLabel = labelEngine;
        state.toolbarBtn = btn;

        btn.addEventListener('click', function () {
            var to = state.engine === 'cherry' ? 'vditor' : 'cherry';
            api.switchTo(state.id, to);
        });
        refreshToolbar(state);
        return bar;
    }

    function refreshToolbar(state) {
        if (!state.toolbar) return;
        var labelText = state.engine === 'cherry'
            ? '当前模式：Markdown'
            : '当前模式：所见即所得';
        var btnText = state.engine === 'cherry'
            ? '切换到所见即所得 →'
            : '切换到 Markdown →';
        state.toolbarLabel.textContent = labelText;
        state.toolbarBtn.textContent = btnText;
    }

    // ---------------------------------------------------------------- banner
    function showBanner(state, msg) {
        if (state.banner) {
            state.banner.querySelector('.yii2md-banner-msg').textContent = msg;
            return;
        }
        var bar = doc.createElement('div');
        bar.className = 'yii2md-banner';
        bar.setAttribute('data-instance-id', String(state.id));
        bar.innerHTML =
            '<span class="yii2md-banner-msg"></span>' +
            '<button type="button" class="yii2md-btn" data-action="revert" data-yii2md-action="revert">放弃转换</button>' +
            '<button type="button" class="yii2md-btn" data-action="dismiss">忽略</button>';
        bar.querySelector('.yii2md-banner-msg').textContent = msg;
        // 插在 toolbar 之后
        if (state.toolbar && state.toolbar.parentNode === state.root) {
            state.root.insertBefore(bar, state.toolbar.nextSibling);
        } else {
            state.root.insertBefore(bar, state.root.firstChild);
        }
        bar.addEventListener('click', function (e) {
            if (e.target.matches('[data-action="revert"]')) api.revert(state.id);
            else if (e.target.matches('[data-action="dismiss"]')) hideBanner(state);
        });
        state.banner = bar;
    }

    function hideBanner(state) {
        if (state.banner && state.banner.parentNode) {
            state.banner.parentNode.removeChild(state.banner);
        }
        state.banner = null;
    }

    // ---------------------------------------------------------------- discover
    function discoverRoots() {
        return $all('.yii2-markdown-root[data-instance-id]');
    }

    function pickEngine(root) {
        var e = root.getAttribute('data-engine');
        return e === 'vditor' ? 'vditor' : 'cherry';
    }

    function pickInput(root, engine) {
        // 隐藏 input 是绑定 form 的那个 textarea
        if (engine === 'vditor') {
            var v = root.querySelector('textarea[data-role="vditor-input"]');
            if (v) return v;
        }
        // Cherry：root 内部的隐藏 textarea（带 hidden 属性）
        var t = root.querySelector('textarea[hidden], textarea[name]');
        return t || null;
    }

    function bindLiveSync(state) {
        // Cherry：使用 onChange
        if (state.engine === 'cherry') {
            var c = global['cherry' + state.id];
            if (c && typeof c.onChange === 'function' && !state.__cherryHook) {
                try {
                    c.onChange(function () { syncHidden(state); });
                    state.__cherryHook = true;
                } catch (e) { warn('cherry.onChange hook failed', e); }
            }
        }
        // Vditor：原 PHP 已挂 input 回调写 textarea；我们在 input 上监听 change 即可
        if (state.engine === 'vditor' && state.input && !state.__vditorHook) {
            // 用轮询兜底（Vditor 的 input 不会触发 change 事件，DOM 也不会冒泡）
            state.__vditorTimer = setInterval(function () { syncHidden(state); }, 600);
            state.__vditorHook = true;
        }
    }

    function unbindVditorTimer(state) {
        if (state.__vditorTimer) {
            clearInterval(state.__vditorTimer);
            state.__vditorTimer = null;
            state.__vditorHook = false;
        }
    }

    // ---------------------------------------------------------------- core: switch
    function rerenderAs(state, targetEngine, valueForTarget) {
        // 把当前根容器内的引擎挂载点替换掉，并重建 widget。
        // 我们尽量不依赖 PHP 的额外封装：直接 new Cherry / new Vditor。
        var root = state.root;
        var instanceId = state.id;

        // 销毁旧实例（尽力而为）
        try {
            if (state.engine === 'cherry') {
                var c = global['cherry' + instanceId];
                if (c && typeof c.destroy === 'function') c.destroy();
                global['cherry' + instanceId] = undefined;
            } else if (state.engine === 'vditor') {
                unbindVditorTimer(state);
                var v = global['vditor_' + instanceId];
                if (v && typeof v.destroy === 'function') v.destroy();
                global['vditor_' + instanceId] = undefined;
            }
        } catch (e) { warn('destroy old engine failed', e); }

        // 清理 DOM：保留 toolbar / banner / 隐藏字段，移除其它子节点
        var preserve = [];
        if (state.toolbar) preserve.push(state.toolbar);
        if (state.banner) preserve.push(state.banner);
        if (state.input) preserve.push(state.input);
        if (state.mdInput) preserve.push(state.mdInput);
        if (state.htmlInput) preserve.push(state.htmlInput);
        Array.prototype.slice.call(root.children).forEach(function (n) {
            if (preserve.indexOf(n) < 0) {
                try { root.removeChild(n); } catch (e) {}
            }
        });

        // 创建新挂点
        var mountId, mount;
        if (targetEngine === 'cherry') {
            mountId = 'cherry' + instanceId;
            mount = doc.createElement('div');
            mount.id = mountId;
            root.appendChild(mount);
            try {
                var cherry = new global.Cherry({
                    id: mountId,
                    value: valueForTarget || '',
                    editor: { defaultModel: 'edit&preview', height: '620px' },
                });
                global['cherry' + instanceId] = cherry;
            } catch (e) {
                warn('new Cherry failed', e);
                return false;
            }
        } else {
            mountId = 'vditor' + instanceId;
            mount = doc.createElement('div');
            mount.id = mountId;
            mount.className = 'yii2-markdown-vditor-mount';
            root.appendChild(mount);
            try {
                var vd = new global.Vditor(mountId, {
                    mode: 'wysiwyg',
                    cache: { enable: false },
                    after: function () {
                        try { vd.setValue(valueForTarget || ''); } catch (e) {}
                    },
                    input: function (val) {
                        if (state.input) state.input.value = val || '';
                    },
                });
                global['vditor_' + instanceId] = vd;
            } catch (e) {
                warn('new Vditor failed', e);
                return false;
            }
        }

        // 更新 root 标记
        root.setAttribute('data-engine', targetEngine);
        root.setAttribute('data-is-markdown', targetEngine === 'cherry' ? '1' : '0');
        root.classList.remove('yii2-markdown-root--cherry', 'yii2-markdown-root--vditor');
        root.classList.add('yii2-markdown-root--' + targetEngine);

        state.engine = targetEngine;
        bindLiveSync(state);
        refreshToolbar(state);
        // 重新拿一次 input（targetEngine 切换可能影响隐藏 input 的位置；当前我们保留旧 input 即可）
        // 同步一次隐藏字段
        // 等待引擎初始化完成后再同步
        setTimeout(function () { syncHidden(state); }, 80);
        return true;
    }

    // ---------------------------------------------------------------- public API
    var api = {
        __ready: true,

        init: function (opts) {
            opts = opts || {};
            injectStyles();

            // 自动扫描所有根节点
            var roots = discoverRoots();
            if (opts.root) roots = [opts.root];
            roots.forEach(function (root) {
                var id = root.getAttribute('data-instance-id') || String(Math.random()).slice(2, 7);
                if (instances[id]) return; // 幂等
                var engine = pickEngine(root);
                var state = {
                    id: id,
                    root: root,
                    engine: engine,
                    input: pickInput(root, engine),
                    toolbar: null,
                    toolbarLabel: null,
                    toolbarBtn: null,
                    banner: null,
                    mdInput: null,
                    htmlInput: null,
                    snapshot: null,
                };
                instances[id] = state;
                ensureHiddenFields(state);
                ensureToolbar(state);
                bindLiveSync(state);
                // 首次同步（等到引擎实例就绪）
                waitFor(function () {
                    return state.engine === 'cherry'
                        ? !!global['cherry' + id]
                        : !!global['vditor_' + id];
                }, 5000).then(function (ok) {
                    if (ok) syncHidden(state);
                });
            });
            return Object.keys(instances).length;
        },

        switchTo: function (id, to) {
            var state = getInstance(id);
            if (!state) { warn('instance not found: ' + id); return Promise.resolve(false); }
            if (state.engine === to) return Promise.resolve(true);

            return confirmDialog({
                title: '切换编辑模式',
                message: to === 'vditor'
                    ? '将切换到所见即所得（WYSIWYG）模式。\n当前 Markdown 内容会通过 marked 转为 HTML，部分排版可能略有差异；切换后顶部会出现「放弃转换」按钮，可一键恢复。'
                    : '将切换到 Markdown 源码模式。\n当前 HTML 内容会通过 Turndown 转为 Markdown，复杂样式可能丢失；切换后顶部会出现「放弃转换」按钮，可一键恢复。',
                confirmText: '确认切换',
                cancelText: '取消',
            }).then(function (ok) {
                if (!ok) return false;

                var fromEngine = state.engine;
                var beforeValue = readEngineValue(state);
                state.snapshot = {
                    engine: fromEngine,
                    value: beforeValue,
                    time: Date.now(),
                };

                dispatch('yii2md:beforeSwitch', { instanceId: id, from: fromEngine, to: to });

                var conv = getConverter();
                var newValue;
                if (fromEngine === 'cherry' && to === 'vditor') {
                    // cherry: md → 给 vditor 喂 md（vditor wysiwyg 直接接受 md）
                    newValue = beforeValue;
                } else if (fromEngine === 'vditor' && to === 'cherry') {
                    // vditor → cherry: 通过 getHTML → htmlToMarkdown 得到 md
                    var html = '';
                    try {
                        var v = global['vditor_' + id];
                        if (v && typeof v.getHTML === 'function') html = v.getHTML() || '';
                    } catch (e) {}
                    newValue = conv ? conv.htmlToMarkdown(html) : beforeValue;
                } else {
                    newValue = beforeValue;
                }

                var ok2 = rerenderAs(state, to, newValue);
                if (!ok2) {
                    warn('switch failed, rolled back to ' + fromEngine);
                    return false;
                }

                showBanner(state, '已转换为 ' + (to === 'cherry' ? 'Markdown' : '所见即所得') + ' 模式。如需放弃本次转换，请点击右侧按钮。');
                dispatch('yii2md:afterSwitch', { instanceId: id, from: fromEngine, to: to });
                return true;
            });
        },

        revert: function (id) {
            var state = getInstance(id);
            if (!state || !state.snapshot) {
                warn('nothing to revert for ' + id);
                return false;
            }
            var snap = state.snapshot;
            var ok = rerenderAs(state, snap.engine, snap.value);
            if (!ok) return false;
            hideBanner(state);
            dispatch('yii2md:revert', { instanceId: id, restoredEngine: snap.engine });
            state.snapshot = null;
            return true;
        },

        getInstance: getInstance,
        _instances: instances,
    };

    function waitFor(predicate, timeoutMs) {
        return new Promise(function (resolve) {
            var deadline = Date.now() + (timeoutMs || 3000);
            (function loop() {
                if (predicate()) return resolve(true);
                if (Date.now() > deadline) return resolve(false);
                setTimeout(loop, 60);
            })();
        });
    }

    ns.DualEngine = api;

    // 自动初始化（DOMContentLoaded 与 load 双触发，防止某些场景下 widget 渲染较晚）
    function autoInit() { try { api.init(); } catch (e) { warn('auto init failed', e); } }
    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', autoInit);
    } else {
        setTimeout(autoInit, 0);
    }
    global.addEventListener('load', function () { setTimeout(autoInit, 100); });

    // CommonJS 兼容（测试场景）
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
