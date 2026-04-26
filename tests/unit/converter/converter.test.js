/**
 * Unit tests for src/dist/converter.js (Yii2Markdown.Converter).
 *
 * U1  heading                 (Markdown → HTML)
 * U2  bold / italic
 * U3  ordered / unordered list
 * U4  link
 * U5  image
 * U6  inline code / code block (fenced)
 * U7  blockquote
 * U8  table (GFM)
 * U9  strikethrough
 * U10 task list
 * U11 html → markdown basic (h1/p/strong)
 * U12 html → markdown list / link
 * U13 roundtrip (md → html → md) preserves core GFM content
 *
 * All tests share a single bootstrapped Converter instance.
 */
const { bootstrapConverter } = require('./setup');

let Converter;

beforeAll(() => {
    Converter = bootstrapConverter();
});

function md2html(md, opts) { return Converter.markdownToHtml(md, opts); }
function html2md(html, opts) { return Converter.htmlToMarkdown(html, opts); }

describe('Yii2Markdown.Converter — markdownToHtml', () => {
    test('U1 heading levels', () => {
        const html = md2html('# H1\n\n## H2\n\n### H3');
        expect(html).toMatch(/<h1[^>]*>H1<\/h1>/);
        expect(html).toMatch(/<h2[^>]*>H2<\/h2>/);
        expect(html).toMatch(/<h3[^>]*>H3<\/h3>/);
    });

    test('U2 bold and italic', () => {
        const html = md2html('**bold** and *italic*');
        expect(html).toMatch(/<strong>bold<\/strong>/);
        expect(html).toMatch(/<em>italic<\/em>/);
    });

    test('U3 ordered and unordered list', () => {
        const ul = md2html('- a\n- b\n- c');
        expect(ul).toMatch(/<ul>/);
        expect((ul.match(/<li>/g) || []).length).toBe(3);

        const ol = md2html('1. one\n2. two');
        expect(ol).toMatch(/<ol>/);
        expect((ol.match(/<li>/g) || []).length).toBe(2);
    });

    test('U4 link', () => {
        const html = md2html('[Yii2](https://www.yiiframework.com)');
        expect(html).toMatch(/<a href="https:\/\/www\.yiiframework\.com"[^>]*>Yii2<\/a>/);
    });

    test('U5 image', () => {
        const html = md2html('![alt](https://example.com/a.png)');
        expect(html).toMatch(/<img[^>]+src="https:\/\/example\.com\/a\.png"[^>]*alt="alt"/);
    });

    test('U6 inline code and fenced code block', () => {
        const inline = md2html('use `Yii::t()` please');
        expect(inline).toMatch(/<code>Yii::t\(\)<\/code>/);

        const block = md2html('```js\nconsole.log(1);\n```');
        expect(block).toMatch(/<pre><code[^>]*>console\.log\(1\);/);
    });

    test('U7 blockquote', () => {
        const html = md2html('> quoted line');
        expect(html).toMatch(/<blockquote>\s*<p>quoted line<\/p>\s*<\/blockquote>/);
    });

    test('U8 GFM table', () => {
        const table = [
            '| a | b |',
            '| --- | --- |',
            '| 1 | 2 |',
        ].join('\n');
        const html = md2html(table);
        expect(html).toMatch(/<table>/);
        expect(html).toMatch(/<th>a<\/th>/);
        expect(html).toMatch(/<td>1<\/td>/);
    });

    test('U9 strikethrough', () => {
        const html = md2html('~~gone~~');
        // marked w/ gfm renders as <del> (or <s>)
        expect(html).toMatch(/<del>gone<\/del>|<s>gone<\/s>/);
    });

    test('U10 task list', () => {
        const html = md2html('- [x] done\n- [ ] todo');
        expect(html).toMatch(/type="checkbox"/);
        expect(html).toMatch(/checked/);
    });
});

describe('Yii2Markdown.Converter — htmlToMarkdown', () => {
    test('U11 basic block elements', () => {
        const md = html2md('<h1>Title</h1><p>hello <strong>world</strong></p>');
        expect(md).toMatch(/^#\s+Title/m);
        expect(md).toMatch(/hello \*\*world\*\*/);
    });

    test('U12 list and link', () => {
        const md = html2md('<ul><li>first</li><li>second</li></ul><p><a href="https://yii.com">yii</a></p>');
        expect(md).toMatch(/[-*]\s+first/);
        expect(md).toMatch(/[-*]\s+second/);
        expect(md).toMatch(/\[yii\]\(https:\/\/yii\.com\)/);
    });
});

describe('Yii2Markdown.Converter — roundtrip', () => {
    test('U13 markdown → html → markdown preserves core GFM content', () => {
        const source = [
            '# Heading',
            '',
            'a **bold** and *italic* phrase with `code`.',
            '',
            '- one',
            '- two',
            '',
            '[link](https://example.com)',
            '',
            '> a quote',
            '',
            '~~strike~~',
        ].join('\n');

        const html = md2html(source);
        const md2 = html2md(html);

        // Content equivalence checks — exact whitespace / marker style
        // may differ after a roundtrip, but all substantive content should survive.
        expect(md2).toMatch(/^#\s+Heading/m);
        expect(md2).toMatch(/\*\*bold\*\*/);
        expect(md2).toMatch(/\*italic\*|_italic_/);
        expect(md2).toMatch(/`code`/);
        expect(md2).toMatch(/[-*]\s+one/);
        expect(md2).toMatch(/[-*]\s+two/);
        expect(md2).toMatch(/\[link\]\(https:\/\/example\.com\)/);
        expect(md2).toMatch(/>\s+a quote/);
        // turndown-plugin-gfm 默认输出单波浪号（~x~），marked 两种都能解析
        expect(md2).toMatch(/~~strike~~|~strike~/);
    });
});

describe('Yii2Markdown.Converter — robustness', () => {
    test('empty / null / non-string inputs return empty string', () => {
        expect(md2html('')).toBe('');
        expect(md2html(null)).toBe('');
        expect(md2html(undefined)).toBe('');
        expect(html2md('')).toBe('');
        expect(html2md(null)).toBe('');
        expect(html2md(undefined)).toBe('');
    });
});
