<?php

namespace pjkui\markdown;

use Yii;
use yii\base\Model;
use yii\base\Widget;
use yii\helpers\ArrayHelper;
use yii\helpers\Html;
use yii\helpers\Json;

/**
 * Vditor Widget —— 所见即所得（WYSIWYG）模式的 Markdown 编辑器骨架。
 *
 * 与 {@see Editor} 同级，提供最小可用实例：
 *  - 注册 VditorAsset
 *  - 渲染 widget 根节点 `<div data-engine="vditor" data-is-markdown="0">`，
 *    内含 Vditor 挂载 div 与一个隐藏 textarea（与表单同名，便于提交时取值）
 *  - 在客户端 new Vditor(...) 并监听 input 事件，把当前 Markdown 同步回隐藏 textarea
 *
 * 属性（与 Editor 对齐）：
 *  - `name`         : 隐藏 textarea 的 name（未提供时从 model/attribute 推导）
 *  - `model`        : 与该组件绑定的 \yii\base\Model 实例
 *  - `attribute`    : 与该组件绑定的模型属性
 *  - `value`        : 初始内容（未提供时从 model 取值）
 *  - `options`      : 向后兼容的配置入口，会合并到 clientOptions
 *  - `clientOptions`: 传给 `new Vditor(selector, options)` 的配置，默认 `mode = 'wysiwyg'`
 *  - `uploadUrl`    : 文件上传地址（会注入到 clientOptions.upload.url）
 *  - `uploadExtra`  : 文件上传附加参数（会注入到 clientOptions.upload.extraData）
 */
class VditorEditor extends Widget
{
    public static $INSTANCE_ID = 0;

    /** @var string 隐藏 textarea 的 name；为空时自动从 model/attribute 推导 */
    public $name = '';

    /** @var Model|null 绑定的数据模型 */
    public $model;

    /** @var string|null 绑定的模型属性 */
    public $attribute;

    /** @var string 初始值（优先级：显式传入 > model 属性值） */
    public $value = '';

    /**
     * 兼容入口：会与 clientOptions 合并，后者优先级更高。
     * @var array
     */
    public $options = [];

    /**
     * 传给 Vditor 构造函数的 options。
     * 关键字段：
     *  - `mode`（默认 'wysiwyg'，可被覆盖为 'ir' / 'sv'）
     *  - `height` / `width` / `placeholder` / `toolbar` 等
     * @var array
     */
    public $clientOptions = [];

    /** @var string 文件上传接口地址（可空） */
    public $uploadUrl = '';

    /** @var array 文件上传附加参数（可空） */
    public $uploadExtra = [];

    /** @var int 自增实例编号 */
    protected $instanceId = 0;

    /** @var string 挂载 div 的 id / Vditor selector */
    protected $selector = '';

    /** @var string 隐藏 textarea 的 id */
    protected $textareaId = '';

    /** @var string 隐藏 textarea 的 name */
    protected $textareaName = '';

    /**
     * @return bool 是否绑定了 Model + attribute
     */
    protected function hasModel()
    {
        return $this->model instanceof Model && $this->attribute !== null;
    }

    public function init()
    {
        parent::init();

        $this->instanceId = ++self::$INSTANCE_ID;
        $this->selector = 'vditor' . $this->instanceId;

        // textarea id / name 推导
        if ($this->hasModel()) {
            $this->textareaId = Html::getInputId($this->model, $this->attribute);
            $this->textareaName = $this->name !== '' ? $this->name : Html::getInputName($this->model, $this->attribute);
        } else {
            $this->textareaId = $this->selector . '-input';
            $this->textareaName = $this->name !== '' ? $this->name : $this->textareaId;
        }

        // 初始值
        if ($this->value === '' && $this->hasModel()) {
            $attrs = $this->model->getAttributes([$this->attribute]);
            if (isset($attrs[$this->attribute]) && $attrs[$this->attribute] !== null) {
                $this->value = (string) $attrs[$this->attribute];
            }
        }

        // 合并 options -> clientOptions（clientOptions 优先）
        $defaults = [
            'mode' => 'wysiwyg',
            'cache' => ['enable' => false],
        ];
        $merged = ArrayHelper::merge($defaults, $this->options, $this->clientOptions);
        if (!isset($merged['mode']) || $merged['mode'] === '') {
            $merged['mode'] = 'wysiwyg';
        }

        // 注入上传配置
        if ($this->uploadUrl !== '') {
            $upload = isset($merged['upload']) && is_array($merged['upload']) ? $merged['upload'] : [];
            $upload['url'] = $this->uploadUrl;
            if (!empty($this->uploadExtra)) {
                $upload['extraData'] = ArrayHelper::merge(
                    isset($upload['extraData']) && is_array($upload['extraData']) ? $upload['extraData'] : [],
                    $this->uploadExtra
                );
            }
            $merged['upload'] = $upload;
        }

        $this->clientOptions = $merged;
    }

    public function run()
    {
        $view = $this->getView();
        VditorAsset::register($view);

        $selector = $this->selector;
        $textareaId = $this->textareaId;
        $textareaName = $this->textareaName;
        $value = (string) $this->value;

        // 根容器，带 data-engine / data-is-markdown 标记，便于前端切换逻辑识别
        $html = Html::beginTag('div', [
            'class' => 'yii2-markdown-root yii2-markdown-root--vditor',
            'data-engine' => 'vditor',
            'data-is-markdown' => '0',
            'data-instance-id' => (string) $this->instanceId,
        ]);
        // 挂载点
        $html .= Html::tag('div', '', ['id' => $selector, 'class' => 'yii2-markdown-vditor-mount']);
        // 隐藏 textarea，承担表单提交
        $html .= Html::textarea($textareaName, $value, [
            'id' => $textareaId,
            'hidden' => 'hidden',
            'style' => 'display:none',
            'data-role' => 'vditor-input',
        ]);
        $html .= Html::endTag('div');

        // 注册客户端脚本
        $clientOptionsJson = Json::htmlEncode($this->clientOptions);
        $valueJson = Json::htmlEncode($value);
        $js = <<<JS
(function(){
    if (typeof window.Vditor === 'undefined') {
        console.error('[yii2-markdown] Vditor is not loaded.');
        return;
    }
    var mountId = "{$selector}";
    var inputId = "{$textareaId}";
    var options = {$clientOptionsJson};
    var initValue = {$valueJson} || '';
    var \$input = document.getElementById(inputId);

    // 保留用户自定义 after 回调
    var userAfter = typeof options.after === 'function' ? options.after : null;
    options.after = function(){
        try {
            if (initValue && window.vditor_{$this->instanceId} && typeof window.vditor_{$this->instanceId}.setValue === 'function') {
                window.vditor_{$this->instanceId}.setValue(initValue);
            }
            if (\$input) { \$input.value = initValue || ''; }
        } catch (e) { console.warn('[yii2-markdown] vditor after init sync failed:', e); }
        // 给工具栏内的切换按钮加上 data-yii2md-action，方便测试选择器定位
        try {
            var switchBtn = document.querySelector('#' + mountId + ' [data-type="switchToCherry"]');
            if (switchBtn) { switchBtn.setAttribute('data-yii2md-action', 'switch'); }
        } catch (e) {}
        if (userAfter) { try { userAfter(); } catch (e) { console.warn(e); } }
    };

    // 合并用户自定义 input 回调并同步到隐藏 textarea
    var userInput = typeof options.input === 'function' ? options.input : null;
    options.input = function(value){
        if (\$input) { \$input.value = value || ''; }
        if (userInput) { try { userInput(value); } catch (e) { console.warn(e); } }
    };

    // ========= 双引擎切换按钮（Vditor 原生 toolbar click，不受事件委托拦截） =========
    options.toolbar = options.toolbar || [];
    options.toolbar.push('|', {
        name: 'switchToCherry',
        tip: '切换到 Markdown',
        tipPosition: 's',
        icon: '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:#2563eb;color:#fff;border-radius:4px;font-size:12px;font-weight:700;font-family:monospace;line-height:1;vertical-align:middle;">M</span>',
        click: function() {
            if (window.Yii2Markdown && window.Yii2Markdown.DualEngine) {
                // 从根容器读取 DualEngine 注册的实例 ID
                var rootEl = document.getElementById(mountId);
                rootEl = rootEl ? rootEl.closest('.yii2-markdown-root') : null;
                var dualId = rootEl ? rootEl.getAttribute('data-instance-id') : null;
                window.Yii2Markdown.DualEngine.switchTo(dualId, 'cherry');
            }
        }
    });

    // customWysiwygToolbar 占位，避免 Vditor WYSIWYG 悬浮工具栏触发时报错
    if (!options.customWysiwygToolbar) {
        options.customWysiwygToolbar = function() {};
    }

    try {
        var instance = new window.Vditor(mountId, options);
        window.vditor_{$this->instanceId} = instance;
    } catch (e) {
        console.error('[yii2-markdown] Vditor init failed:', e);
    }
})();
JS;

        $view->registerJs($js, \yii\web\View::POS_END);

        return $html;
    }
}
