<?php

namespace pjkui\markdown\tests;

use pjkui\markdown\Editor;
use yii\base\Model;

class EditorTest extends TestCase
{
    public function testWidgetRendersHiddenTextareaAndContainerForModelAttribute(): void
    {
        Editor::$INSTANCE_ID = 1;

        $model = new class () extends Model {
            public $content = '# Hello';

            public function formName(): string
            {
                return 'Post';
            }
        };

        $html = Editor::widget([
            'model' => $model,
            'attribute' => 'content',
        ]);

        $this->assertStringContainsString('<textarea', $html);
        $this->assertStringContainsString('name="Post[content]"', $html);
        $this->assertStringContainsString('id="post-content"', $html);
        $this->assertStringContainsString('hidden="hidden"', $html);
        $this->assertStringContainsString('># Hello</textarea>', $html);
        $this->assertStringContainsString('id="cherry2"', $html);
    }

    public function testWidgetRegistersClientScriptAndStyles(): void
    {
        Editor::$INSTANCE_ID = 1;

        Editor::widget([
            'tagAttribute' => [
                'id' => 'editor-body',
                'name' => 'body',
            ],
            'defaultValue' => 'draft',
            'options' => [
                'url' => '/upload',
                'extra' => ['type' => 'markdown'],
            ],
        ]);

        $view = \Yii::$app->view;
        $js = implode("\n", $view->js[\yii\web\View::POS_END] ?? []);
        $css = implode("\n", $view->css ?? []);

        $this->assertStringContainsString('UPLOAD_URL = "/upload"', $js);
        $this->assertStringContainsString('window.cherry2 = cherry;', $js);
        $this->assertStringContainsString('md-editor-status', $css);
    }

    public function testInvalidTagTypeReturnsErrorMarkup(): void
    {
        $html = Editor::widget([
            'tagType' => 'section',
            'tagAttribute' => [
                'id' => 'editor-body',
                'name' => 'body',
            ],
        ]);

        $this->assertSame('<span>error tag</span>', $html);
    }
}
