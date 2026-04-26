<?php

namespace pjkui\markdown\tests\unit;

use pjkui\markdown\VditorEditor;
use pjkui\markdown\tests\TestCase;
use yii\base\Model;

/**
 * 单元测试：VditorEditor
 *
 * U1：无 model 绑定时渲染隐藏 textarea + 挂载 div + 根节点标记（data-engine=vditor / data-is-markdown=0）
 * U2：绑定 model/attribute 时 textarea 的 id/name 与 Html::getInputId/Name 一致，且初始值进入 textarea
 * U3：客户端脚本注册了 Vditor 构造逻辑，并默认 mode='wysiwyg'
 * U4：clientOptions.mode 可以覆盖默认 wysiwyg
 * U5：uploadUrl/uploadExtra 会注入到 clientOptions.upload.{url,extraData}
 */
class VditorEditorTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // 重置自增 id，保证断言稳定
        VditorEditor::$INSTANCE_ID = 0;
    }

    public function testRendersHiddenTextareaAndRootMarkers(): void
    {
        $html = VditorEditor::widget([
            'name' => 'content',
            'value' => '# Hello Vditor',
        ]);

        $this->assertStringContainsString('data-engine="vditor"', $html);
        $this->assertStringContainsString('data-is-markdown="0"', $html);
        $this->assertStringContainsString('id="vditor1"', $html); // 挂载 div
        $this->assertStringContainsString('<textarea', $html);
        $this->assertStringContainsString('name="content"', $html);
        $this->assertStringContainsString('hidden="hidden"', $html);
        $this->assertStringContainsString('># Hello Vditor</textarea>', $html);
    }

    public function testModelAttributeBindingPopulatesTextareaIdNameAndValue(): void
    {
        $model = new class () extends Model {
            public $body = '**bold**';
            public function formName(): string
            {
                return 'Post';
            }
        };

        $html = VditorEditor::widget([
            'model' => $model,
            'attribute' => 'body',
        ]);

        $this->assertStringContainsString('name="Post[body]"', $html);
        $this->assertStringContainsString('id="post-body"', $html);
        $this->assertStringContainsString('>**bold**</textarea>', $html);
    }

    public function testClientScriptRegistersVditorWithDefaultWysiwygMode(): void
    {
        VditorEditor::widget([
            'name' => 'content',
            'value' => 'hi',
        ]);

        $view = \Yii::$app->view;
        $js = implode("\n", $view->js[\yii\web\View::POS_END] ?? []);

        $this->assertStringContainsString('new window.Vditor(', $js);
        // 默认 mode 应该是 wysiwyg
        $this->assertMatchesRegularExpression('/"mode"\s*:\s*"wysiwyg"/', $js);
        // 挂载 id 必须是 vditor1
        $this->assertStringContainsString('"vditor1"', $js);
    }

    public function testClientOptionsCanOverrideMode(): void
    {
        VditorEditor::widget([
            'name' => 'content',
            'clientOptions' => ['mode' => 'ir'],
        ]);

        $view = \Yii::$app->view;
        $js = implode("\n", $view->js[\yii\web\View::POS_END] ?? []);
        $this->assertMatchesRegularExpression('/"mode"\s*:\s*"ir"/', $js);
        $this->assertDoesNotMatchRegularExpression('/"mode"\s*:\s*"wysiwyg"/', $js);
    }

    public function testUploadUrlAndExtraAreInjectedIntoClientOptions(): void
    {
        VditorEditor::widget([
            'name' => 'content',
            'uploadUrl' => '/upload/vditor',
            'uploadExtra' => ['type' => 'vditor', 'token' => 'abc'],
        ]);

        $view = \Yii::$app->view;
        $js = implode("\n", $view->js[\yii\web\View::POS_END] ?? []);
        // Json::htmlEncode 会把 "/" 转义为 "\/"，因此断言时使用转义后的字面量
        $this->assertStringContainsString('"upload":{', $js);
        $this->assertStringContainsString('"url":"\/upload\/vditor"', $js);
        // extraData 内的字段
        $this->assertStringContainsString('"type":"vditor"', $js);
        $this->assertStringContainsString('"token":"abc"', $js);
    }
}
