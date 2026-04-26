# 双引擎迁移指南

> 适用版本：v1.3.0+
> 涉及功能：所见即所得（WYSIWYG）模式、模式切换、备份/放弃机制
> 关联 issue：[#1](https://github.com/pjkui/yii2-markdown/issues/1)、[#4](https://github.com/pjkui/yii2-markdown/issues/4)、[#6](https://github.com/pjkui/yii2-markdown/issues/6)、[#7](https://github.com/pjkui/yii2-markdown/issues/7)

## 1. v1.3.0 带来了什么

- 新增 **Vditor** 富文本（WYSIWYG）引擎，作为 Cherry Markdown 的同级方案
- `Editor` 增加 `isMarkdown` 顶层选项，决定首次进入页面时是 Markdown 还是 WYSIWYG
- 用户在编辑过程中可在两种模式之间切换；切换前会弹确认框，切换后顶部会出现「放弃转换」横幅
- 表单同时输出 `{name}_md` 与 `{name}_html` 两个隐藏字段，便于后端按需持久化
- 提供前端互转 API（基于 `marked` 与 `Turndown`），保证两种模式之间转换尽量无损

## 2. 是否需要立即迁移？

**不需要**。`Editor::widget` 的旧调用方式完全兼容：

```php
echo Editor::widget([
    'model' => $model,
    'attribute' => 'content',
]);
```

未传 `isMarkdown` 时默认 `true`，行为与 v1.2.x 一致：仅渲染 Cherry Markdown 编辑器。

## 3. 升级步骤

### 3.1 仅享受新模式的"自动可用"

```bash
composer update pjkui/yii2-markdown
```

升级后什么都不改，原页面继续以 Markdown 模式工作。需要时用户可在工具栏自行切换到 WYSIWYG。

### 3.2 让某个字段以富文本模式启动

```php
echo Editor::widget([
    'model' => $model,
    'attribute' => 'content',
    'isMarkdown' => false,    // 启动即 WYSIWYG
]);
```

### 3.3 同时持久化 Markdown 与 HTML

提交表单时，`{attribute}_md` 与 `{attribute}_html` 会一起 POST 到后端。例如字段名 `content`：

```php
public function rules()
{
    return [
        [['content_md', 'content_html'], 'string'],
        ['content_md', 'safe'],
    ];
}

public function beforeSave($insert)
{
    if (!parent::beforeSave($insert)) {
        return false;
    }
    // 二选一持久化策略：
    //  - 推荐：以 _md 为权威源（可二次编辑），渲染时再用 marked 转 HTML 缓存
    //  - 兼容：保存 _html，但需要妥善 XSS 过滤
    $this->content = $this->content_md ?? $this->content_html;
    return true;
}
```

### 3.4 监听切换事件做联动

控制器在每次切换时会派发自定义事件，可在宿主页面挂监听：

```html
<script>
document.addEventListener('yii2md:beforeSwitch', function (e) {
    console.log('即将切换', e.detail);
});
document.addEventListener('yii2md:afterSwitch', function (e) {
    console.log('已切换到', e.detail.engine);
});
document.addEventListener('yii2md:revert', function (e) {
    console.log('已放弃本次转换', e.detail);
});
</script>
```

## 4. 常见问题

### Q1：HTML 转 Markdown 后排版变化大正常吗？

正常。HTML → Markdown 是有损的（CSS 样式、内联样式、嵌套表格等），切换时若发现差异较大请使用顶部「放弃转换」按钮恢复。

### Q2：能否完全禁用模式切换？

可以。传 `'switchable' => false` 即可隐藏切换按钮：

```php
echo Editor::widget([
    'model' => $model,
    'attribute' => 'content',
    'isMarkdown' => false,
    'switchable' => false,   // 锁定为 WYSIWYG
]);
```

### Q3：上传接口是否还兼容？

兼容。`options.url`/`options.extra` 在两种引擎中的行为一致：Cherry 走 `fileUpload`，Vditor 走 `upload.url`，前端封装层会代为映射。

### Q4：旧版本的本地草稿（`md_draft_*`）会失效吗？

不会。本地草稿键名未变，旧记录在升级后仍可被识别恢复。富文本模式下，草稿恢复弹窗的内容也按当前引擎对应字段填回。

## 5. 回滚

如果发现兼容性问题需要临时回滚：

```bash
composer require pjkui/yii2-markdown:1.2.2
```

并在 issue 区反馈遇到的问题，我们会尽快修复。
