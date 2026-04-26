<?php

namespace pjkui\markdown;

/**
 * Vditor 所见即所得（WYSIWYG）Markdown 编辑器的 AssetBundle。
 *
 * 资源位于 `src/dist/vditor/`：
 *  - vditor.min.js
 *  - vditor.min.css
 *  - dist/js/lute/lute.min.js（Vditor 运行时会按相对路径懒加载）
 *
 * @see https://github.com/Vanessa219/vditor
 */
class VditorAsset extends \yii\web\AssetBundle
{
    public $sourcePath = '@pjkui/markdown/dist/vditor';

    public $js = [
        'vditor.min.js',
    ];

    public $css = [
        'vditor.min.css',
    ];

    /**
     * 发布时保留 Vditor 运行时懒加载所需的 lute.min.js 及其他子目录资源。
     */
    public $publishOptions = [
        'only' => [
            '*.js',
            '*.css',
            'dist/*',
            'dist/**/*',
        ],
    ];
}
