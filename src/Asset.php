<?php

namespace pjkui\markdown;

class Asset extends \yii\web\AssetBundle
{
    public $sourcePath = '@pjkui\\markdown\\dist';

    public $js = [
        'tinymce.min.js',
        '*.js'
    ];
    public $css = [
        '*.css'
    ];
}
