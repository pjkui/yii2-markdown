<?php

namespace pjkui\markdown\tests;

use pjkui\markdown\Preview;

class PreviewTest extends TestCase
{
    public function testPreviewRendersContainerAndRegistersScript(): void
    {
        Preview::$INSTANCE_ID = 0;

        $html = Preview::widget([
            'value' => '# Preview',
        ]);

        $view = \Yii::$app->view;
        $js = implode("\n", $view->js[\yii\web\View::POS_READY] ?? []);

        $this->assertStringContainsString('id="markdown-pre1"', $html);
        $this->assertStringContainsString('window.cherryPreview1 = cherry;', $js);
        $this->assertStringContainsString('"defaultModel":"previewOnly"', $js);
        $this->assertStringContainsString('value: "# Preview"', $js);
    }
}
