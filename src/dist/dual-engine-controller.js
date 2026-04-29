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

    var global = (typeof global !== 'undefined') ? global : (typeof window !== 'undefined') ? window : (typeof self !== 'undefined') ? self : {};
    var doc = global.document;
    if (!doc) return;

    var ns = global.Yii2Markdown = global.Yii2Markdown || {};
    if (ns.DualEngine && ns.DualEngine.__ready) return;

    // ---------------------------------------------------------------- helpers
    function log(msg) { try { console.log('[yii2md/DualEngine] ' + msg); } catch (e) {} }
    function warn(msg, err) { try { console.warn('[yii2md/DualEngine] ' + msg, err || ''); } catch (e) {} }

    function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
    function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

    function dispatch(target, name, detail) {
        // 兼容旧调用 dispatch(name, detail)：第一个参数是字符串时退化为 document
        if (typeof target === 'string') {
            detail = name;
            name = target;
            target = doc;
        }
        target = target || doc;
        try {
            target.dispatchEvent(new CustomEvent(name, { detail: detail || {}, bubbles: true }));
        } catch (e) {
            // IE11 fallback (project doesn't target it but be safe)
            var ev = doc.createEvent('CustomEvent');
            ev.initCustomEvent(name, true, false, detail || {});
            target.dispatchEvent(ev);
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
        // 返回语义：
        //   字符串  — 引擎当前内容（可能是 ''）
        //   null    — 引擎尚未就绪 / 读取失败（caller 应保留原值，不要覆盖）
        try {
            if (state.engine === 'cherry') {
                var c = global['cherry' + state.id];
                if (!c || typeof c.getMarkdown !== 'function') return null;
                return c.getMarkdown() || '';
            }
            if (state.engine === 'vditor') {
                var v = global['vditor_' + state.id];
                if (!v) return null;
                if (typeof v.getValue === 'function') return v.getValue() || '';
                if (typeof v.getHTML === 'function') return v.getHTML() || '';
                return null;
            }
        } catch (e) {
            // Vditor 在 after 回调之前被读取会抛 currentMode=undefined；
            // 此时视为"尚未就绪"而不是"空内容"，避免把 hidden _md 覆盖成空字符串
            // —— 这曾经导致 R4（N=10 表格来回切换）读到空 md。
            warn('readEngineValue failed', e);
            return null;
        }
        return null;
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
        // readEngineValue 返回 null 表示"引擎还没就绪"：跳过同步，保留上一轮写入的 hidden 值。
        // 否则连续切换时会把还没 ready 的 vditor 读成空串，再覆盖 mdInput.value = ''，
        // 导致用户内容蒸发（R4 曾在 N=10 切换后打中这个坑）。
        if (current === null) return;
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
    // 顶部工具栏条已由各编辑器工具栏内置切换按钮替代，此处不再额外生成。
    function ensureToolbar(state) {
        // 不创建额外的顶部工具栏条，切换按钮由 Editor.php / VditorEditor.php 注入到各自工具栏。
        return null;
    }

    function refreshToolbar(state) {
        // 无顶部工具栏条，无需刷新。
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

        // ============================================================
        // 引擎就绪后才翻牌：把 data-engine 切换 / state 更新 / 隐藏字段同步
        // 都推迟到新引擎真正可读，避免「外部 waitForFunction(data-engine===vditor)
        // 立刻读 getValue/getHTML 拿到 undefined / 空字符串」的竞态。
        // 这个语义保证「data-engine 翻牌」是一个原子的「ready」信号。
        // ============================================================
        function injectCherryV(state) {
            // Cherry 工具栏注入 V 图标按钮（切换到 Vditor）
            var toolbar = state.root.querySelector('.cherry-toolbar .toolbar-left');
            if (!toolbar || toolbar.querySelector('[data-yii2md-action="switch"]')) return;
            var btn = doc.createElement('span');
            btn.className = 'cherry-toolbar-button yii2md-switch-badge';
            btn.title = '切换到所见即所得';
            btn.setAttribute('data-yii2md-action', 'switch');
            btn.style.cursor = 'pointer';
            btn.textContent = 'V';
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                api.switchTo(state.id, 'vditor');
            });
            toolbar.appendChild(btn);
        }

        function markReady() {
            // 提前把已知的目标 markdown 写入 _md / _html 隐藏字段。
                // R4：连续 10 次切换最容易暴露「翻牌后 syncHidden 还没跑完」的空值窗口。
                if (state.mdInput || state.htmlInput) {
                    var preMd = String(valueForTarget || '');
                    // 兜底：valueForTarget 为空时，尝试从新引擎回读（R4 连续切换保护）
                    if (!preMd) {
                        try {
                            if (targetEngine === 'cherry') {
                                var c2 = global['cherry' + instanceId];
                                if (c2 && typeof c2.getMarkdown === 'function') preMd = c2.getMarkdown() || '';
                            } else if (targetEngine === 'vditor') {
                                var v2 = global['vditor_' + instanceId];
                                if (v2 && typeof v2.getValue === 'function') preMd = v2.getValue() || '';
                            }
                        } catch (e) {}
                    }
                    var conv0 = getConverter();
                    var preHtml = conv0 ? conv0.markdownToHtml(preMd) : '';
                    if (state.mdInput) state.mdInput.value = preMd;
                    if (state.htmlInput) state.htmlInput.value = preHtml;
                }

            root.setAttribute('data-engine', targetEngine);
            root.setAttribute('data-is-markdown', targetEngine === 'cherry' ? '1' : '0');
            root.classList.remove('yii2-markdown-root--cherry', 'yii2-markdown-root--vditor');
            root.classList.add('yii2-markdown-root--' + targetEngine);

            state.engine = targetEngine;
            bindLiveSync(state);
            refreshToolbar(state);
        }

        // 创建新挂点
        var mountId, mount;
        if (targetEngine === 'cherry') {
            mountId = 'cherry' + instanceId;
            mount = doc.createElement('div');
            mount.id = mountId;
            root.appendChild(mount);
            if (typeof global.Cherry !== 'function') {
                warn('Cherry global is missing; EditorAsset may not be registered on this page.');
                return false;
            }
            try {
                var cherry = new global.Cherry({
                    id: mountId,
                    value: valueForTarget || '',
                    editor: { defaultModel: 'edit&preview', height: '620px' },
                    engine: {
                        syntax: {
                            // 显式禁用图表插件，避免 usePlugin(EChartsTableEngine) 强制
                            // 开启 enableChart:true 后，未加载 echarts 时抛 "Package not found"
                            table: { enableChart: false },
                        },
                    },
                });
                global['cherry' + instanceId] = cherry;
            } catch (e) {
                warn('new Cherry failed', e);
                return false;
            }
            // Cherry 构造是同步的：getMarkdown 立刻可用。
            markReady();
            // Cherry 工具栏渲染可能稍有延迟，延迟注入 V 按钮
            setTimeout(function() { injectCherryV(state); }, 100);
        } else {
            mountId = 'vditor' + instanceId;
            mount = doc.createElement('div');
            mount.id = mountId;
            mount.className = 'yii2-markdown-vditor-mount';
            root.appendChild(mount);
            if (typeof global.Vditor !== 'function') {
                warn('Vditor global is missing; VditorAsset may not be registered on this page. '
                    + 'Register pjkui\\markdown\\VditorAsset in your view or use Editor::widget with isMarkdown=false at least once so the asset loads up-front.');
                return false;
            }
            try {
                // Vditor 是异步初始化（after 回调里 internal state / DOM 才齐全），
                // 因此 markReady 也推迟到 after 里：data-engine 翻牌 = 引擎可用。
                // 把初始值通过 `value` 选项传入（vditor 内部会在 after 之前就把它灌进编辑器），
                // 比"new 之后再 setValue"更可靠 —— 后者在某些初始化路径下会被 vditor 的
                // 内部 reset 覆盖（R4 表格 10 次切换中观察到 setValue 后立即 getValue 仍空）。
                var vditorToolbar = [
                    'emoji', 'headings', 'bold', 'italic', 'strike', 'link', '|',
                    'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
                    'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after', '|',
                    'upload', 'record', 'table', '|',
                    'undo', 'redo', '|',
                    'fullscreen', 'edit-mode', 'both', 'preview', 'outline', 'code-theme', 'content-theme', 'export', 'more',
                    '|', {
                        name: 'switchToCherry',
                        tip: '切换到 Markdown',
                        tipPosition: 's',
                        icon: '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:#2563eb;color:#fff;border-radius:4px;font-size:12px;font-weight:700;font-family:monospace;line-height:1;vertical-align:middle;">M</span>',
                        click: function () {
                            api.switchTo(instanceId, 'cherry');
                        }
                    }
                ];
                var vd = new global.Vditor(mountId, {
                    mode: 'wysiwyg',
                    cache: { enable: false },
                    value: valueForTarget || '',
                    toolbar: vditorToolbar,
                    after: function () {
                        try {
                            // 双保险：value 选项在多数版本下足够，但若被 vditor 内部 reset 清空，
                            // 这里再灌一次。两次写入不会出现可见的内容跳变。
                            if (!vd.getValue() && valueForTarget) {
                                vd.setValue(valueForTarget);
                            }
                        } catch (e) {}
                        // 给切换按钮加上 data-yii2md-action 属性，方便测试选择器
                        try {
                            var switchBtn = doc.querySelector('#' + mountId + ' [data-type="switchToCherry"]');
                            if (switchBtn) { switchBtn.setAttribute('data-yii2md-action', 'switch'); }
                        } catch (e) {}
                        global['vditor_' + instanceId] = vd;
                        markReady();
                    },
                    input: function (val) {
                        if (state.input) state.input.value = val || '';
                    },
                });
            } catch (e) {
                warn('new Vditor failed', e);
                return false;
            }
        }

        // 等引擎真正就绪后再二次同步一次（覆盖 Vditor 第一次 input 事件之前的窗口期）。
        waitFor(function () {
            if (state.engine !== targetEngine) return false; // markReady 还没跑
            if (targetEngine === 'cherry') {
                var c = global['cherry' + instanceId];
                return !!(c && typeof c.getMarkdown === 'function');
            }
            var v = global['vditor_' + instanceId];
            return !!(v && typeof v.getValue === 'function');
        }, 5000).then(function () { syncHidden(state); });
        return true;
    }

    // ---- argument normalization helpers ------------------------------------
    function engineFromAlias(v) {
        // 接受 'cherry' / 'md' / 'markdown' → 'cherry'
        // 接受 'vditor' / 'html' / 'wysiwyg' → 'vditor'
        if (!v) return null;
        var s = String(v).toLowerCase();
        if (s === 'cherry' || s === 'md' || s === 'markdown') return 'cherry';
        if (s === 'vditor' || s === 'html' || s === 'wysiwyg') return 'vditor';
        return null;
    }

    function resolveInstanceId(arg) {
        // 接受：实例 id 字符串/数字 / 根 DOM 节点 / 包含根的祖先节点 / 省略（取唯一实例）
        if (arg === undefined || arg === null) {
            var keys = Object.keys(instances);
            return keys.length === 1 ? keys[0] : null;
        }
        if (typeof arg === 'string' || typeof arg === 'number') return String(arg);
        if (arg && arg.nodeType === 1) {
            var root = arg.classList && arg.classList.contains('yii2-markdown-root')
                ? arg : arg.querySelector && arg.querySelector('.yii2-markdown-root[data-instance-id]');
            if (root) return root.getAttribute('data-instance-id');
        }
        return null;
    }

    // ---------------------------------------------------------------- public API
    var api = {
        __ready: true,

        /**
         * init(opts?)              — 自动扫描所有 .yii2-markdown-root
         * init(rootEl, opts?)      — 仅初始化指定 root（团队 leader 风格）
         */
        init: function (a, b) {
            var opts = {};
            if (a && a.nodeType === 1) {
                opts = b || {};
                opts.root = a;
            } else {
                opts = a || {};
            }
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

        /**
         * switchTo(idOrRoot, 'cherry'|'vditor'|'md'|'html')
         * switchTo('md'|'html')      — 唯一实例时的 leader 风格简写
         */
        switchTo: function (a, b) {
            var id, target;
            // 形态 A：switchTo('md'|'html') 单参数
            if (b === undefined) {
                id = resolveInstanceId(null);
                target = engineFromAlias(a);
            } else {
                id = resolveInstanceId(a);
                target = engineFromAlias(b);
            }
            if (!id) { warn('switchTo: ambiguous or missing instance id'); return Promise.resolve(false); }
            if (!target) { warn('switchTo: unrecognized target engine'); return Promise.resolve(false); }
            return doSwitch(id, target);
        },

        /**
         * revert(idOrRoot?)         — 省略时取唯一实例
         */
        revert: function (a) {
            var id = resolveInstanceId(a);
            if (!id) { warn('revert: ambiguous or missing instance id'); return false; }
            return doRevert(id);
        },

        getInstance: getInstance,
        _instances: instances,
    };

    function doSwitch(id, to) {
            var state = getInstance(id);
            if (!state) { warn('instance not found: ' + id); return Promise.resolve(false); }
            if (state.engine === to) return Promise.resolve(true);

            // 【R4 根因修复】在弹确认框之前，先把当前引擎的真实值强制同步到 mdInput。
            // 这样即使引擎在 rerenderAs 里被销毁、或在异步回调里 getValue 返回空，
            // mdInput.value 已经是最新的内容，兜底链一定不会拿到空串。
            (function forceSync() {
                try {
                    if (state.engine === 'cherry' && global['cherry' + state.id]) {
                        var c = global['cherry' + state.id];
                        if (typeof c.getMarkdown === 'function') {
                            var v = c.getMarkdown() || '';
                            if (v && state.mdInput) state.mdInput.value = v;
                            if (v) state.lastKnownValue = v;
                        }
                    } else if (state.engine === 'vditor' && global['vditor_' + state.id]) {
                        var v2 = global['vditor_' + state.id];
                        // wysiwyg 模式 getValue() 返回 markdown
                        if (typeof v2.getValue === 'function') {
                            var v = v2.getValue() || '';
                            if (v && state.mdInput) state.mdInput.value = v;
                            if (v) state.lastKnownValue = v;
                        }
                    }
                } catch (e) {}
            })();

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
                // readEngineValue 可能返回 null（引擎未就绪 / 读失败）；
                // 在切换路径上，用户已经点了确认按钮，不能让 null 蒸发内容：
                // 退而求其次，从上一轮 hidden.value / snapshot.value / lastKnownValue 恢复。
                // 统一用 falsy 判断：readEngineValue 可能返回 '' 而非 null，
                // 此时必须走兜底（mdInput / snapshot / lastKnownValue）。
                var beforeValue = readEngineValue(state);
                if (!beforeValue) {
                    beforeValue = (state.mdInput && state.mdInput.value)
                            || (state.snapshot && state.snapshot.value)
                            || (state.lastKnownValue)
                            || '';
                }
                // 同步写回 hidden 字段，防止「读不到 → 写不进 → snapshot 也空」的级联。
                if (beforeValue && state.mdInput) state.mdInput.value = beforeValue;
                state.snapshot = {
                    engine: fromEngine,
                    value: beforeValue,
                    time: Date.now(),
                };
                // 额外兜底：仅当 beforeValue 非空时才更新 lastKnownValue，
                // 防止空串覆盖掉之前成功保存到的值。
                if (beforeValue) { state.lastKnownValue = beforeValue; }

                dispatch(state.root, 'yii2md:beforeSwitch', { instanceId: id, from: fromEngine, to: to });

                var conv = getConverter();
                var newValue;
                if (fromEngine === 'cherry' && to === 'vditor') {
                    // cherry: md → 给 vditor 喂 md（vditor wysiwyg 直接接受 md）
                    newValue = beforeValue;
                } else if (fromEngine === 'vditor' && to === 'cherry') {
                    // vditor → cherry：wysiwyg 模式下 getValue() 直接返回 markdown，
                    // 优先用 beforeValue（已是 markdown），避免 getHTML() → htmlToMarkdown() 的转换损耗。
                    if (beforeValue) {
                        newValue = beforeValue;
                    } else {
                        // beforeValue 为空时的兜底：尝试直接读 getValue()，再失败才走 HTML 转换
                        var mdFromV = '';
                        try {
                            var v2 = global['vditor_' + id];
                            if (v2 && typeof v2.getValue === 'function') mdFromV = v2.getValue() || '';
                        } catch (e) {}
                        newValue = mdFromV || (conv ? conv.htmlToMarkdown((function(){
                            try {
                                var v3 = global['vditor_' + id];
                                return (v3 && typeof v3.getHTML === 'function') ? (v3.getHTML() || '') : '';
                            } catch(e) { return ''; }
                        })()) : beforeValue);
                    }
                } else {
                    newValue = beforeValue;
                }

                var ok2 = rerenderAs(state, to, newValue);
                if (!ok2) {
                    warn('switch failed, rolled back to ' + fromEngine);
                    return false;
                }

                showBanner(state, '已转换为 ' + (to === 'cherry' ? 'Markdown' : '所见即所得') + ' 模式。如需放弃本次转换，请点击右侧按钮。');
                dispatch(state.root, 'yii2md:afterSwitch', { instanceId: id, from: fromEngine, to: to });
                return true;
            });
    }

    function doRevert(id) {
            var state = getInstance(id);
            if (!state || !state.snapshot) {
                warn('nothing to revert for ' + id);
                return false;
            }
            var snap = state.snapshot;
            var ok = rerenderAs(state, snap.engine, snap.value);
            if (!ok) return false;
            hideBanner(state);
            dispatch(state.root, 'yii2md:revert', { instanceId: id, restoredEngine: snap.engine });
            state.snapshot = null;
            return true;
    }

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
