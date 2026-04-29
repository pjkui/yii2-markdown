/**
 * E2E：模式切换 UI + 备份/放弃机制（issue #6 / 任务 #4）
 *
 * 验收用例编号 T1–T9，与 src/dist/dual-engine-controller.js 行为对齐。
 *
 * 启动 demo：
 *   composer demo  （等价于 YII2_MARKDOWN_DEMO=1 php -S 127.0.0.1:8080 -t examples examples/router.php）
 *
 * 运行测试：
 *   npx playwright test tests/e2e/switch-mode.spec.js
 *
 * playwright 由 tester 在 issue #8 中安装；本文件按真实 DOM 约定写完，可直接跑。
 *
 * DOM 约定（来自 backend-dev 实现）：
 *   .yii2-markdown-root[data-engine][data-instance-id][data-is-markdown]
 *   全局：window.cherry{N}、window.vditor_{N}
 *   控制器：window.Yii2Markdown.DualEngine
 *   控制器渲染：.yii2md-toolbar-extra、.yii2md-banner、.yii2md-dialog-mask、.yii2md-dialog
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.YII2MD_BASE_URL || 'http://127.0.0.1:8080';
const DEMO_PATH = '/';   // 主演示页，支持双引擎前端切换

/** 找到第一个实例的 id（demo 页可能渲染多个，这里取第一个） */
async function firstInstanceId(page) {
    return await page.locator('.yii2-markdown-root').first().getAttribute('data-instance-id');
}

test.describe('双引擎模式切换 / 备份 / 放弃（issue #6）', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL + DEMO_PATH);
        // 等控制器就绪 + 第一实例 cherry 实例化完成
        await page.waitForFunction(() => {
            return !!(window.Yii2Markdown && window.Yii2Markdown.DualEngine && window.Yii2Markdown.DualEngine.__ready);
        }, { timeout: 15_000 });
        await page.waitForSelector('[data-yii2md-action="switch"]');
    });

    test('T1 默认进入 Markdown 模式（Cherry）', async ({ page }) => {
        const engine = await page.locator('.yii2-markdown-root').first().getAttribute('data-engine');
        expect(engine).toBe('cherry');
        const id = await firstInstanceId(page);
        await page.waitForFunction((id) => !!window['cherry' + id], id);
    });

    test('T2 工具栏含切换按钮', async ({ page }) => {
        const btn = page.locator('[data-yii2md-action="switch"]').first();
        await expect(btn).toBeVisible();
    });

    test('T3 切换前弹确认对话框', async ({ page }) => {
        await page.locator('[data-yii2md-action="switch"]').first().click();
        await expect(page.locator('.yii2md-dialog-mask')).toBeVisible();
        await expect(page.locator('.yii2md-dialog-title')).toContainText(/切换/);
        await expect(page.locator('.yii2md-dialog [data-action="confirm"]')).toBeVisible();
        await expect(page.locator('.yii2md-dialog [data-action="cancel"]')).toBeVisible();
    });

    test('T4 取消切换则保持原引擎', async ({ page }) => {
        await page.locator('[data-yii2md-action="switch"]').first().click();
        await page.locator('.yii2md-dialog [data-action="cancel"]').click();
        const engine = await page.locator('.yii2-markdown-root').first().getAttribute('data-engine');
        expect(engine).toBe('cherry');
    });

    test('T5 确认切换 → Vditor，并出现黄色横幅', async ({ page }) => {
        const id = await firstInstanceId(page);
        await page.evaluate((id) => window['cherry' + id].setMarkdown('# Hello\n\n**bold** content'), id);

        await page.locator('[data-yii2md-action="switch"]').first().click();
        await page.locator('.yii2md-dialog [data-action="confirm"]').click();

        await page.waitForFunction((id) =>
            document.querySelector('.yii2-markdown-root[data-instance-id="' + id + '"]').getAttribute('data-engine') === 'vditor'
            && !!window['vditor_' + id],
            id, { timeout: 10_000 }
        );
        await expect(page.locator('.yii2md-banner').first()).toBeVisible();
        await expect(page.locator('.yii2md-banner').first()).toContainText(/已转换|放弃/);
    });

    test('T6 切换后内容大致一致（标题与粗体保留）', async ({ page }) => {
        const id = await firstInstanceId(page);
        await page.evaluate((id) => window['cherry' + id].setMarkdown('# Title\n\nSome **bold** text.'), id);

        await page.locator('[data-yii2md-action="switch"]').first().click();
        await page.locator('.yii2md-dialog [data-action="confirm"]').click();
        await page.waitForFunction((id) => !!window['vditor_' + id], id, { timeout: 10_000 });

        const html = await page.evaluate((id) => window['vditor_' + id].getHTML(), id);
        expect(html).toMatch(/Title/);
        expect(html).toMatch(/<strong>bold<\/strong>/i);
    });

    test('T7 「放弃转换」可恢复原 Markdown 与原引擎', async ({ page }) => {
        const id = await firstInstanceId(page);
        await page.evaluate((id) => window['cherry' + id].setMarkdown('# Restore Me'), id);
        const before = await page.evaluate((id) => window['cherry' + id].getMarkdown(), id);

        await page.locator('[data-yii2md-action="switch"]').first().click();
        await page.locator('.yii2md-dialog [data-action="confirm"]').click();
        await page.waitForFunction((id) => !!window['vditor_' + id], id, { timeout: 10_000 });

        await page.locator('.yii2md-banner [data-action="revert"]').first().click();
        await page.waitForFunction((id) =>
            document.querySelector('.yii2-markdown-root[data-instance-id="' + id + '"]').getAttribute('data-engine') === 'cherry'
            && !!window['cherry' + id],
            id, { timeout: 10_000 }
        );
        const after = await page.evaluate((id) => window['cherry' + id].getMarkdown(), id);
        expect(after.trim()).toBe(before.trim());
    });

    test('T8 自定义事件 yii2md:beforeSwitch / afterSwitch / revert 被触发', async ({ page }) => {
        const id = await firstInstanceId(page);
        await page.evaluate(() => {
            window.__events = [];
            ['yii2md:beforeSwitch', 'yii2md:afterSwitch', 'yii2md:revert'].forEach(name => {
                document.addEventListener(name, e => window.__events.push({ name, detail: e.detail }));
            });
        });
        await page.locator('[data-yii2md-action="switch"]').first().click();
        await page.locator('.yii2md-dialog [data-action="confirm"]').click();
        await page.waitForFunction(() => window.__events.some(e => e.name === 'yii2md:afterSwitch'));

        await page.locator('.yii2md-banner [data-action="revert"]').first().click();
        await page.waitForFunction(() => window.__events.some(e => e.name === 'yii2md:revert'));

        const events = await page.evaluate(() => window.__events.map(e => e.name));
        expect(events).toEqual(expect.arrayContaining([
            'yii2md:beforeSwitch', 'yii2md:afterSwitch', 'yii2md:revert',
        ]));
    });

    test('T9 双 hidden 字段 _md / _html 自动注入并随内容同步', async ({ page }) => {
        const id = await firstInstanceId(page);
        await page.evaluate((id) => window['cherry' + id].setMarkdown('# sync test'), id);
        // 等 onChange 同步到 hidden
        await page.waitForFunction(() => {
            return !!document.querySelector('input[type="hidden"][data-yii2md-role="md"]')
                && document.querySelector('input[type="hidden"][data-yii2md-role="md"]').value.includes('sync test');
        }, { timeout: 5000 });

        const md = await page.locator('input[type="hidden"][data-yii2md-role="md"]').first().inputValue();
        const html = await page.locator('input[type="hidden"][data-yii2md-role="html"]').first().inputValue();
        expect(md).toContain('sync test');
        expect(html).toMatch(/<h1[^>]*>.*sync test/i);
    });
});
