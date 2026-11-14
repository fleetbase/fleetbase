<?php

namespace Tests\Unit\Support\Extensions;

use App\Support\Extensions\Extensions;
use App\Support\Extensions\ExtensionsPackageManifest;
use Composer\Autoload\ClassLoader;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\PackageManifest;
use PHPUnit\Framework\TestCase;
use Tests\Concerns\MakesComposerProjects;

class ExtensionsTest extends TestCase
{
    use MakesComposerProjects;

    private ?ClassLoader $loaded = null;

    protected function tearDown(): void
    {
        $this->loaded?->unregister();
        $this->removeProjects();
        parent::tearDown();
    }

    public function test_the_application_boots_with_the_extensions_path_and_package_manifest_bound(): void
    {
        $app = require __DIR__ . '/../../../../bootstrap/app.php';

        $this->assertSame($app->basePath('extensions'), $app->make('path.extensions'));
        $this->assertInstanceOf(ExtensionsPackageManifest::class, $app->make(PackageManifest::class));
        $this->assertSame($app->basePath('extensions'), $app->make(PackageManifest::class)->extensionsPath);
    }

    public function test_register_binds_a_given_path_and_loads_nothing_without_a_vendor(): void
    {
        $root = $this->makeCore();
        $app  = new Application($root);

        Extensions::register($app, $root . '/elsewhere/');

        $this->assertSame($root . '/elsewhere', $app->make('path.extensions'));
        $this->assertSame($root . '/elsewhere', $app->make(PackageManifest::class)->extensionsPath);
        $this->assertNull(Extensions::loadAutoloader($root . '/elsewhere'));
    }

    public function test_the_extensions_autoloader_is_registered_after_cores(): void
    {
        $root   = $this->makeCore();
        $vendor = $root . '/extensions/vendor';
        mkdir($vendor . '/acme/src', 0775, true);
        file_put_contents($vendor . '/acme/src/ExtensionsTestFixture.php', '<?php namespace AcmeExtensionsTest; class ExtensionsTestFixture {}');
        // What Composer's autoload.php does: build a loader and register it in front of the others.
        file_put_contents($vendor . '/autoload.php', sprintf(
            '<?php $loader = new \Composer\Autoload\ClassLoader(%s); $loader->addPsr4("AcmeExtensionsTest\\\\", %s); $loader->register(true); return $loader;',
            var_export($vendor, true),
            var_export($vendor . '/acme/src', true),
        ));

        $this->loaded = Extensions::loadAutoloader($root . '/extensions');

        $this->assertInstanceOf(ClassLoader::class, $this->loaded);
        $this->assertSame($vendor, array_key_last(ClassLoader::getRegisteredLoaders()), 'searched after every loader registered before it');
        $this->assertTrue(class_exists('AcmeExtensionsTest\\ExtensionsTestFixture'));
    }

    public function test_an_autoload_file_that_returns_no_loader_is_ignored(): void
    {
        $root = $this->makeCore();
        mkdir($root . '/extensions/vendor', 0775, true);
        file_put_contents($root . '/extensions/vendor/autoload.php', '<?php return null;');

        $this->assertNull(Extensions::loadAutoloader($root . '/extensions'));
    }
}
