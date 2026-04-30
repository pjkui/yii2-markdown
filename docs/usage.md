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

- **Cherry Markdown**（默认）：经典 Markdown 源码模式，左侧编辑、右侧实时预览
- **Vditor**：所见即所得（WYSIWYG）模式，直接在富文本区域编辑

两种模式可通过工具栏按钮在同一页面**无刷新切换**。

---

### 7.1 必要资源注册

使用双引擎切换功能时，必须提前注册 Vditor 和 Converter 资源，否则切换时会因 `Vditor is not loaded` 失败：

```php
use pjkui\markdown\Editor;
use pjkui\markdown\ConverterAsset;
use pjkui\markdown\VditorAsset;

// 在 View 中注册（通常放在 controller action 或 view 文件顶部）
ConverterAsset::register($this); // 含 dual-engine-controller.js 和 Markdown↔HTML 互转 API
VditorAsset::register($this);    // 含 Vditor WYSIWYG 引擎

echo Editor::widget([
    'model'     => $model,
    'attribute' => 'content',
    'options'   => ['url' => '/upload'],
]);
```

> **注意**：`ConverterAsset` 已经包含 `dual-engine-controller.js`，无需单独加载。

---

### 7.2 选择启动引擎

```php
// 默认：Markdown 模式（Cherry），与 v1.2.x 完全兼容
echo Editor::widget([
    'model'      => $model,
    'attribute'  => 'content',
    'isMarkdown' => true,   // 可省略
]);

// 以所见即所得模式启动
echo Editor::widget([
    'model'      => $model,
    'attribute'  => 'content',
    'isMarkdown' => false,
]);
```

---

### 7.3 工具栏切换按钮

两个引擎的工具栏末尾都会自动注入一枚**蓝色圆角徽章**切换按钮：

| 当前引擎 | 按钮 | 点击后切换到 |
|----------|------|-------------|
| Cherry Markdown | **V**（蓝色） | Vditor 所见即所得 |
| Vditor WYSIWYG  | **M**（蓝色） | Cherry Markdown |

切换流程：

1. 用户点击工具栏中的 V / M 按钮
2. 弹出确认对话框（纯 CSS，无第三方依赖）
3. 确认后内容通过 `marked` / `Turndown` 互转，渲染新引擎
4. 顶部出现黄色「已转换为 X 模式」横幅，附带**放弃转换**按钮，可一键恢复切换前的内容和引擎
5. 点「忽略」或继续编辑则横幅消失

---

### 7.4 表单后端接收

切换后，表单提交时除原字段外还会附带两个隐藏字段：

- `{attribute}_md`：Markdown 原文
- `{attribute}_html`：对应的 HTML

**Model rules 示例：**

```php
public function rules(): array
{
    return [
        [['content', 'content_md', 'content_html'], 'string'],
    ];
}
```

**推荐持久化策略（以 Markdown 为权威源）：**

```php
public function beforeSave($insert): bool
{
    if (!parent::beforeSave($insert)) {
        return false;
    }
    // content_md 是用户实际编辑的 Markdown 内容
    // content_html 用于前端展示缓存，无需重复渲染
    if (!empty($this->content_md)) {
        $this->content = $this->content_md;
    }
    return true;
}
```

---

### 7.5 监听切换事件

控制器会在切换流程中派发以下 `CustomEvent`，可在 `document` 上监听：

| 事件 | 时机 | `event.detail` |
|------|------|----------------|
| `yii2md:beforeSwitch` | 用户已确认，转换前 | `{ instanceId, from, to }` |
| `yii2md:afterSwitch`  | 转换并重渲染完成   | `{ instanceId, from, to }` |
| `yii2md:revert`       | 用户点击放弃转换   | `{ instanceId, restoredEngine }` |

```html
<script>
document.addEventListener('yii2md:beforeSwitch', function(e) {
    console.log('即将从', e.detail.from, '切换到', e.detail.to);
});
document.addEventListener('yii2md:afterSwitch', function(e) {
    console.log('已切换到', e.detail.to);
});
document.addEventListener('yii2md:revert', function(e) {
    console.log('已恢复到', e.detail.restoredEngine);
});
</script>
```

---

### 7.6 编程式 API

页面加载完成后，以下全局 API 可用：

```js
// 切换（会弹确认框）
window.Yii2Markdown.DualEngine.switchTo('vditor');   // → 所见即所得
window.Yii2Markdown.DualEngine.switchTo('cherry');   // → Markdown
// 或传实例 id（多编辑器场景）
window.Yii2Markdown.DualEngine.switchTo('2', 'vditor');

// 放弃本次转换，恢复上一个快照
window.Yii2Markdown.DualEngine.revert();

// 获取当前实例状态
const state = window.Yii2Markdown.DualEngine.getInstance('2');
console.log(state.engine); // 'cherry' 或 'vditor'
```

**Markdown ↔ HTML 互转（可单独使用）：**

```js
const html = window.Yii2Markdown.Converter.markdownToHtml('# Hello\n\n**bold**');
const md   = window.Yii2Markdown.Converter.htmlToMarkdown('<h1>Hello</h1>');
```

> 在不使用编辑器的纯展示页里，也可以单独注册 `ConverterAsset` 来使用互转 API：
>
> ```php
> use pjkui\markdown\ConverterAsset;
> ConverterAsset::register($this);
> ```

---

### 7.7 多编辑器场景

同一页面可以同时渲染多个编辑器实例（`Editor::$INSTANCE_ID` 自增），`DualEngine` 会独立管理每个实例：

```php
// 编辑器 1
echo Editor::widget(['model' => $model1, 'attribute' => 'title']);
// 编辑器 2
echo Editor::widget(['model' => $model2, 'attribute' => 'content']);
```

通过 DOM 根容器的 `data-instance-id` 属性区分，JS 侧可通过 `DualEngine.getInstance(id)` 读取指定实例状态。

---

### 7.8 常见问题排查

**Q：切换时报 `Vditor is not loaded`**  
A：未注册 `VditorAsset`。在调用 `Editor::widget` 的 view 文件顶部加：
```php
\pjkui\markdown\VditorAsset::register($this);
\pjkui\markdown\ConverterAsset::register($this);
```

**Q：切换时报 `table-echarts-plugin[init]: Package echarts not found`（v1.5.4 已修复）**  
A：升级到 v1.5.5+。根因是 Cherry 的全局插件注册会强制开启 echarts 支持，v1.5.5 在重建 Cherry 时显式禁用了该插件。

**Q：Vditor 工具栏 M 按钮点击无响应（v1.5.1 已修复）**  
A：升级到 v1.5.2+。旧版本通过 DOM 注入按钮到 Vditor 工具栏，会被事件委托拦截；新版本改用 Vditor 原生 `toolbar click` 配置。

**Q：Vditor 选中文字后报 `customWysiwygToolbar is not a function`（v1.5.6 已修复）**  
A：升级到 v1.5.6+。新版本在 `new Vditor()` 时加入了空函数占位。

**Q：切换后内容丢失**  
A：使用顶部黄色横幅的「放弃转换」按钮，可一键恢复到切换前的内容和引擎。如果横幅已消失，请确认表单是否已提交并从后端 `content_md` 字段恢复。

**Q：HTML → Markdown 转换后排版变化较大**  
A：HTML → Markdown 是有损转换（CSS 样式、内联样式、复杂嵌套等无法保留）。建议以 Markdown 为主编辑格式，HTML 仅作展示缓存，避免在两种模式间反复切换。

---

更详细的迁移与字段持久化建议见 [docs/migration-guide.md](./migration-guide.md)。
