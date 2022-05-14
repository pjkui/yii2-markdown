<?php

namespace pjkui\markdown;

class EditorAsset extends \yii\web\AssetBundle
{
    public $sourcePath = '@pjkui/markdown/dist';

    public $js = [
        // 'tinymce.min.js',
        "cherry-markdown.js"
        // '*.js'
    ];
    public $css = [
        // '*.css'
        "cherry-markdown.css"
    ];
    public $publishOptions = [
        'only' => [
            '*/*.js',
            '*/*.css',
            'addons/*',
            'fonts/*',
        ]
    ];
}
