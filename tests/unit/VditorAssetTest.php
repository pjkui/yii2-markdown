<?php

namespace pjkui\markdown\tests\unit;

use pjkui\markdown\VditorAsset;
use pjkui\markdown\tests\TestCase;

/**
 * 单元测试：VditorAsset —— 资源路径 / 入口文件声明 / 发布白名单
 *
 * U1：sourcePath 指向 src/dist/vditor
 * U2：js 清单包含 vditor.min.js
 * U3：css 清单包含 vditor.min.css
 * U4：publishOptions.only 覆盖 lute 运行时所需的 dist 子目录
 * U5：实际文件在磁盘上存在（从 CDN 预拉到仓库）
 */
class VditorAssetTest extends TestCase
{
    public function testSourcePathPointsToVditorDir(): void
    {
        // Yii 的 AssetBundle::init() 会把 @alias 解析成绝对路径，
        // 所以这里用 ReflectionProperty 直接读取类声明时的默认值。
        $prop = new \ReflectionProperty(VditorAsset::class, 'sourcePath');
        $defaults = $prop->getDeclaringClass()->getDefaultProperties();
        $this->assertSame('@pjkui/markdown/dist/vditor', $defaults['sourcePath']);

        // 实例化后，解析后的路径也应指向 src/dist/vditor（绝对路径）
        $bundle = new VditorAsset();
        $this->assertStringEndsWith('/src/dist/vditor', $bundle->sourcePath);
    }

    public function testJsListsVditorMinJs(): void
    {
        $bundle = new VditorAsset();
        $this->assertContains('vditor.min.js', $bundle->js);
    }

    public function testCssListsVditorMinCss(): void
    {
        $bundle = new VditorAsset();
        $this->assertContains('vditor.min.css', $bundle->css);
    }

    public function testPublishOptionsWhitelistsLuteRuntime(): void
    {
        $bundle = new VditorAsset();
        $this->assertIsArray($bundle->publishOptions);
        $this->assertArrayHasKey('only', $bundle->publishOptions);
        $only = $bundle->publishOptions['only'];
        // 必须允许发布 dist/ 下子目录（lute.min.js 位于 dist/js/lute/）
        $hasDistGlob = false;
        foreach ($only as $pattern) {
            if (strpos($pattern, 'dist/') === 0) {
                $hasDistGlob = true;
                break;
            }
        }
        $this->assertTrue($hasDistGlob, 'publishOptions.only 必须包含 dist/ 前缀的通配符以发布 lute 运行时');
    }

    public function testVditorAssetsExistOnDisk(): void
    {
        $root = dirname(__DIR__, 2) . '/src/dist/vditor';
        $this->assertFileExists($root . '/vditor.min.js', 'vditor.min.js 必须已从 CDN 预拉到仓库');
        $this->assertFileExists($root . '/vditor.min.css', 'vditor.min.css 必须已从 CDN 预拉到仓库');
        $this->assertFileExists($root . '/dist/js/lute/lute.min.js', 'lute.min.js 必须已从 CDN 预拉到仓库');

        // 粗略校验文件非空
        $this->assertGreaterThan(10000, filesize($root . '/vditor.min.js'));
        $this->assertGreaterThan(10000, filesize($root . '/vditor.min.css'));
        $this->assertGreaterThan(100000, filesize($root . '/dist/js/lute/lute.min.js'));
    }
}
