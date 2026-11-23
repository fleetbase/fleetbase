<?php

namespace Tests\Unit\Support\Extensions;

use App\Support\Extensions\ExtensionsPackageManifest;
use Illuminate\Filesystem\Filesystem;
use PHPUnit\Framework\TestCase;
use Tests\Concerns\MakesComposerProjects;

class ExtensionsPackageManifestTest extends TestCase
{
    use MakesComposerProjects;

    protected function tearDown(): void
    {
        $this->removeProjects();
        parent::tearDown();
    }

    private function manifest(string $api): ExtensionsPackageManifest
    {
        @mkdir($api . '/bootstrap/cache', 0775, true);

        return new ExtensionsPackageManifest(new Filesystem(), $api, $api . '/bootstrap/cache/packages.php', $api . '/extensions');
    }

    public function test_it_discovers_packages_from_both_projects_with_core_first(): void
    {
        $api = $this->makeCore(installed: ['packages' => [
            ['name' => 'fleetbase/core-api', 'extra' => ['laravel' => ['providers' => ['Core\\Provider']]]],
            ['name' => 'acme/both', 'extra' => ['laravel' => ['providers' => ['Core\\Copy']]]],
            ['name' => 'acme/no-laravel'],
            ['name' => 'acme/ignored-by-core', 'extra' => ['laravel' => ['providers' => ['Ignored\\Provider']]]],
        ]], extra: ['extra' => ['laravel' => ['dont-discover' => ['acme/ignored-by-core']]]]);
        $this->writeJson($api . '/extensions/composer.json', ['extra' => ['laravel' => ['dont-discover' => ['acme/ignored-by-manifest']]]]);
        $this->writeJson($api . '/extensions/vendor/composer/installed.json', ['packages' => [
            ['name' => 'fleetbase/fleetops-api', 'extra' => ['laravel' => ['providers' => ['FleetOps\\Provider'], 'aliases' => ['FleetOps' => 'FleetOps\\Facade'], 'dont-discover' => ['acme/ignored-by-package']]]],
            ['name' => 'acme/both', 'extra' => ['laravel' => ['providers' => ['Extension\\Copy']]]],
            ['name' => 'acme/ignored-by-manifest', 'extra' => ['laravel' => ['providers' => ['Ignored\\Two']]]],
            ['name' => 'acme/ignored-by-package', 'extra' => ['laravel' => ['providers' => ['Ignored\\Three']]]],
            'not a package',
        ]]);

        $manifest = $this->manifest($api);

        $this->assertSame(['Core\\Provider', 'Core\\Copy', 'FleetOps\\Provider'], array_values($manifest->providers()));
        $this->assertSame(['FleetOps' => 'FleetOps\\Facade'], $manifest->aliases());
        $this->assertSame(['fleetbase/core-api', 'acme/both', 'fleetbase/fleetops-api'], array_keys(require $api . '/bootstrap/cache/packages.php'));
    }

    public function test_dont_discover_star_ignores_everything_and_missing_vendors_discover_nothing(): void
    {
        $api = $this->makeCore(installed: ['packages' => [['name' => 'acme/one', 'extra' => ['laravel' => ['providers' => ['One']]]]]]);
        $this->writeJson($api . '/extensions/composer.json', ['extra' => ['laravel' => ['dont-discover' => ['*']]]]);
        $this->assertSame([], $this->manifest($api)->providers());

        $bare = $this->makeCore();
        file_put_contents($bare . '/vendor-garbage.json', '');
        $this->assertSame([], $this->manifest($bare)->providers());

        $broken = $this->makeCore();
        @mkdir($broken . '/vendor/composer', 0775, true);
        file_put_contents($broken . '/vendor/composer/installed.json', 'not json');
        $this->assertSame([], $this->manifest($broken)->providers());
    }

    public function test_a_cached_manifest_older_than_either_installed_json_is_rebuilt(): void
    {
        $api = $this->makeCore(installed: ['packages' => [['name' => 'fleetbase/core-api', 'extra' => ['laravel' => ['providers' => ['Core\\Provider']]]]]]);
        $this->writeJson($api . '/extensions/vendor/composer/installed.json', ['packages' => [['name' => 'fleetbase/fleetops-api', 'extra' => ['laravel' => ['providers' => ['FleetOps\\Provider']]]]]]);
        $this->manifest($api)->build();
        $cached = $api . '/bootstrap/cache/packages.php';

        // Everything older than the cache: it is used as it is.
        foreach ([$api . '/vendor/composer/installed.json', $api . '/extensions/vendor/composer/installed.json', $api . '/extensions'] as $path) {
            touch($path, time() - 60);
        }
        $this->assertFalse($this->manifest($api)->isStale());

        // The extension is removed from its vendor; the cache still lists its provider.
        $this->writeJson($api . '/extensions/vendor/composer/installed.json', ['packages' => []]);
        touch($cached, time() - 30);

        $manifest = $this->manifest($api);
        $this->assertTrue($manifest->isStale());
        $this->assertSame(['Core\\Provider'], array_values($manifest->providers()));
        $this->assertSame(['fleetbase/core-api'], array_keys(require $cached));
    }

    public function test_removing_the_extensions_vendor_folder_also_invalidates_the_cache(): void
    {
        $api = $this->makeCore(installed: ['packages' => []]);
        mkdir($api . '/extensions', 0775, true);
        $this->manifest($api)->build();
        touch($api . '/vendor/composer/installed.json', time() - 60);
        touch($api . '/bootstrap/cache/packages.php', time() - 30);

        touch($api . '/extensions');

        $this->assertTrue($this->manifest($api)->isStale());
    }

    public function test_without_a_cached_manifest_it_is_not_stale_but_built_on_first_use(): void
    {
        $api      = $this->makeCore(installed: ['packages' => [['name' => 'acme/one', 'extra' => ['laravel' => ['providers' => ['One']]]]]]);
        $manifest = $this->manifest($api);

        $this->assertFalse($manifest->isStale());
        $this->assertSame(['One'], $manifest->providers());
        $this->assertFileExists($api . '/bootstrap/cache/packages.php');
    }
}
