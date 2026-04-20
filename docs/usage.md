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
