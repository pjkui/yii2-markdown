/**
 * @jest-environment jsdom
 *
 * Jest 基础设施 smoke 测试：
 * 确保 Jest、jsdom、转换库在 CI 上可用。真正的转换单测由 #5 落地在
 * tests/unit/converter/*.test.js。
 */

describe('Jest infrastructure smoke', () => {
  test('jsdom document is available', () => {
    expect(typeof document).toBe('object');
    const div = document.createElement('div');
    div.innerHTML = '<p>hello</p>';
    expect(div.firstChild.textContent).toBe('hello');
  });

  test('marked is loadable and produces HTML from Markdown', () => {
    const { marked } = require('marked');
    const html = marked.parse('# Title\n\n**bold**');
    expect(html).toMatch(/<h1[^>]*>Title<\/h1>/);
    expect(html).toMatch(/<strong>bold<\/strong>/);
  });

  test('turndown is loadable and produces Markdown from HTML (ATX headings)', () => {
    const TurndownService = require('turndown');
    // 项目约定：使用 ATX (#) 风格标题，避免 setext 风格的换行差异。
    const td = new TurndownService({ headingStyle: 'atx' });
    const md = td.turndown('<h1>Title</h1><p><strong>bold</strong></p>');
    expect(md).toMatch(/^# Title/);
    expect(md).toMatch(/\*\*bold\*\*/);
  });

  test('turndown-plugin-gfm exposes gfm plugin', () => {
    const gfm = require('turndown-plugin-gfm');
    expect(typeof gfm.gfm).toBe('function');
    expect(typeof gfm.tables).toBe('function');
    expect(typeof gfm.strikethrough).toBe('function');
  });
});
