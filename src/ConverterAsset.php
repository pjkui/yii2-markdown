<?php

namespace pjkui\markdown;

/**
 * ConverterAsset —— Markdown ↔ HTML 互转工具的 AssetBundle。
 *
 * 独立于 EditorAsset / VditorAsset，可单独在需要的页面注册：
 *
 * ```php
 * use pjkui\markdown\ConverterAsset;
 * ConverterAsset::register($this); // $this = \yii\web\View
 * ```
 *
 * 加载完成后可通过 `window.Yii2Markdown.Converter` 调用：
 *   Yii2Markdown.Converter.markdownToHtml(md, options?);
 *   Yii2Markdown.Converter.htmlToMarkdown(html, options?);
 *
 * 依赖（均随本 AssetBundle 一并发布）：
 *  - marked.min.js
 *  - turndown.min.js
 *  - turndown-plugin-gfm.min.js
 *  - converter.js（包装层，暴露 Yii2Markdown.Converter）
 */
class ConverterAsset extends \yii\web\AssetBundle
{
    public $sourcePath = '@pjkui/markdown/dist';

    public $js = [
        'marked.min.js',
        'turndown.min.js',
        'turndown-plugin-gfm.min.js',
        'converter.js',
    ];

    public $css = [];

    /**
     * 与 EditorAsset 共享 sourcePath（@pjkui/markdown/dist）。
     * 为了确保单独注册 ConverterAsset（不注册 EditorAsset）时也能发布到依赖文件，
     * 这里采用与 EditorAsset 一致的宽松白名单：
     */
    public $publishOptions = [
        'only' => [
            '*.js',
            '*.css',
            '*/*.js',
            '*/*.css',
            'addons/*',
            'fonts/*',
        ],
    ];
}
