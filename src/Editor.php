<?php

namespace pjkui\markdown;
use yii\base\Widget;
use yii\base\Model;
use yii\helpers\ArrayHelper;
use yii\helpers\Html;
use Yii;

/**
 * This is just an example.
 */
class Editor extends Widget
{
    static public $INSTANCE_ID = 1;
    const DIV = 'div';
    const TEXTAREA = 'textarea';

    /**
     * 是否按 Markdown 模式（Cherry）渲染。
     *  - true（默认）：保持原有 Cherry Markdown 行为。
     *  - false：顶层直接转交给 {@see VditorEditor} 渲染所见即所得（WYSIWYG）UI。
     *
     * @var bool
     */
    public $isMarkdown = true;

    public $tagId = '';

    /**
     * @var Model the data model that this widget is associated with.
     */
    public $model;
    /**
     * @var string the model attribute that this widget is associated with.
     */
    public $attribute;
    /**
     * @var string the input value.
     */
    public $value;

    /**
     * it should only be div or textarea
     */
    public $tagType = '';

    /**
     * @see \yii\helpers\BaseHtml::renderTagAttributes()
     */
    public $tagAttribute = [];

    /**
     * default value of editor
     */
    public $defaultValue = '';

    /**
     * selector of editor
     */
    public $selector = '';

    /**
     * @var int 编辑器实例id
     */
    public $instanceId = 0;

    /**
     * options of Markdown editor
     *
     * example
     * ```
      * [
      * 'id'=> 'markdown',
      * 'externals'=> [
      *   'echarts'=> 'window.echarts',
      *   'katex'=> 'window.katex',
      *   'MathJax'=> 'window.MathJax',
      * ],
      * 'isPreviewOnly'=> false,
      * 'engine'=> [
      *   'global'=> [
      *     'urlProcessor(url, srcType) {
      *       console.log(`url-processor`, url, srcType);
      *       return url;
      *     }',
      *  ],
      *   'syntax'=> [
      *     'table'=> [
      *       'enableChart'=> false,
      *       // chartEngine: Engine Class
      *     ],
      *     'fontEmphasis'=> [
      *       'allowWhitespace'=> true, // 是否允许首尾空格
      *     ],
      *     'mathBlock'=> [
      *       'engine'=> 'MathJax', // katex或MathJax
      *       'src'=> 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js', // 如果使用MathJax plugins，则需要使用该url通过script标签引入
      *     ],
      *     'inlineMath'=> [
      *       'engine'=> 'MathJax', // katex或MathJax
      *     ],
      *     'emoji'=> [
      *       'useUnicode'=> false,
      *       'customResourceURL'=> 'https://github.githubassets.com/images/icons/emoji/unicode/$[code].png?v8',
      *       'upperCase'=> true,
      *     ],
      *     // toc=> [
      *     //     tocStyle=> 'nested'
      *     // ]
      *     // 'header'=> [
      *     //   strict=> false
      *     // ]
      *   ],
      *   'customSyntax'=> [
      *     // SyntaxHookClass
      *     'CustomHook'=> [
      *       'syntaxClass'=> 'CustomHookA',
      *       'force'=> false,
      *       'after'=> 'br',
      *     ],
      *   ],
      * ],
      * 'toolbars'=> [
      *   'toolbar'=> [
      *     'bold',
      *     'italic',
      *     'strikethrough',
      *     '|',
      *     'color',
      *     'header',
      *     '|',
      *     'list',
      *     [
      *       'insert'=> ['image', 'audio', 'video', 'link', 'hr', 'br', 'code', 'formula', 'toc', 'table', 'pdf', 'word'],
      *     ],
      *     'graph',
      *     'togglePreview',
      *     'settings',
      *     'switchModel',
      *     'codeTheme',
      *     'export',
      *   ],
      *   'sidebar'=> ['mobilePreview', 'copy'],
      * ],
      * 'editor'=> [
      *   'defaultModel'=> 'edit&preview',
      * ],
      * 'previewer'=> [
      *   // 自定义markdown预览区域class
      *   // className=> 'markdown'
      * ],
      * 'keydown'=> [],
      * //extensions=> [],
      *]
    * ```
    *
    * @see https://github.com/Tencent/cherry-markdown/blob/HEAD/docs/extensions.md
    * @see https://github.com/Tencent/cherry-markdown/blob/main/docs/configuration.CN.md
    * @see https://github.com/Tencent/cherry-markdown/blob/main/docs/configuration.md
    */
    public $options = [];


    /**
     * @return bool whether this widget is associated with a data model.
     */
    protected function hasModel()
    {
        return $this->model instanceof Model && $this->attribute !== null;
    }

    protected function getDefaultConfig(){

        $options = [
               'id'=> $this->selector,
               'externals'=> [
                 'echarts'=> 'window.echarts',
                 'katex'=> 'window.katex',
                 'MathJax'=> 'window.MathJax',
               ],
               'isPreviewOnly'=> false,
               'engine'=> [
//                 'global'=> [
//                   'urlProcessor(url, srcType) {
//                     console.log(`url-processor`, url, srcType);
//                     return url;
//                   }',
//                ],
                 'syntax'=> [
                   'table'=> [
                     'enableChart'=> false,
                     // chartEngine: Engine Class
                   ],
                   'fontEmphasis'=> [
                     'allowWhitespace'=> true, // 是否允许首尾空格
                   ],
                   'mathBlock'=> [
                     'engine'=> 'MathJax', // katex或MathJax
                     'src'=> 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js', // 如果使用MathJax plugins，则需要使用该url通过script标签引入
                   ],
                   'inlineMath'=> [
                     'engine'=> 'MathJax', // katex或MathJax
                   ],
                   'emoji'=> [
                     'useUnicode'=> false,
                     'customResourceURL'=> 'https://github.githubassets.com/images/icons/emoji/unicode/$[code].png?v8',
                     'upperCase'=> true,
                   ],
                   // toc=> [
                   //     tocStyle=> 'nested'
                   // ]
                   // 'header'=> [
                   //   strict=> false
                   // ]
                 ],
                 'customSyntax'=> new \stdClass(),
               ],
               'toolbars'=> [
                 'toolbar'=> [
                   'undo',
                   'redo',
                   '|',
                   'header',
                   'bold',
                   'italic',
                   'strikethrough',
                   '|',
                   'color',
                   'size',
                   '|',
                   'list',
                   [
                     'insert'=> ['checklist', 'quote', 'hr', 'image', 'audio', 'video', 'link', 'br', 'code', 'formula', 'toc', 'table', 'line-table', 'bar-table', 'pdf', 'word'],
                   ],
                   '|',
                   'graph',
                   '|',
                   'codeTheme',
                   'export',
                   'settings',
                 ],
                 'toolbarRight'=> ['fullScreen'],
                 'sidebar'=> ['mobilePreview', 'copy', 'theme'],
                 'bubble'=> ['bold', 'italic', 'underline', 'strikethrough', 'sub', 'sup', 'quote', '|', 'size', 'color'],
                 'float'=> ['h1', 'h2', 'h3', '|', 'checklist', 'quote', 'table', 'code'],
               ],
               'editor'=> [
                 'defaultModel'=> 'edit&preview',
                   'height'=>'620px',
                   'convertWhenPaste'=> true,
               ],
               'previewer'=> new \stdClass(),
               //extensions=> [],
            ];
        $this->options = ArrayHelper::merge($options, $this->options);
    }


    /**
     * return editor toolbar
     *
     * @param array|null $toolbars
     * @return string
     * @see https://www.tiny.cloud/docs/configure/editor-appearance/#toolbar
     */
    public static function MKDEditorToolbars($toolbars = null)
    {
        if ($toolbars === null) {
            $toolbars = [
                'toolbar'=> [
                  'undo',
                  'redo',
                  '|',
                  'header',
                  'bold',
                  'italic',
                  'strikethrough',
                  '|',
                  'color',
                  'size',
                  '|',
                  'list',
                  [
                    'insert'=> ['checklist', 'quote', 'hr', 'image', 'audio', 'video', 'link', 'br', 'code', 'formula', 'toc', 'table', 'line-table', 'bar-table', 'pdf', 'word'],
                  ],
                  '|',
                  'graph',
                  'switchModel',
                  'codeTheme',
                  'export',
                  'settings',
                ],
                'toolbarRight'=> ['fullScreen'],
                'sidebar'=> ['mobilePreview', 'copy', 'theme'],
                'bubble'=> ['bold', 'italic', 'underline', 'strikethrough', 'sub', 'sup', 'quote', '|', 'size', 'color'],
                'float'=> ['h1', 'h2', 'h3', '|', 'checklist', 'quote', 'table', 'code'],
            ];
        }
        return $toolbars;
        // return join(' | ', array_map(function ($item) {
        //     return join(' ', $item);
        // }, $toolbars));
    }

    /**
     * {@inheritdoc}
     */
    public function init()
    {
        // 非 Markdown 模式：标记为路由到 Vditor，run() 中直接把输出交给 VditorEditor
        if ($this->isMarkdown === false) {
            parent::init();
            return;
        }

        $this->instanceId = ++Editor::$INSTANCE_ID;
        $this->selector = 'cherry'. $this->instanceId;

        $this->getDefaultConfig();
        if (!empty($this->tagId)) {
            $this->setId($this->tagId);
        }

        if (empty($this->tagAttribute['id'])) {
            $this->tagAttribute['id'] = $this->hasModel() ? Html::getInputId($this->model, $this->attribute) : $this->getId();
        }
        if (empty($this->tagAttribute['name'])) {
            $this->tagAttribute['name'] = $this->hasModel() ? Html::getInputName($this->model, $this->attribute) : $this->tagAttribute['id'];
        }
        if (!empty($this->tagAttribute['id'])) {
            $this->options['selector'] = '#' . $this->tagAttribute['id'];
        }
        if (!empty($this->selector)) {
            $this->options['selector'] = $this->selector;
        }
        if (empty($this->tagType)) {
//            $this->tagType = self::TEXTAREA;
            $this->tagType = self::DIV;
        }
        // 设置cherry渲染的id
        $this->options['id'] = $this->selector;

        if (!isset($this->options['toolbars'])) {
            $this->options['toolbars'] = self::MKDEditorToolbars();
        } else {
            $this->options['toolbars'] = self::MKDEditorToolbars($this->options['toolbars']);
        }
        if (!isset($this->options['relative_urls'])) {
            $this->options['relative_urls'] = false;
        }

        if (empty($this->defaultValue) && $this->hasModel()) {
            $arr = $this->model->getAttributes([$this->attribute]);
            if (isset($arr[$this->attribute])) {
                $this->defaultValue = $arr[$this->attribute];
            }
            // $this->defaultValue = $this->value;
        }

        parent::init();
    }

    /**
     * {@inheritdoc}
     */
    public function run()
    {
        // 路由：WYSIWYG 模式直接委托给 VditorEditor
        if ($this->isMarkdown === false) {
            return VditorEditor::widget([
                'name' => isset($this->tagAttribute['name']) ? $this->tagAttribute['name'] : '',
                'model' => $this->model,
                'attribute' => $this->attribute,
                'value' => $this->defaultValue !== '' ? $this->defaultValue : (string) $this->value,
                'options' => [],
                'clientOptions' => isset($this->options['vditor']) && is_array($this->options['vditor']) ? $this->options['vditor'] : [],
                'uploadUrl' => isset($this->options['url']) ? (string) $this->options['url'] : '',
                'uploadExtra' => isset($this->options['extra']) && is_array($this->options['extra']) ? $this->options['extra'] : [],
            ]);
        }

        if (!($this->tagType == self::DIV || $this->tagType == self::TEXTAREA)) {
            return '<span>error tag</span>';
        }

        $view = $this->getView();

        $error = $this->registerPlugin($view);
        if ($error !== null) {
            return '<span>' . $error . '</span>';
        }

//        if ($this->tagType == self::TEXTAREA) {
//            $tagName = '';
//            if (!empty($this->tagAttribute['name'])) {
//                $tagName = $this->tagAttribute['name'];
//            }
//            return Html::textArea($tagName, $this->defaultValue, $this->tagAttribute);
//        }
        $tagName = '';
        if (!empty($this->tagAttribute['name'])) {
            $tagName = $this->tagAttribute['name'];
        }
        $this->tagAttribute['hidden']='hidden';

        $html = Html::beginTag('div', [
            'class' => 'yii2-markdown-root yii2-markdown-root--cherry',
            'data-engine' => 'cherry',
            'data-is-markdown' => '1',
            'data-instance-id' => (string) $this->instanceId,
        ]);
        $html .= Html::textarea($tagName, $this->defaultValue, $this->tagAttribute);
        $html .=Html::tag('div', '', ['id'=>$this->selector]);
        $html .= Html::endTag('div');
        return $html;
    }

    protected function registerPlugin($view)
    {
        if (empty($this->options['selector'])) {
            return 'missing attribute selector';
        }
        EditorAsset::register($view);
        $js = '';
        // 准备需要传入 JS 的配置（去除不属于 Cherry 的字段）
        $cherryConfig = $this->options;
        unset($cherryConfig['url'], $cherryConfig['extra'], $cherryConfig['lang'], $cherryConfig['selector'], $cherryConfig['relative_urls']);
        $basicConfig = json_encode($cherryConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $valueConfig = json_encode($this->defaultValue, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $instance_id = $this->instanceId;
        $selector_id = $this->tagAttribute['id'];
        $url = isset($this->options['url']) ? $this->options['url'] : '';
        $extra = json_encode(isset($this->options['extra']) ? $this->options['extra'] : new \stdClass(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        // 草稿 key：按页面路径 + 字段 id，避免多文档冲突
        $pathPart = '';
        try {
            if (Yii::$app->has('request') && Yii::$app->request instanceof \yii\web\Request) {
                $pathPart = Yii::$app->request->pathInfo;
            }
        } catch (\Throwable $e) {
            $pathPart = '';
        }
        $draftKey = 'md_draft_' . md5($pathPart . '|' . $selector_id);
        $js .= <<<EOF
(function(){
    var conf = {$basicConfig};
    var UPLOAD_URL = "{$url}";
    var UPLOAD_EXTRA = {$extra};
    var DRAFT_KEY = "{$draftKey}";
    var \$input = document.getElementById("{$selector_id}");
    var originalValue = {$valueConfig} || "";

    // ========= 文件上传（工具栏/粘贴/拖放通用） =========
    conf['fileUpload'] = function(file, callback){
        window.markdownUploadFile(file, {url: UPLOAD_URL, extra: UPLOAD_EXTRA}, function(url){
            callback(url, { name: file.name, isBorder: false, isShadow: false, isRadius: false });
        }, function(err){
            console.error('[Markdown] 上传失败:', err);
            if (window.UIkit && UIkit.notification) {
                UIkit.notification({message: '文件上传失败: ' + err, status: 'danger'});
            } else {
                alert('文件上传失败: ' + err);
            }
        });
    };

    // ========= 深色模式跟随（项目 data-theme） =========
    var htmlEl = document.documentElement;
    var bodyTheme = htmlEl.getAttribute('data-theme') || (document.body && document.body.getAttribute('data-theme'));
    conf['themeSettings'] = conf['themeSettings'] || {};
    if (bodyTheme === 'dark') {
        conf['themeSettings']['mainTheme'] = 'dark';
    }

    // ========= 恢复草稿（优先原值，若本地有较新草稿则提示恢复） =========
    var initValue = originalValue;
    try {
        var saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
            var draft = JSON.parse(saved);
            if (draft && draft.content && draft.content !== originalValue) {
                // 延迟提示：Cherry 初始化后再问
                setTimeout(function(){
                    var tip = '检测到本地未提交的草稿（' + new Date(draft.time).toLocaleString() + '），是否恢复？';
                    if (confirm(tip)) {
                        window['cherry{$instance_id}'].setMarkdown(draft.content);
                        if (\$input) \$input.value = draft.content;
                    } else {
                        localStorage.removeItem(DRAFT_KEY);
                    }
                }, 300);
            }
        }
    } catch(e) { console.warn('[Markdown] 草稿读取失败:', e); }

    // ========= 双引擎切换按钮：Cherry 渲染后注入到工具栏 =========
    // 不使用 createMenuHook（与部分版本不兼容），改用 afterInit 回调手动注入 DOM
    conf.toolbars = conf.toolbars || {}
    conf.toolbars.toolbar = conf.toolbars.toolbar || []

    var _afterInit = conf.afterInit || function() {}
    // 不依赖 afterInit（部分版本不支持），改用实例化后延迟注入
    conf.afterInit = function() {
        _afterInit.call(this)
    }

    // ========= 实例化 =========
    var config = Object.assign({}, conf, { value: initValue });
    var cherry = new Cherry(config);
    window.cherry{$instance_id} = cherry;

    // ========= 双引擎切换按钮：注入到 Cherry 工具栏 =========
    try {
        var toolbar = document.querySelector('#cherry{$instance_id} .cherry-toolbar .toolbar-left');
        if (toolbar) {
            var btn = document.createElement('span');
            btn.className = 'cherry-toolbar-button yii2md-switch-badge';
            btn.title = '切换到所见即所得';
            btn.setAttribute('data-yii2md-action', 'switch');
            btn.textContent = 'V';
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', function() {
                if (window.Yii2Markdown && window.Yii2Markdown.DualEngine) {
                    window.Yii2Markdown.DualEngine.switchTo({$instance_id}, 'vditor');
                }
            });
            toolbar.appendChild(btn);
        }
    } catch(e) { console.warn('[yii2markdown] 切换按钮注入失败:', e); }

    // ========= 变更同步 + 自动保存 + 字数统计 =========
    var saveTimer = null;
    var isDirty = false;
    var statusBar = document.createElement('div');
    statusBar.className = 'md-editor-status';
    statusBar.innerHTML = '<span class="md-words">字数：0</span><span class="md-draft-status"></span><span class="md-shortcuts">Ctrl/⌘+S 保存 · Ctrl+B 粗体 · Ctrl+I 斜体 · Ctrl+K 链接</span>';
    var editorWrap = cherry.wrapperDom || cherry.cherryDom || document.querySelector('#cherry{$instance_id} .cherry') || document.getElementById('cherry{$instance_id}');
    if (editorWrap && editorWrap.parentNode) {
        editorWrap.parentNode.insertBefore(statusBar, editorWrap.nextSibling);
    }

    function countWords(text) {
        if (!text) return 0;
        // 中文按字符，英文按单词
        var cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        var en = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/\b\w+\b/g) || []).length;
        return cn + en;
    }

    cherry.onChange(function(v){
        var md = v.markdown || '';
        if (\$input) \$input.value = md;
        isDirty = (md !== originalValue);
        var wordsEl = statusBar.querySelector('.md-words');
        if (wordsEl) wordsEl.textContent = '字数：' + countWords(md);
        // 防抖自动保存到 LocalStorage
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(function(){
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify({content: md, time: Date.now()}));
                var st = statusBar.querySelector('.md-draft-status');
                if (st) {
                    st.textContent = '已保存草稿 ' + new Date().toLocaleTimeString();
                    st.classList.add('saved');
                }
            } catch(e) {}
        }, 800);
    });

    // 初始字数
    setTimeout(function(){
        var md = cherry.getMarkdown() || '';
        var wordsEl = statusBar.querySelector('.md-words');
        if (wordsEl) wordsEl.textContent = '字数：' + countWords(md);
    }, 100);

    // ========= 快捷键 Ctrl+S 提交 =========
    document.addEventListener('keydown', function(e){
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            var form = \$input ? \$input.closest('form') : null;
            if (form) {
                e.preventDefault();
                // 触发提交按钮点击，保证 ActiveForm 校验
                var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
                if (submitBtn) { submitBtn.click(); } else { form.submit(); }
            }
        }
    });

    // ========= 离开页面未保存提醒 =========
    window.addEventListener('beforeunload', function(e){
        if (isDirty) {
            e.preventDefault();
            e.returnValue = '您有未保存的修改，确定离开吗？';
            return e.returnValue;
        }
    });

    // ========= 提交成功后清除草稿 =========
    if (\$input) {
        var form = \$input.closest('form');
        if (form) {
            form.addEventListener('submit', function(){
                isDirty = false;
                try { localStorage.removeItem(DRAFT_KEY); } catch(e){}
            });
        }
    }
})();
EOF;

        $view->registerJs($js, \yii\web\View::POS_END);
        // 状态栏 + 切换按钮样式
        $view->registerCss(<<<CSS
.md-editor-status{display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:6px 12px;font-size:12px;color:#6b7280;background:#fafafa;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 4px 4px}
.md-editor-status .md-draft-status{color:#10b981}
.md-editor-status .md-draft-status.saved::before{content:"● "}
.md-editor-status .md-shortcuts{margin-left:auto;color:#9ca3af}
.cherry-toolbar-button.yii2md-switch-badge{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:#2563eb;color:#fff;border-radius:4px;font-size:12px;font-weight:700;font-family:monospace;line-height:1;margin-left:2px;transition:background .15s,transform .1s;user-select:none}
.cherry-toolbar-button.yii2md-switch-badge:hover{background:#1d4ed8;transform:scale(1.1)}
[data-theme="dark"] .cherry-toolbar-button.yii2md-switch-badge{background:#3b82f6}
[data-theme="dark"] .cherry-toolbar-button.yii2md-switch-badge:hover{background:#60a5fa}
[data-theme="dark"] .md-editor-status{background:#1f2937;border-color:#374151;color:#9ca3af}
[data-theme="dark"] .md-editor-status .md-shortcuts{color:#6b7280}
@media (max-width: 768px){
    .md-editor-status .md-shortcuts{display:none}
    .cherry{--cherry-header-height: auto}
    .cherry-toolbar{flex-wrap:wrap}
}
CSS
        );

        return null;
    }
}


