/*!
 * yii2-markdown Converter
 *
 * 独立于编辑器实例的 Markdown ↔ HTML 互转 API。
 * 依赖（需在本文件之前加载）：
 *   - marked (window.marked)                          —— Markdown → HTML
 *   - TurndownService (window.TurndownService)        —— HTML → Markdown
 *   - turndownPluginGfm (window.turndownPluginGfm)    —— GFM 扩展
 *
 * 暴露：
 *   window.Yii2Markdown.Converter.markdownToHtml(md, options?)
 *   window.Yii2Markdown.Converter.htmlToMarkdown(html, options?)
 *
 * 设计约束：
 *   1. 无 DOM 依赖（除 Turndown 自己需要的 DOM）—— 可在任何已加载本 asset 的页面调用。
 *   2. 懒加载且只构造一次 Turndown 实例（按 options 哈希缓存在内部 Map）。
 *   3. 失败返回空字符串并 console.warn，不抛异常，避免破坏宿主页面。
 */
(function (global) {
    'use strict';

    var root = global.Yii2Markdown = global.Yii2Markdown || {};
    if (root.Converter && root.Converter.__ready) {
        return; // 已注册，幂等
    }

    function warn(msg, err) {
        try { console.warn('[yii2-markdown/Converter] ' + msg, err || ''); } catch (_) {}
    }

    // ---- Markdown → HTML ----------------------------------------------------

    function markdownToHtml(md, options) {
        if (md === null || md === undefined) return '';
        if (typeof md !== 'string') {
            try { md = String(md); } catch (_) { return ''; }
        }
        if (md === '') return '';

        var marked = global.marked;
        if (!marked) {
            warn('marked is not loaded');
            return '';
        }

        var opts = Object.assign({
            gfm: true,
            breaks: false,
            // marked 12.x 已不再在选项里处理 sanitize（由调用方自行处理）
        }, options || {});

        try {
            // marked 12.x：parse / marked 都能接受对象 options
            if (typeof marked.parse === 'function') {
                return marked.parse(md, opts);
            }
            if (typeof marked === 'function') {
                return marked(md, opts);
            }
            warn('marked API not recognized');
            return '';
        } catch (e) {
            warn('markdownToHtml failed', e);
            return '';
        }
    }

    // ---- HTML → Markdown ----------------------------------------------------

    // 简易稳定 hash（用作 Turndown 实例缓存 key）
    function hashOptions(opts) {
        try { return JSON.stringify(opts || {}); } catch (_) { return '{}'; }
    }

    var turndownCache = {};

    function getTurndown(options) {
        var TurndownService = global.TurndownService;
        if (!TurndownService) {
            warn('TurndownService is not loaded');
            return null;
        }
        var key = hashOptions(options);
        if (turndownCache[key]) return turndownCache[key];

        var defaults = {
            headingStyle: 'atx',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced',
            fence: '```',
            emDelimiter: '*',
            strongDelimiter: '**',
            linkStyle: 'inlined',
        };
        var merged = Object.assign({}, defaults, options || {});
        var td = new TurndownService(merged);

        // 启用 GFM 插件（表格、删除线、任务列表、高亮代码块）
        var gfmPkg = global.turndownPluginGfm;
        if (gfmPkg && typeof gfmPkg.gfm === 'function') {
            try { td.use(gfmPkg.gfm); } catch (e) { warn('use(gfm) failed', e); }
        }

        turndownCache[key] = td;
        return td;
    }

    function htmlToMarkdown(html, options) {
        if (html === null || html === undefined) return '';
        if (typeof html !== 'string') {
            try { html = String(html); } catch (_) { return ''; }
        }
        if (html === '') return '';

        var td = getTurndown(options);
        if (!td) return '';

        try {
            return td.turndown(html);
        } catch (e) {
            warn('htmlToMarkdown failed', e);
            return '';
        }
    }

    // ---- export -------------------------------------------------------------

    root.Converter = {
        __ready: true,
        markdownToHtml: markdownToHtml,
        htmlToMarkdown: htmlToMarkdown,
        // 暴露内部方法供测试使用
        _getTurndown: getTurndown,
        _resetCache: function () { turndownCache = {}; },
    };

    // 同时兼容 CommonJS（Jest 环境下的 require）
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.Converter;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
