<?php

namespace Tests\Unit\Support\Extensions;

use App\Support\Extensions\CorePlatform;
use PHPUnit\Framework\TestCase;
use Tests\Concerns\MakesComposerProjects;

/**
 * fleetbase/core-platform is what keeps the extensions project from installing a second copy of anything
 * core has, so its contents are asserted exactly.
 */
class CorePlatformTest extends TestCase
{
    use MakesComposerProjects;

    protected function tearDown(): void
    {
        $this->removeProjects();
        parent::tearDown();
    }

    public function test_it_provides_and_conflicts_with_every_non_dev_package_core_installed(): void
    {
        $api = $this->makeCore(installed: [
            'packages' => [
                ['name' => 'laravel/framework', 'version' => '10.x-dev', 'version_normalized' => '10.9999999.9999999.9999999-dev', 'replace' => ['illuminate/support' => 'self.version', 'Illuminate/Bus' => '10.x-dev'], 'provide' => ['psr/log-implementation' => '1.0|2.0|3.0']],
                ['name' => 'Fleetbase/Core-Api', 'version' => '1.6.73', 'version_normalized' => '1.6.73.0'],
                ['name' => 'acme/branch', 'version' => 'dev-main', 'version_normalized' => 'dev-main', 'extra' => ['branch-alias' => ['dev-main' => '2.x-dev']], 'provide' => ['acme/virtual' => 'self.version']],
                ['name' => 'phpunit/phpunit', 'version' => '10.5.0', 'version_normalized' => '10.5.0.0'],
                'not a package',
            ],
            'dev-package-names' => ['PHPUnit/phpunit'],
        ]);

        $platform = json_decode(json_encode(CorePlatform::describe($api)), true);

        $this->assertSame(CorePlatform::PACKAGE, $platform['name']);
        $this->assertSame('metapackage', $platform['type']);
        $this->assertSame('1.0.0', $platform['version']);
        $this->assertSame(['php' => '>=8.0 <8.3'], $platform['require']);
        $this->assertSame([
            'acme/branch'            => 'dev-main || 2.x-dev',
            'acme/virtual'           => 'dev-main || 2.x-dev',
            'fleetbase/core-api'     => '1.6.73.0',
            'illuminate/bus'         => '10.x-dev',
            'illuminate/support'     => '10.9999999.9999999.9999999-dev',
            'laravel/framework'      => '10.9999999.9999999.9999999-dev',
            'psr/log-implementation' => '1.0|2.0|3.0',
        ], $platform['provide']);
        // Virtual packages are provided but never conflicted: an extension may bring another implementation.
        $this->assertSame([
            'acme/branch'        => '*',
            'fleetbase/core-api' => '*',
            'illuminate/bus'     => '*',
            'illuminate/support' => '*',
            'laravel/framework'  => '*',
        ], $platform['conflict']);
    }

    public function test_it_reads_the_older_installed_json_list_and_falls_back_to_the_lock(): void
    {
        $listed = $this->makeCore(installed: [['name' => 'acme/listed', 'version' => '1.0.0', 'version_normalized' => '1.0.0.0']], require: []);
        $this->assertSame(['acme/listed' => '1.0.0.0'], (array) CorePlatform::describe($listed)['provide']);
        $this->assertArrayNotHasKey('require', CorePlatform::describe($listed), 'no php constraint in core, none here');

        $locked = $this->makeCore(lock: ['packages' => [['name' => 'acme/locked', 'version' => 'v2.1.0'], 'junk'], 'packages-dev' => [['name' => 'acme/dev-only', 'version' => '1.0.0']]]);
        $this->assertSame(['acme/locked' => 'v2.1.0'], (array) CorePlatform::describe($locked)['provide']);
    }

    public function test_an_uninstalled_core_is_an_error(): void
    {
        $api = $this->makeCore();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Core is not installed at ' . $api);

        CorePlatform::installedPackages($api);
    }

    public function test_write_creates_the_path_package_and_reports_whether_it_changed(): void
    {
        $api        = $this->makeCore(installed: ['packages' => [['name' => 'acme/one', 'version' => '1.0.0', 'version_normalized' => '1.0.0.0']]]);
        $extensions = $api . '/extensions';

        $this->assertTrue(CorePlatform::write($api, $extensions));
        $file = $extensions . '/core-platform/composer.json';
        $this->assertSame(['acme/one' => '1.0.0.0'], json_decode((string) file_get_contents($file), true)['provide']);
        $this->assertStringEndsWith("}\n", (string) file_get_contents($file));

        $this->assertFalse(CorePlatform::write($api, $extensions), 'same core, same file');

        $this->writeJson($api . '/vendor/composer/installed.json', ['packages' => [['name' => 'acme/one', 'version' => '1.1.0', 'version_normalized' => '1.1.0.0']]]);
        $this->assertTrue(CorePlatform::write($api, $extensions . '/'));
        $this->assertSame(['acme/one' => '1.1.0.0'], json_decode((string) file_get_contents($file), true)['provide']);
    }

    public function test_write_fails_loudly_when_the_folder_or_file_cannot_be_written(): void
    {
        $api = $this->makeCore(installed: ['packages' => []]);

        file_put_contents($api . '/not-a-directory', 'x');
        try {
            CorePlatform::write($api, $api . '/not-a-directory');
            $this->fail('expected a RuntimeException');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Could not create', $e->getMessage());
        }

        mkdir($api . '/extensions/core-platform/composer.json', 0775, true);
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Could not write');

        CorePlatform::write($api, $api . '/extensions');
    }
}
