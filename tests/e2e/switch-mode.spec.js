/**
 * E2E：模式切换 UI + 备份/放弃机制（issue #6 / 任务 #4）
 *
 * 验收用例编号 T1–T9，对应 docs/plans/dual-engine-PLAN.md。
 *
 * 启动 demo：
 *   composer demo  （等价于 YII2_MARKDOWN_DEMO=1 php -S 127.0.0.1:8080 -t examples examples/router.php）
 *
 * 运行测试：
 *   npx playwright test tests/e2e/switch-mode.spec.js
 *
 * 注意：测试基础设施由 tester 在 issue #8 中安装 playwright 依赖；
 *       本文件先写好骨架，待 backend-dev 完成 #1#2#3 与 frontend-dev 完成 #4 后补全断言。
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.YII2MD_BASE_URL || 'http://127.0.0.1:8080';
const DEMO_PATH = '/dual-engine-demo.php'; // 由任务 #5 提供

test.describe('双引擎模式切换 / 备份 / 放弃（issue #6）', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL + DEMO_PATH);
        // 等待两个引擎之一就绪
        await page.waitForFunction(() => {
            return !!(window.Yii2Markdown && window.Yii2Markdown.DualEngine);
        }, { timeout: 10_000 });
    });

    test('T1 默认进入 Markdown 模式（Cherry）', async ({ page }) => {
        const engine = await page.getAttribute('.yii2md-editor', 'data-engine');
        expect(engine).toBe('cherry');
        // hidden md textarea 存在
        await expect(page.locator('textarea[name$="_md"]')).toHaveCount(1);
    });

    test('T2 工具栏含「切换到富文本」按钮', async ({ page }) => {
        const btn = page.locator('[data-yii2md-action="switch"]');
        await expect(btn).toBeVisible();
    });

    test('T3 切换前弹确认对话框', async ({ page }) => {
        await page.click('[data-yii2md-action="switch"]');
        const dialog = page.locator('.yii2md-dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(/切换|确认/);
    });

    test('T4 取消切换则保持原引擎', async ({ page }) => {
        await page.click('[data-yii2md-action="switch"]');
        await page.click('.yii2md-dialog [data-action="cancel"]');
        const engine = await page.getAttribute('.yii2md-editor', 'data-engine');
        expect(engine).toBe('cherry');
    });

    test('T5 确认切换 → Vditor，并出现黄色横幅', async ({ page }) => {
        // 注入一段 Markdown
        await page.evaluate(() => window.cherry2.setMarkdown('# Hello\n\n**bold** content'));
        await page.click('[data-yii2md-action="switch"]');
        await page.click('.yii2md-dialog [data-action="confirm"]');
        // 等切换完成
        await page.waitForFunction(() =>
            document.querySelector('.yii2md-editor').getAttribute('data-engine') === 'vditor'
        );
        await expect(page.locator('.yii2md-banner')).toBeVisible();
        await expect(page.locator('.yii2md-banner')).toContainText(/已转换|放弃/);
    });

    test('T6 切换后内容大致一致', async ({ page }) => {
        await page.evaluate(() => window.cherry2.setMarkdown('# Title\n\nSome **bold** text.'));
        const before = await page.evaluate(() => window.cherry2.getMarkdown());
        await page.click('[data-yii2md-action="switch"]');
        await page.click('.yii2md-dialog [data-action="confirm"]');
        await page.waitForFunction(() =>
            document.querySelector('.yii2md-editor').getAttribute('data-engine') === 'vditor'
        );
        const html = await page.evaluate(() => window.vditor2.getHTML());
        expect(html).toMatch(/Title/);
        expect(html).toMatch(/<strong>bold<\/strong>/i);
    });

    test('T7 「放弃转换」可恢复原 Markdown', async ({ page }) => {
        await page.evaluate(() => window.cherry2.setMarkdown('# Restore Me'));
        const before = await page.evaluate(() => window.cherry2.getMarkdown());
        await page.click('[data-yii2md-action="switch"]');
        await page.click('.yii2md-dialog [data-action="confirm"]');
        await page.click('.yii2md-banner [data-action="revert"]');
        await page.waitForFunction(() =>
            document.querySelector('.yii2md-editor').getAttribute('data-engine') === 'cherry'
        );
        const after = await page.evaluate(() => window.cherry2.getMarkdown());
        expect(after.trim()).toBe(before.trim());
    });

    test('T8 自定义事件 yii2md:beforeSwitch / afterSwitch / revert 被触发', async ({ page }) => {
        await page.evaluate(() => {
            window.__events = [];
            ['yii2md:beforeSwitch', 'yii2md:afterSwitch', 'yii2md:revert'].forEach(name => {
                document.addEventListener(name, e => window.__events.push({ name, detail: e.detail }));
            });
        });
        await page.click('[data-yii2md-action="switch"]');
        await page.click('.yii2md-dialog [data-action="confirm"]');
        await page.waitForFunction(() => window.__events.some(e => e.name === 'yii2md:afterSwitch'));
        await page.click('.yii2md-banner [data-action="revert"]');
        await page.waitForFunction(() => window.__events.some(e => e.name === 'yii2md:revert'));
        const events = await page.evaluate(() => window.__events.map(e => e.name));
        expect(events).toEqual(expect.arrayContaining([
            'yii2md:beforeSwitch', 'yii2md:afterSwitch', 'yii2md:revert',
        ]));
    });

    test('T9 双 hidden 字段会同步：_md / _html', async ({ page }) => {
        await page.evaluate(() => window.cherry2.setMarkdown('# sync test'));
        // 等待 onChange debounce
        await page.waitForTimeout(200);
        const mdVal = await page.locator('textarea[name$="_md"]').inputValue();
        expect(mdVal).toContain('sync test');
        // 切到 vditor 后 _html 应被填充
        await page.click('[data-yii2md-action="switch"]');
        await page.click('.yii2md-dialog [data-action="confirm"]');
        await page.waitForFunction(() =>
            document.querySelector('.yii2md-editor').getAttribute('data-engine') === 'vditor'
        );
        const htmlVal = await page.locator('textarea[name$="_html"]').inputValue();
        expect(htmlVal).toMatch(/sync test/);
    });
});
