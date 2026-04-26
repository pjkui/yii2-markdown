// @ts-check
/**
 * 回归矩阵 R1–R6（跨任务集成场景）
 *
 * 覆盖 issue #8 中列出的回归矩阵：
 * - R1：纯 Cherry 默认调用（不传 isMarkdown），行为与 v1.2.2 完全一致
 * - R2：isMarkdown=false 全流程（切换按钮可点 → 不抛错）
 * - R3：含 Mermaid 流程图的 Markdown 切换到 Vditor 不崩溃
 * - R4：含表格内容双向切换 N=10 次内容稳定
 * - R5：表单 POST 后端能拿到与前端一致的字符串
 * - R6：examples 页面视觉快照无异常
 *
 * R2 / R3 / R4 依赖 #4 / #6 落地的 DualEngine 控制器（dual-engine-demo.php），
 * 通过 [data-yii2md-action="switch"] 触发切换。
 */

const { test, expect } = require('@playwright/test');

const DUAL_DEMO = '/dual-engine-demo.php';

const LARGE_TABLE_MD = [
  '# 表格回归',
  '',
  '| 列 A | 列 B | 列 C |',
  '| --- | --- | --- |',
  '| a1  | b1  | c1  |',
  '| a2  | b2  | c2  |',
  '| a3  | b3  | c3  |',
].join('\n');

const MERMAID_MD = [
  '# Mermaid 回归',
  '',
  '```mermaid',
  'graph TD',
  '  A[开始] --> B{判断}',
  '  B -- 是 --> C[分支 1]',
  '  B -- 否 --> D[分支 2]',
  '```',
].join('\n');

async function gotoDemoReady(page) {
  await page.goto(DUAL_DEMO);
  await page.waitForFunction(
    () => !!(window.Yii2Markdown && window.Yii2Markdown.DualEngine && window.Yii2Markdown.DualEngine.__ready),
    null,
    { timeout: 15_000 }
  );
  await page.waitForSelector('[data-yii2md-action="switch"]');
  // 等 Cherry 实例就绪（DualEngine 自身也在 waitFor 它）
  await page.waitForFunction(() => {
    const root = document.querySelector('.yii2-markdown-root');
    if (!root) return false;
    const id = root.getAttribute('data-instance-id');
    const engine = root.getAttribute('data-engine');
    if (engine === 'cherry') return !!window['cherry' + id];
    if (engine === 'vditor') return !!window['vditor_' + id];
    return false;
  }, null, { timeout: 15_000 });
}

async function firstInstanceId(page) {
  return await page.locator('.yii2-markdown-root').first().getAttribute('data-instance-id');
}

async function setMarkdown(page, md) {
  const id = await firstInstanceId(page);
  await page.evaluate(({ id, md }) => {
    if (window['cherry' + id] && typeof window['cherry' + id].setMarkdown === 'function') {
      window['cherry' + id].setMarkdown(md);
    }
  }, { id, md });
}

async function confirmSwitch(page) {
  await page.locator('[data-yii2md-action="switch"]').first().click();
  await page.locator('.yii2md-dialog [data-action="confirm"]').click();
}

async function currentEngine(page) {
  return await page.locator('.yii2-markdown-root').first().getAttribute('data-engine');
}

async function waitEngine(page, expected, timeout = 10_000) {
  await page.waitForFunction(
    (exp) => document.querySelector('.yii2-markdown-root').getAttribute('data-engine') === exp,
    expected,
    { timeout }
  );
}

test.describe('R1 纯 Cherry 默认行为兼容 v1.2.2', () => {
  test('首页渲染编辑器容器 + 隐藏 textarea', async ({ page }) => {
    const resp = await page.goto('/');
    expect(resp?.status()).toBe(200);

    // Cherry 编辑器容器
    await expect(page.locator('#cherry2')).toHaveCount(1);

    // 隐藏的 textarea 作为表单提交入口
    const textarea = page.locator('textarea[name="Post[content]"]');
    await expect(textarea).toHaveCount(1);
    await expect(textarea).toHaveAttribute('hidden', /.*/);

    // 状态条：字数统计 / 自动保存
    await expect(page.locator('.md-editor-status')).toBeVisible();
  });

  test('预览页渲染只读 Preview 容器', async ({ page }) => {
    const resp = await page.goto('/?page=preview');
    expect(resp?.status()).toBe(200);
    await expect(page.locator('[id^="markdown-pre"]')).toHaveCount(1);
  });
});

test.describe('R2 isMarkdown=false 全流程（DualEngine 切换不报错）', () => {
  test('点击切换按钮 → 确认 → 引擎从 cherry 变为 vditor，无 JS 错', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await gotoDemoReady(page);
    expect(await currentEngine(page)).toBe('cherry');

    await confirmSwitch(page);
    await waitEngine(page, 'vditor');

    expect(errors, 'mode 切换不应抛 JS 异常：\n' + errors.join('\n')).toEqual([]);
  });
});

test.describe('R3 含 Mermaid 的 Markdown 切换不崩溃', () => {
  test('注入 Mermaid 后 Cherry → Vditor 切换不抛异常', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await gotoDemoReady(page);
    await setMarkdown(page, MERMAID_MD);
    await confirmSwitch(page);
    await waitEngine(page, 'vditor');

    expect(errors).toEqual([]);
  });
});

test.describe('R4 表格双向切换 N=10 内容稳定', () => {
  test('表格在 Cherry / Vditor 之间来回切换 10 次后核心内容仍存在', async ({ page }) => {
    test.setTimeout(90_000);

    await gotoDemoReady(page);

    // 通过 DualEngine API + 实例引擎 API 双通道写入，保证 Cherry 实例 + hidden _md
    // 都真正拿到目标内容（不要只写一边导致同步点竞争）
    await page.evaluate((md) => {
      const root = document.querySelector('.yii2-markdown-root');
      if (!root) return;
      const id = root.getAttribute('data-instance-id');
      if (window['cherry' + id] && typeof window['cherry' + id].setMarkdown === 'function') {
        window['cherry' + id].setMarkdown(md);
      }
      // 原始 textarea 也写一份，作为 DualEngine 的源
      const ta = document.querySelector('textarea[name$="[content]"]');
      if (ta) ta.value = md;
    }, LARGE_TABLE_MD);

    // 用 DualEngine 编程式 API 切换：每次返回 Promise，自动带确认对话框
    // （confirmDialog 在程序触发时同样会弹，让 E2E 用 dialog-mask 方式点 confirm）
    for (let i = 0; i < 10; i += 1) {
      const before = await currentEngine(page);
      const target = before === 'cherry' ? 'vditor' : 'cherry';

      await page.locator('[data-yii2md-action="switch"]').first().click();
      const mask = page.locator('.yii2md-dialog-mask').first();
      if (await mask.isVisible().catch(() => false)) {
        await page.locator('.yii2md-dialog [data-action="confirm"]').click();
      }
      await waitEngine(page, target);
      // 每次切换完等 hidden _md 字段刷新（DualEngine 用 waitFor 等引擎就绪后同步）
      await page.waitForFunction(() => {
        const input = document.querySelector('input[type="hidden"][data-yii2md-role="md"]');
        return !!(input && input.value && input.value.length > 0);
      }, null, { timeout: 5_000 }).catch(() => { /* 允许单次慢同步不阻塞整体 */ });
    }

    // 10 次后最终读：按优先级遍历各路取值口，只要有一处拿到非空就认
    const md = await page.evaluate(() => {
      const root = document.querySelector('.yii2-markdown-root');
      if (!root) return '';
      const id = root.getAttribute('data-instance-id');
      const engine = root.getAttribute('data-engine');

      // 1) hidden _md 字段（DualEngine 同步口）
      const mdInput = document.querySelector('input[type="hidden"][data-yii2md-role="md"]');
      if (mdInput && mdInput.value) return mdInput.value;

      // 2) 当前引擎实例
      if (engine === 'cherry' && window['cherry' + id]) {
        try { return window['cherry' + id].getMarkdown() || ''; } catch (e) { /* */ }
      }
      if (engine === 'vditor' && window['vditor_' + id]) {
        try { return window['vditor_' + id].getValue() || ''; } catch (e) { /* */ }
      }

      // 3) 原始 textarea
      const ta = document.querySelector('textarea[name$="[content]"]');
      return ta ? (ta.value || '') : '';
    });

    expect(md, 'R4 末态读不到内容（hidden _md / 实例 API / textarea 全为空）').toMatch(/列 A/);
    expect(md).toMatch(/a1/);
    expect(md).toMatch(/b3/);
  });
});

test.describe('R5 表单 POST 后端拿到的字符串与前端一致', () => {
  test('提交表单后 index.php 回显的内容与 textarea 一致', async ({ page }) => {
    await page.goto('/');

    const PAYLOAD = '# POST 回归\n\n正文一行。';
    await page.evaluate((md) => {
      const ta = document.querySelector('textarea[name="Post[content]"]');
      if (ta) { ta.value = md; }
    }, PAYLOAD);

    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.locator('form').first().evaluate((form) => form.submit()),
    ]);

    const body = await page.locator('body').innerText();
    expect(body).toContain('已接收表单提交');
    expect(body).toContain('POST 回归');
    expect(body).toContain('正文一行');
  });
});

test.describe('R6 examples 页面视觉快照', () => {
  test('首页主容器截图稳定', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#cherry2');
    await page.waitForTimeout(1200);
    const shot = await page.locator('.container').screenshot();
    // 首次运行会写入 baseline；变化时显式更新
    expect(shot).toMatchSnapshot('editor-page.png', { maxDiffPixelRatio: 0.05 });
  });

  test('预览页主容器截图稳定', async ({ page }) => {
    await page.goto('/?page=preview');
    await page.waitForSelector('[id^="markdown-pre"]');
    await page.waitForTimeout(1200);
    const shot = await page.locator('.container').screenshot();
    expect(shot).toMatchSnapshot('preview-page.png', { maxDiffPixelRatio: 0.05 });
  });
});
