/**
 * E2E：双引擎演示 demo + 文档冒烟（issue #7 / 任务 #5）
 *
 * 启动：composer demo
 * 运行：npx playwright test tests/e2e/dual-engine.spec.js
 *
 * 验收用例 E1–E7：
 *   E1 demo 入口可加载，无 JS 报错
 *   E2 默认 Markdown 模式，预设内容完整
 *   E3 切换到 WYSIWYG 后 Vditor 工具栏可见
 *   E4 提交表单后端可拿到 _md 与 _html
 *   E5 ?engine=wysiwyg 启动即 WYSIWYG
 *   E6 文档导航链接（migration-guide）可见
 *   E7 docs/migration-guide.md 文件存在且包含关键词
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.YII2MD_BASE_URL || 'http://127.0.0.1:8080';
const DEMO_URL = '/';

test.describe('双引擎 demo（issue #7）', () => {

    test('E1 demo 入口可加载，无 JS 报错', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

        const resp = await page.goto(BASE_URL + DEMO_URL);
        expect(resp.ok()).toBeTruthy();
        await page.waitForFunction(() =>
            !!(window.Yii2Markdown && window.Yii2Markdown.DualEngine && window.Yii2Markdown.DualEngine.__ready)
        );
        expect(errors, 'demo 页加载有 JS 错误：' + errors.join('\n')).toEqual([]);
    });

    test('E2 默认渲染 Cherry / Markdown 模式 + 预设内容', async ({ page }) => {
        await page.goto(BASE_URL + DEMO_URL);
        await page.waitForSelector('.yii2-markdown-root[data-engine="cherry"]');
        const id = await page.locator('.yii2-markdown-root').first().getAttribute('data-instance-id');
        await page.waitForFunction((id) => !!window['cherry' + id], id);
        const md = await page.evaluate((id) => window['cherry' + id].getMarkdown(), id);
        expect(md.length).toBeGreaterThan(20);
        expect(md).toMatch(/双引擎/);
    });

    test('E3 切换为 WYSIWYG 后 Vditor 工具栏可见', async ({ page }) => {
        await page.goto(BASE_URL + DEMO_URL);
        await page.waitForSelector('[data-yii2md-action="switch"]');

        const id = await page.locator('.yii2-markdown-root').first().getAttribute('data-instance-id');
        await page.locator('[data-yii2md-action="switch"]').first().click();
        await page.locator('.yii2md-dialog [data-action="confirm"]').click();
        await page.waitForFunction((id) => !!window['vditor_' + id], id, { timeout: 20_000 });
        await expect(page.locator('.vditor-toolbar').first()).toBeVisible();
    });

    test('E4 提交表单 → 后端能拿到 _md 与 _html 字段并回显', async ({ page }) => {
        await page.goto(BASE_URL + DEMO_URL);
        await page.waitForSelector('.yii2-markdown-root');
        const id = await page.locator('.yii2-markdown-root').first().getAttribute('data-instance-id');
        await page.evaluate((id) => window['cherry' + id].setMarkdown('# E4 Submit Marker'), id);
        // 等 hidden md 同步
        await page.waitForFunction(() => {
            const el = document.querySelector('input[type="hidden"][data-yii2md-role="md"]');
            return el && el.value.includes('E4 Submit Marker');
        }, { timeout: 5000 });

        await Promise.all([
            page.waitForLoadState('networkidle'),
            page.click('button[type="submit"], input[type="submit"]'),
        ]);
        const body = await page.locator('body').innerText();
        expect(body).toContain('E4 Submit Marker');
        expect(body).toMatch(/content_md/);
        expect(body).toMatch(/content_html/);
    });

    test('E5 前端切换到 WYSIWYG 再切回 Markdown', async ({ page }) => {
        await page.goto(BASE_URL + DEMO_URL);
        await page.waitForSelector('[data-yii2md-action="switch"]');
        const id = await page.locator('.yii2-markdown-root').first().getAttribute('data-instance-id');
        // 切换到 Vditor
        await page.locator('[data-yii2md-action="switch"]').first().click();
        await page.locator('.yii2md-dialog [data-action="confirm"]').click();
        await page.waitForFunction((id) => !!window['vditor_' + id], id, { timeout: 10_000 });
        await expect(page.locator('.yii2-markdown-root').first()).toHaveAttribute('data-engine', 'vditor');
        // 切换回 Cherry：等 Vditor 完全就绪，然后用 DualEngine API 触发（不等 Promise）
        await page.waitForFunction((id) => !!window['vditor_' + id] && !!document.querySelector('.vditor-toolbar'), id, { timeout: 10_000 });
        // 非阻塞调用 switchTo（它返回的 Promise 等待用户确认对话框）
        await page.evaluate((id) => { window.Yii2Markdown.DualEngine.switchTo(id, 'cherry'); }, id);
        // 等对话框出现并确认
        await page.waitForSelector('.yii2md-dialog [data-action="confirm"]');
        await page.locator('.yii2md-dialog [data-action="confirm"]').click();
        await page.waitForFunction((id) => !!window['cherry' + id] && window['cherry' + id].getMarkdown, id, { timeout: 10_000 });
        await expect(page.locator('.yii2-markdown-root').first()).toHaveAttribute('data-engine', 'cherry');
    });

    test('E6 Preview 页面可访问', async ({ page }) => {
        await page.goto(BASE_URL + '/?page=preview');
        await expect(page.locator('.cherry-markdown').first()).toBeVisible();
    });

    test('E6b Vditor 切换按钮在 vditor-toolbar 内且可点击触发对话框', async ({ page }) => {
        await page.goto(BASE_URL + DEMO_URL);
        await page.waitForSelector('[data-yii2md-action="switch"]');
        const id = await page.locator('.yii2-markdown-root').first().getAttribute('data-instance-id');

        // 切换到 Vditor
        await page.locator('[data-yii2md-action="switch"]').first().click();
        await page.locator('.yii2md-dialog [data-action="confirm"]').click();
        await page.waitForFunction((id) => !!window['vditor_' + id], id, { timeout: 20_000 });

        // 确认 M 按钮在 vditor-toolbar 内（原生 toolbar 配置）
        await page.waitForSelector('[data-yii2md-action="switch"]', { timeout: 5_000 });
        const parentClass = await page.evaluate(() =>
            document.querySelector('[data-yii2md-action="switch"]')?.closest('.vditor-toolbar') ? 'vditor-toolbar' : 'other'
        );
        expect(parentClass).toBe('vditor-toolbar');

        // 点击 M 按钮能弹出对话框
        await page.evaluate(() => { document.querySelector('[data-yii2md-action="switch"]').click(); });
        await expect(page.locator('.yii2md-dialog-mask')).toBeVisible({ timeout: 5_000 });
        // 取消不切换
        await page.locator('.yii2md-dialog [data-action="cancel"]').click();
        await expect(page.locator('.yii2-markdown-root').first()).toHaveAttribute('data-engine', 'vditor');
    });

    test('E7 文档迁移指南文件存在且关键词齐全', async () => {
        const fs = require('fs');
        const path = require('path');
        const file = path.resolve(__dirname, '../../docs/migration-guide.md');
        expect(fs.existsSync(file), 'docs/migration-guide.md 应存在').toBeTruthy();
        const text = fs.readFileSync(file, 'utf8');
        expect(text).toMatch(/迁移/);
        expect(text).toMatch(/isMarkdown/);
        expect(text).toMatch(/双引擎/);
    });
});
