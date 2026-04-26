<?php

namespace pjkui\markdown\tests\unit;

use pjkui\markdown\Editor;
use pjkui\markdown\VditorEditor;
use pjkui\markdown\tests\TestCase;
use yii\base\Model;

/**
 * Editor 顶层路由单测：
 *
 * U1：默认 isMarkdown=true 时，Editor 渲染 Cherry 根节点（data-engine=cherry / data-is-markdown=1）
 * U2：isMarkdown=false 时，Editor 输出 VditorEditor 的根节点（data-engine=vditor / data-is-markdown=0）
 * U3：isMarkdown=false 时，model/attribute 会正确透传给 VditorEditor 的隐藏 textarea
 * U4：isMarkdown=false 时，options.url / options.extra 会作为 uploadUrl / uploadExtra 注入到 Vditor 客户端脚本
 */
class EditorRoutingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Editor::$INSTANCE_ID = 1;
        VditorEditor::$INSTANCE_ID = 0;
    }

    public function testDefaultMarkdownModeRendersCherryRoot(): void
    {
        $html = Editor::widget([
            'tagAttribute' => ['id' => 'editor-body', 'name' => 'body'],
            'defaultValue' => 'Hello',
        ]);

        $this->assertStringContainsString('data-engine="cherry"', $html);
        $this->assertStringContainsString('data-is-markdown="1"', $html);
        $this->assertStringContainsString('id="cherry2"', $html);
        $this->assertStringNotContainsString('data-engine="vditor"', $html);
    }

    public function testIsMarkdownFalseRoutesToVditor(): void
    {
        $html = Editor::widget([
            'isMarkdown' => false,
            'tagAttribute' => ['id' => 'editor-body', 'name' => 'body'],
            'defaultValue' => 'plain text',
        ]);

        $this->assertStringContainsString('data-engine="vditor"', $html);
        $this->assertStringContainsString('data-is-markdown="0"', $html);
        // 不应该出现 Cherry 的根节点
        $this->assertStringNotContainsString('data-engine="cherry"', $html);
        // 挂载 id 应是 VditorEditor 分配的 vditor1
        $this->assertStringContainsString('id="vditor1"', $html);
        // 隐藏 textarea 应有 name=body 并带默认值
        $this->assertStringContainsString('name="body"', $html);
        $this->assertStringContainsString('>plain text</textarea>', $html);
    }

    public function testIsMarkdownFalseWithModelBindsTextareaIdAndName(): void
    {
        $model = new class () extends Model {
            public $content = '# H1';
            public function formName(): string
            {
                return 'Post';
            }
        };

        $html = Editor::widget([
            'isMarkdown' => false,
            'model' => $model,
            'attribute' => 'content',
        ]);

        $this->assertStringContainsString('data-engine="vditor"', $html);
        $this->assertStringContainsString('name="Post[content]"', $html);
        $this->assertStringContainsString('id="post-content"', $html);
        $this->assertStringContainsString('># H1</textarea>', $html);
    }

    public function testIsMarkdownFalsePropagatesUploadUrlAndExtra(): void
    {
        Editor::widget([
            'isMarkdown' => false,
            'tagAttribute' => ['id' => 'editor-body', 'name' => 'body'],
            'options' => [
                'url' => '/upload/any',
                'extra' => ['type' => 'vditor', 'uid' => 7],
            ],
        ]);

        $view = \Yii::$app->view;
        $js = implode("\n", $view->js[\yii\web\View::POS_END] ?? []);

        $this->assertStringContainsString('"upload":{', $js);
        $this->assertStringContainsString('"url":"\/upload\/any"', $js);
        $this->assertStringContainsString('"type":"vditor"', $js);
        $this->assertStringContainsString('"uid":7', $js);
    }
}
