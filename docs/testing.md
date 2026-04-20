# 本地测试与可视化验证

本页说明如何在扩展仓库中进行两类验证：

- 本地自动化测试：验证 PHP 组件输出和脚本注册行为
- 可视化验证：在一个 Yii2 应用中真实打开页面，检查编辑器交互和样式

## 1. 本地自动化测试

### 安装依赖

在仓库根目录执行：

```bash
composer install
```

### 运行测试

项目已经提供了 `PHPUnit` 配置和 Composer 脚本：

```bash
composer test
```

等价命令：

```bash
vendor/bin/phpunit --configuration phpunit.xml.dist
```

### 当前测试覆盖点

- `Editor` 绑定模型字段时，是否输出隐藏 `textarea`
- `Editor` 是否生成 Cherry 容器
- `Editor` 是否注册上传、状态栏等前端脚本与样式
- `Editor` 非法 `tagType` 是否返回错误标记
- `Preview` 是否输出预览容器并切换到 `previewOnly`

### 测试文件位置

```text
tests/
  bootstrap.php
  TestCase.php
  EditorTest.php
  PreviewTest.php
```

## 2. 可视化验证

自动化测试能保证组件输出结构稳定，但编辑器是一个前端交互型组件，建议再做一次页面级验证。

### 推荐验证方式

在本地准备一个 Yii2 应用，通过 path repository 或直接指向当前仓库引入这个扩展，然后创建一个简单表单页和一个预览页。

### 示例表单页

```php
<?php

use yii\helpers\Html;
use yii\widgets\ActiveForm;
use pjkui\markdown\Editor;

/** @var \yii\web\View $this */
/** @var \app\models\PostForm $model */

$form = ActiveForm::begin();

echo $form->field($model, 'title')->textInput();

echo Editor::widget([
    'model' => $model,
    'attribute' => 'content',
    'options' => [
        'url' => \yii\helpers\Url::to(['upload']),
        'extra' => [
            '_csrf' => Yii::$app->request->csrfToken,
        ],
    ],
]);

echo Html::submitButton('保存', ['class' => 'btn btn-primary']);

ActiveForm::end();
```

### 示例预览页

```php
<?php

use pjkui\markdown\Preview;

echo Preview::widget([
    'value' => $model->content,
]);
```

## 3. 建议检查清单

### 编辑器基础能力

- 页面首次加载时编辑器正常显示
- 初始 Markdown 内容被正确加载
- 表单提交时隐藏字段能带上最新内容
- `Ctrl/⌘ + S` 能触发表单提交

### 上传与粘贴

- 工具栏上传图片后能插入链接
- 拖拽文件时上传逻辑正常
- 粘贴图片或文件时行为符合预期
- 上传失败时有错误提示

### 草稿与离开提醒

- 编辑后会自动保存本地草稿
- 刷新页面后可提示恢复草稿
- 提交成功后草稿被清除
- 未保存时离开页面会提示确认

### 展示与主题

- 明暗主题下状态栏样式正常
- 移动端宽度下工具栏不会明显错位
- 预览模式下内容能正常渲染
- 图表、公式、表格等扩展内容能按需显示

## 4. 调试建议

- 如果页面没有编辑器，先检查 `EditorAsset` 是否成功发布
- 如果上传失败，优先检查 `options.url` 与接口返回格式
- 如果单元测试失败，先确认 `vendor/` 依赖已安装完整
- 如果只在宿主项目中异常，优先排查主题样式覆盖和 JS 冲突
