<?php

namespace pjkui\markdown;
use yii\base\Widget;
use yii\base\Model;
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
        if($this->options != null && count($this->options) == 0){
            return;
        }
        $this->options = [
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
                 'customSyntax'=> [
                   // SyntaxHookClass
//                   'CustomHook'=> [
//                     'syntaxClass'=> 'CustomHookA',
//                     'force'=> false,
//                     'after'=> 'br',
//                   ],
                 ],
               ],
               'toolbars'=> [
                 'toolbar'=> [
                   'bold',
                   'italic',
                   'strikethrough',
                   '|',
                   'color',
                   'header',
                   '|',
                   'list',
                   [
                     'insert'=> ['image', 'audio', 'video', 'link', 'hr', 'br', 'code', 'formula', 'toc', 'table', 'pdf', 'word'],
                   ],
                   'graph',
                   'togglePreview',
                   'settings',
                   'switchModel',
                   'codeTheme',
                   'export',
                 ],
                 'sidebar'=> ['mobilePreview', 'copy'],
               ],
               'editor'=> [
                 'defaultModel'=> 'edit&preview',
                   'height'=>'80vh'
               ],
               'previewer'=> [
                 // 自定义markdown预览区域class
                 // className=> 'markdown'
               ],
               'keydown'=> [],
               //extensions=> [],
            ];
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
                  'bold',
                  'italic',
                  'strikethrough',
                  '|',
                  'color',
                  'header',
                  '|',
                  'list',
                  [
                    'insert'=> ['image', 'audio', 'video', 'link', 'hr', 'br', 'code', 'formula', 'toc', 'table', 'pdf', 'word'],
                  ],
                  'graph',
                  'togglePreview',
                  'settings',
                  'switchModel',
                  'codeTheme',
                  'export',
                ],
                'sidebar'=> ['mobilePreview', 'copy'],
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

        $html = Html::beginTag('div');
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
        $basicConfig = json_encode($this->options);
        $valueConfig = json_encode($this->defaultValue);
        $instance_id = $this->instanceId;
        $selector_id = $this->tagAttribute['id'];
        $js .= <<<EOF
            var conf = ${basicConfig};
            var config = Object.assign({}, conf, { value: ${valueConfig} });
            var cherry = new Cherry(config);
            cherry.onChange((v1)=>{
                console.log(v1, `${selector_id}`);
                $('#${selector_id}').val(v1.markdown);
            });
            window.cherry${instance_id} = cherry;
EOF;

        $view->registerJs($js);

        return null;
    }
}


