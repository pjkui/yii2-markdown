/**
 * 补充覆盖率：converter.js 的错误路径与边界条件
 *
 * 覆盖未被 converter.test.js 命中的行：
 *   24-28  warn 函数
 *   36     String(md) 非字符串转换
 *   42-43  marked 未加载时的 warn + return ''
 *   57-64  marked 旧函数形式 / API 无法识别 / catch 分支
 *   80-81  TurndownService 未加载
 *   111    String(html) 非字符串转换
 *   121-122 td.turndown 抛异常
 *   134    _resetCache 方法
 */
const path = require('path');

// ------------------------------------------------------------------ helpers

function loadConverter(overrides = {}) {
    jest.resetModules();
    const { bootstrapConverter } = require('./setup');
    // bootstrapConverter 设置了正常的全局，再用 overrides 覆盖
    bootstrapConverter();
    // 应用覆盖
    Object.entries(overrides).forEach(([k, v]) => {
        global[k] = v;
        if (typeof window !== 'undefined') window[k] = v;
    });
    // 清除 Yii2Markdown 使 IIFE 重新运行
    if (typeof window !== 'undefined' && window.Yii2Markdown) delete window.Yii2Markdown;
    if (global.Yii2Markdown) delete global.Yii2Markdown;
    const converterPath = path.resolve(__dirname, '../../../src/dist/converter.js');
    delete require.cache[converterPath];
    return require(converterPath);
}

// ------------------------------------------------------------------ tests

describe('Converter — 非字符串入参自动转换', () => {
    let C;
    beforeAll(() => { C = loadConverter(); });

    test('markdownToHtml：数字入参转字符串后正常解析', () => {
        const html = C.markdownToHtml(42);
        expect(typeof html).toBe('string');
        expect(html).toContain('42');
    });

    test('htmlToMarkdown：数字入参转字符串后正常解析', () => {
        const md = C.htmlToMarkdown(123);
        expect(typeof md).toBe('string');
        expect(md).toContain('123');
    });

    test('markdownToHtml：布尔 true 入参', () => {
        const html = C.markdownToHtml(true);
        expect(typeof html).toBe('string');
    });
});

describe('Converter — marked 未加载', () => {
    let C;
    beforeAll(() => {
        C = loadConverter({ marked: undefined });
    });

    test('markdownToHtml 返回空字符串', () => {
        expect(C.markdownToHtml('# Hello')).toBe('');
    });

    test('marked 未加载不抛异常', () => {
        expect(() => C.markdownToHtml('text')).not.toThrow();
    });
});

describe('Converter — TurndownService 未加载', () => {
    let C;
    beforeAll(() => {
        C = loadConverter({ TurndownService: undefined });
    });

    test('htmlToMarkdown 返回空字符串', () => {
        expect(C.htmlToMarkdown('<p>hello</p>')).toBe('');
    });

    test('TurndownService 未加载不抛异常', () => {
        expect(() => C.htmlToMarkdown('<p>x</p>')).not.toThrow();
    });
});

describe('Converter — marked 旧函数形式（无 .parse）', () => {
    let C;
    beforeAll(() => {
        // 模拟旧版 marked：直接是可调用函数，没有 .parse
        const oldMarked = function(md) { return '<p>' + md + '</p>'; };
        // 不设置 .parse 属性
        C = loadConverter({ marked: oldMarked });
    });

    test('markdownToHtml 走 marked(md) 分支', () => {
        const html = C.markdownToHtml('hello');
        expect(html).toBe('<p>hello</p>');
    });
});

describe('Converter — marked API 无法识别', () => {
    let C;
    beforeAll(() => {
        // marked 既不是函数，也没有 .parse
        C = loadConverter({ marked: { version: '0.0.0' } });
    });

    test('markdownToHtml 返回空字符串', () => {
        expect(C.markdownToHtml('hello')).toBe('');
    });
});

describe('Converter — marked.parse 抛异常', () => {
    let C;
    beforeAll(() => {
        const badMarked = {
            parse: () => { throw new Error('parse failed'); }
        };
        C = loadConverter({ marked: badMarked });
    });

    test('markdownToHtml 捕获异常返回空字符串', () => {
        expect(C.markdownToHtml('# test')).toBe('');
    });

    test('不向外抛异常', () => {
        expect(() => C.markdownToHtml('x')).not.toThrow();
    });
});

describe('Converter — htmlToMarkdown turndown 抛异常', () => {
    test('htmlToMarkdown 捕获异常返回空字符串', () => {
        const { bootstrapConverter } = require('./setup');
        const C = bootstrapConverter();
        // 注入会 throw 的 TurndownService
        const BadTD = function() {
            this.use = () => {};
            this.turndown = () => { throw new Error('turndown failed'); };
        };
        global.TurndownService = BadTD;
        if (typeof window !== 'undefined') window.TurndownService = BadTD;

        // 清缓存，重新加载
        const converterPath = path.resolve(__dirname, '../../../src/dist/converter.js');
        delete require.cache[converterPath];
        if (typeof window !== 'undefined' && window.Yii2Markdown) delete window.Yii2Markdown;
        const C2 = require(converterPath);

        expect(C2.htmlToMarkdown('<p>hello</p>')).toBe('');
        expect(() => C2.htmlToMarkdown('<p>x</p>')).not.toThrow();
    });
});

describe('Converter — _resetCache', () => {
    let C;
    beforeAll(() => {
        const { bootstrapConverter } = require('./setup');
        C = bootstrapConverter();
    });

    test('_resetCache 清除 Turndown 实例缓存后可重新创建', () => {
        // 先产生一个缓存的 Turndown 实例
        C.htmlToMarkdown('<p>hello</p>');
        // 清缓存
        expect(() => C._resetCache()).not.toThrow();
        // 清后仍可正常转换
        const md = C.htmlToMarkdown('<h1>Title</h1>');
        expect(md).toMatch(/^#\s+Title/m);
    });

    test('_getTurndown 返回 Turndown 实例', () => {
        const td = C._getTurndown({});
        expect(td).not.toBeNull();
        expect(typeof td.turndown).toBe('function');
    });

    test('_getTurndown 缓存命中（同 options 返回同一实例）', () => {
        const td1 = C._getTurndown({ headingStyle: 'atx' });
        const td2 = C._getTurndown({ headingStyle: 'atx' });
        expect(td1).toBe(td2);
    });
});

describe('Converter — 已注册时幂等加载', () => {
    test('重复 require 不重置 Converter', () => {
        const { bootstrapConverter } = require('./setup');
        const C1 = bootstrapConverter();
        // 不清除 Yii2Markdown，再次 require 走幂等分支
        const converterPath = path.resolve(__dirname, '../../../src/dist/converter.js');
        delete require.cache[converterPath];
        const C2 = require(converterPath);
        // 幂等：C2 也可用
        expect(typeof C2.markdownToHtml).toBe('function');
    });
});
