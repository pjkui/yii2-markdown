# 使用示例

## 1. 基础编辑器

最常见的用法是在 ActiveForm 对应的模型字段上挂载编辑器：

```php
use pjkui\markdown\Editor;

echo Editor::widget([
    'model' => $model,
    'attribute' => 'content',
]);
```

组件会自动：

- 读取 `$model->content` 作为默认内容
- 生成表单字段名和字段 ID
- 将编辑结果同步回隐藏的 `textarea`

## 2. 不绑定模型

如果你只是想输出一个独立编辑器，也可以直接传值：

```php
use pjkui\markdown\Editor;

echo Editor::widget([
    'tagAttribute' => [
        'id' => 'post-content',
        'name' => 'content',
    ],
    'defaultValue' => "# Hello\n\nThis is markdown.",
]);
```

## 3. 自定义上传接口

编辑器内置了 `fileUpload` 回调，上传地址通过 `options.url` 传入：

```php
use pjkui\markdown\Editor;

echo Editor::widget([
    'model' => $model,
    'attribute' => 'content',
    'options' => [
        'url' => \yii\helpers\Url::to(['upload']),
        'extra' => [
            '_csrf' => Yii::$app->request->csrfToken,
            'type' => 'markdown',
        ],
    ],
]);
```

说明：

- `url` 会传给前端上传脚本
- `extra` 会作为附加参数参与上传
- 上传成功后，回调会将文件地址插入编辑器内容

## 4. 只读预览

详情页中可以直接使用 `Preview`：

```php
use pjkui\markdown\Preview;

echo Preview::widget([
    'value' => $model->content,
]);
```

## 5. 精简工具栏

你可以通过 `options.toolbars` 覆盖默认工具栏：

```php
use pjkui\markdown\Editor;

echo Editor::widget([
    'model' => $model,
    'attribute' => 'content',
    'options' => [
        'toolbars' => [
            'toolbar' => [
                'bold',
                'italic',
                '|',
                'header',
                'link',
                'code',
            ],
            'toolbarRight' => ['fullScreen'],
            'sidebar' => ['copy'],
        ],
    ],
]);
```

## 6. 编辑器默认行为

`Editor` 当前默认启用了以下行为：

- 编辑区高度约为 `620px`
- 粘贴时自动转换内容
- 编辑变更自动同步到隐藏字段
- 自动保存本地草稿
- 检测到草稿时可提示恢复
- 提交表单后清除草稿
- `Ctrl/⌘ + S` 可触发表单提交

如果项目中不需要这些增强能力，可以在后续版本中继续拆分配置项或做二次封装。

## 7. 双引擎：Markdown ↔ 所见即所得（v1.3.0+）

从 v1.3.0 起，`Editor` 同时支持两种编辑引擎：

- **Cherry Markdown**：经典 Markdown 源码模式（默认）
- **Vditor**：所见即所得（WYSIWYG）模式

### 7.1 选择启动引擎

```php
echo Editor::widget([
    'model' => $model,
    'attribute' => 'content',
    'isMarkdown' => true,    // true = Cherry / Markdown；false = Vditor / WYSIWYG
]);
```

省略 `isMarkdown` 时默认为 `true`，行为与 v1.2.x 完全一致。

### 7.2 双 hidden 字段

无论从哪种引擎进入页面，组件都会渲染两个隐藏 `textarea`：

- `name="{attribute}_md"`：Markdown 文本
- `name="{attribute}_html"`：HTML 文本

每次内容变更时，**当前引擎的原生格式**会被同步进对应的隐藏字段，另一端按需通过转换 API 填充。后端可根据业务选择存储 Markdown、HTML 或两者皆存。

### 7.3 工具栏中的「切换模式」按钮

两个引擎的工具栏右侧都会注入一枚切换按钮：

- 点击后弹出确认对话框（纯 CSS 实现，无第三方依赖）
- 用户确认后内部用 `marked`/`Turndown` 将当前内容互转为另一种格式
- 切换完成后顶部出现黄色横幅，提示"已转换为 X 模式"，并带「放弃转换」按钮，可一键回到切换前的内容与引擎

### 7.4 监听切换事件

控制器会在切换流程中派发以下 `CustomEvent`，可在 `document` 上监听：

| 事件 | 时机 | `event.detail` |
| --- | --- | --- |
| `yii2md:beforeSwitch` | 用户已确认，转换前 | `{ instanceId, from, to }` |
| `yii2md:afterSwitch`  | 转换并重渲染完成 | `{ instanceId, from, to }` |
| `yii2md:revert`       | 用户点击放弃转换 | `{ instanceId, restoredEngine }` |

```html
<script>
document.addEventListener('yii2md:afterSwitch', e => {
    console.log('引擎已切到', e.detail.to);
});
</script>
```

### 7.5 编程式 API

加载完成后，全局会暴露：

```js
window.Yii2Markdown.DualEngine.init();                       // 由 DOM 加载完成自动调用，幂等
window.Yii2Markdown.DualEngine.switchTo(id, 'cherry'|'vditor'); // 编程式切换（弹确认框）
window.Yii2Markdown.DualEngine.revert(id);                   // 等价于点击「放弃转换」
window.Yii2Markdown.Converter.markdownToHtml(md, options?);  // 同步 Markdown → HTML（marked 12 + GFM）
window.Yii2Markdown.Converter.htmlToMarkdown(html, options?);// 同步 HTML → Markdown（Turndown + GFM）
```

> 在不使用 Cherry/Vditor 的纯展示页里，也可以**单独**注册 `ConverterAsset` 来使用互转 API：
>
> ```php
> use pjkui\markdown\ConverterAsset;
> ConverterAsset::register($this);
> ```

更详细的迁移与字段持久化建议见 [docs/migration-guide.md](./migration-guide.md)。
