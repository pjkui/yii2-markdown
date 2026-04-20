<?php

namespace pjkui\markdown\tests;

use yii\web\View;

abstract class TestCase extends \PHPUnit\Framework\TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        \Yii::$app->set('view', new View());
    }
}
