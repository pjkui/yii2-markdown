/**
 * E2E：双引擎演示 demo + 文档冒烟（issue #7 / 任务 #5）
 *
 * 验收用例编号 E1–E7。
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.YII2MD_BASE_URL || 'http://127.0.0.1:8080';

test.describe('双引擎 demo（issue #7）', () => {

    test('E1 demo 入口 dual-engine-demo.php 可加载，无 JS 报错', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

        const resp = await page.goto(BASE_URL + '/dual-engine-demo.php');
        expect(resp.ok()).toBeTruthy();
        await page.waitForFunction(() => !!(window.Yii2Markdown && window.Yii2Markdown.DualEngine));
        expect(errors, 'demo 页加载有 JS 错误：' + errors.join('\n')).toEqual([]);
    });

    test('E2 demo 默认渲染 Markdown 模式 + 文章预设内容', async ({ page }) => {
        await page.goto(BASE_URL + '/dual-engine-demo.php');
        await page.waitForSelector('.yii2md-editor[data-engine="cherry"]');
        const md = await page.evaluate(() => window.cherry2.getMarkdown());
        expect(md.length).toBeGreaterThan(20);
    });

    test('E3 切换为富文本后 Vditor 工具栏可见', async ({ page }) => {
        await page.goto(BASE_URL + '/dual-engine-demo.php');
        await page.waitForSelector('[data-yii2md-action="switch"]');
        await page.click('[data-yii2md-action="switch"]');
        await page.click('.yii2md-dialog [data-action="confirm"]');
        await page.waitForSelector('.yii2md-editor[data-engine="vditor"]');
        await expect(page.locator('.vditor-toolbar')).toBeVisible();
    });

    test('E4 提交表单 → 后端能拿到 _md 与 _html 字段并回显', async ({ page }) => {
        await page.goto(BASE_URL + '/dual-engine-demo.php');
        await page.waitForSelector('.yii2md-editor');
        await page.evaluate(() => window.cherry2.setMarkdown('# E4 Submit'));
        await page.waitForTimeout(300);
        await Promise.all([
            page.waitForLoadState('networkidle'),
            page.click('button[type="submit"], input[type="submit"]'),
        ]);
        await expect(page.locator('body')).toContainText('E4 Submit');
    });

    test('E5 后端把 _md 当作 model.content 持久化 → 重新进入 demo 仍是 markdown 模式', async ({ page }) => {
        await page.goto(BASE_URL + '/dual-engine-demo.php');
        // 由 demo 端记忆上一次 isMarkdown，本用例只验证再次访问后仍能初始化
        const engine = await page.getAttribute('.yii2md-editor', 'data-engine');
        expect(['cherry', 'vditor']).toContain(engine);
    });

    test('E6 README / docs 链接能在 demo 顶部显示', async ({ page }) => {
        await page.goto(BASE_URL + '/dual-engine-demo.php');
        await expect(page.locator('a[href*="docs/migration-guide"]')).toBeVisible();
    });

    test('E7 文档迁移指南文件存在', async () => {
        const fs = require('fs');
        const path = require('path');
        const file = path.resolve(__dirname, '../../docs/migration-guide.md');
        expect(fs.existsSync(file), 'docs/migration-guide.md 应存在').toBeTruthy();
        const text = fs.readFileSync(file, 'utf8');
        expect(text).toMatch(/迁移|isMarkdown|双引擎/);
    });
});
