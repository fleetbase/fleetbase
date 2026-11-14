<?php

namespace Tests\Unit\Console\Commands;

use App\Console\Commands\ExtensionsMigrateManifest;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Tests\Concerns\MakesComposerProjects;
use Tests\TestCase;

/**
 * An instance installed before the extensions manifest: FleetOps and Pallet in core's composer.json, plus
 * an extension an upgrade left behind in api/vendor (in vendor, no longer in composer.lock).
 */
class ExtensionsMigrateManifestTest extends TestCase
{
    use MakesComposerProjects;

    private string $api;

    protected function setUp(): void
    {
        parent::setUp();

        $requiresCore = ['fleetbase/core-api' => '^1.6'];
        $this->api    = $this->makeCore(
            installed: ['packages' => [
                ['name' => 'fleetbase/core-api', 'version' => '1.6.73', 'version_normalized' => '1.6.73.0'],
                ['name' => 'fleetbase/registry-bridge', 'version' => '0.2.0', 'require' => $requiresCore],
                ['name' => 'fleetbase/fleetops-api', 'version' => '0.6.74', 'require' => $requiresCore],
                ['name' => 'fleetbase/pallet-api', 'version' => 'v0.1.3', 'require' => $requiresCore],
                ['name' => 'acme/left-behind-api', 'version' => '2.0.0', 'require' => $requiresCore],
                ['name' => 'laravel/framework', 'version' => '10.x-dev'],
                ['name' => 'acme/helper', 'version' => '1.0.0'],
            ]],
            lock: ['packages' => [['name' => 'fleetbase/core-api'], ['name' => 'fleetbase/registry-bridge'], ['name' => 'fleetbase/fleetops-api'], ['name' => 'fleetbase/pallet-api'], ['name' => 'laravel/framework']]],
            require: [
                'php'                       => '>=8.0 <8.3',
                'ext-json'                  => '*',
                'fleetbase/core-api'        => '^1.6.73',
                'fleetbase/registry-bridge' => '^0.2.0',
                'fleetbase/fleetops-api'    => '^0.6.74',
                'fleetbase/pallet-api'      => '^0.1',
                'laravel/framework'         => '^10.0',
            ],
            extra: ['repositories' => [
                ['type' => 'path', 'url' => '../packages/pallet'],
                ['type' => 'composer', 'url' => 'https://registry.fleetbase.io'],
                ['type' => 'composer', 'url' => 'https://repo.example.com/composer', 'name' => 'example'],
                ['type' => 'vcs', 'url' => 'https://git.example.com/acme/thing.git'],
                'acme' => ['type' => 'composer', 'url' => 'https://acme.example.com'],
                ['type' => 'composer', 'url' => 'https://acme.example.com'],
            ]],
        );

        $this->app->setBasePath($this->api);
        $this->app->instance('path.extensions', $this->api . '/extensions');
        Process::fake();
    }

    protected function tearDown(): void
    {
        $this->removeProjects();
        parent::tearDown();
    }

    private function writeShippedManifest(): void
    {
        $manifest                                       = ExtensionsMigrateManifest::defaultManifest();
        $manifest['require']['fleetbase/fleetops-api']  = '^0.6.74';
        $this->writeJson($this->api . '/extensions/composer.json', $manifest);
        file_put_contents($this->api . '/extensions/composer.lock', '{"packages": [{"name": "fleetbase/core-platform"}, {"name": "fleetbase/fleetops-api"}, {}]}');
    }

    /**
     * @return array<int, array{0: array<int, string>, 1: string}>
     */
    private function composerRuns(): array
    {
        $runs = [];
        Process::assertRan(function (PendingProcess $process) use (&$runs) {
            $runs[] = [$process->command, $process->path];

            return true;
        });

        return $runs;
    }

    public function test_dry_run_lists_what_would_move_and_changes_nothing(): void
    {
        $before = file_get_contents($this->api . '/composer.json');

        $this->artisan('extensions:migrate-manifest', ['--dry-run' => true])
            ->expectsTable(['Package', 'Required in the manifest as', 'Found in'], [
                ['fleetbase/fleetops-api', '0.6.74', 'composer.json'],
                ['fleetbase/pallet-api', 'v0.1.3', 'composer.json'],
                ['acme/left-behind-api', '2.0.0', 'vendor (not in composer.lock)'],
            ])
            ->expectsOutputToContain('Dry run: nothing changed.')
            ->assertSuccessful();

        $this->assertSame($before, file_get_contents($this->api . '/composer.json'));
        $this->assertFileDoesNotExist($this->api . '/extensions/composer.json');
        Process::assertNothingRan();
    }

    public function test_it_moves_the_extensions_into_the_manifest_at_their_installed_versions(): void
    {
        $this->writeShippedManifest();

        $this->artisan('extensions:migrate-manifest', ['--force' => true])
            ->expectsOutputToContain('Moved 3 package(s)')
            ->assertSuccessful();

        $manifest = $this->readJsonFile($this->api . '/extensions/composer.json');
        $this->assertSame([
            'acme/left-behind-api'    => '2.0.0',
            'fleetbase/core-platform' => '*',
            // Already in the shipped manifest: its constraint stays.
            'fleetbase/fleetops-api'  => '^0.6.74',
            'fleetbase/pallet-api'    => 'v0.1.3',
        ], $manifest['require']);
        $this->assertSame(['core-platform', 'example', 'git.example.com', 'acme'], array_keys($manifest['repositories']), 'path repositories, the v1 registry and duplicates are not carried over');
        $this->assertSame(['type' => 'composer', 'url' => 'https://repo.example.com/composer'], $manifest['repositories']['example']);
        $this->assertStringContainsString('"allow-plugins": {}', (string) file_get_contents($this->api . '/extensions/composer.json'));

        $this->assertSame([
            [['composer', 'remove', 'fleetbase/fleetops-api', 'fleetbase/pallet-api', '--no-interaction', '--no-scripts'], $this->api],
            // FleetOps is in the manifest's lock already, so it installs at its locked version.
            [['composer', 'update', 'fleetbase/pallet-api', 'acme/left-behind-api', 'fleetbase/core-platform', '--no-interaction'], $this->api . '/extensions'],
        ], $this->composerRuns());
        $this->assertFileExists($this->api . '/extensions/core-platform/composer.json');

        $backups = glob($this->api . '/storage/app/extensions-migration/*/core.composer.json');
        $this->assertCount(1, $backups);
        $this->assertArrayHasKey('fleetbase/pallet-api', json_decode((string) file_get_contents($backups[0]), true)['require']);
    }

    public function test_options_choose_constraints_and_which_packages_move(): void
    {
        $this->artisan('extensions:migrate-manifest', ['--force' => true, '--keep-constraints' => true, '--keep' => ['fleetbase/fleetops-api', 'acme/left-behind-api'], '--package' => ['acme/helper'], '--composer' => 'composer2'])
            ->assertSuccessful();

        $manifest = $this->readJsonFile($this->api . '/extensions/composer.json');
        $this->assertSame(['acme/helper' => '1.0.0', 'fleetbase/core-platform' => '*', 'fleetbase/pallet-api' => '^0.1'], $manifest['require']);
        $this->assertSame('fleetbase/extensions', $manifest['name'], 'an instance without a manifest gets the default one');
        $this->assertSame([
            [['composer2', 'remove', 'fleetbase/pallet-api', '--no-interaction', '--no-scripts'], $this->api],
            [['composer2', 'update', '--no-interaction'], $this->api . '/extensions'],
        ], $this->composerRuns());
    }

    public function test_only_left_behind_packages_reinstall_core_from_its_lock(): void
    {
        $this->artisan('extensions:migrate-manifest', ['--force' => true, '--keep' => ['fleetbase/fleetops-api', 'fleetbase/pallet-api'], '--package' => ['acme/not-installed']])->assertSuccessful();

        $this->assertSame(['acme/left-behind-api' => '2.0.0', 'acme/not-installed' => '*', 'fleetbase/core-platform' => '*'], $this->readJsonFile($this->api . '/extensions/composer.json')['require']);
        $this->assertSame([['composer', 'install', '--no-interaction', '--no-scripts'], $this->api], $this->composerRuns()[0]);
    }

    public function test_a_failed_install_puts_every_file_back(): void
    {
        $this->writeShippedManifest();
        $core     = file_get_contents($this->api . '/composer.json');
        $manifest = file_get_contents($this->api . '/extensions/composer.json');
        Process::fake(fn (PendingProcess $process) => $process->command[1] === 'update' ? Process::result(exitCode: 2) : Process::result());

        $this->artisan('extensions:migrate-manifest', ['--force' => true])
            ->expectsOutputToContain('(exit code 2)')
            ->expectsOutputToContain('The files are back as they were.')
            ->assertFailed();

        $this->assertSame($core, file_get_contents($this->api . '/composer.json'));
        $this->assertSame($manifest, file_get_contents($this->api . '/extensions/composer.json'));
        $this->assertSame([
            [['composer', 'install', '--no-interaction', '--no-scripts'], $this->api],
            [['composer', 'install', '--no-interaction'], $this->api . '/extensions'],
        ], array_slice($this->composerRuns(), 2));
    }

    public function test_a_manifest_the_migration_created_is_removed_again_and_a_failed_restore_is_reported(): void
    {
        Process::fake(['*' => Process::result(exitCode: 1)]);

        $this->artisan('extensions:migrate-manifest', ['--force' => true])
            ->expectsOutputToContain('reinstalling vendor/ failed')
            ->assertFailed();

        $this->assertFileDoesNotExist($this->api . '/extensions/composer.json');
    }

    public function test_it_asks_before_changing_anything(): void
    {
        $this->artisan('extensions:migrate-manifest')
            ->expectsConfirmation('Move these packages? Run this during a maintenance window: extensions are unavailable until it finishes.', 'no')
            ->expectsOutputToContain('Nothing changed.')
            ->assertFailed();

        Process::assertNothingRan();
    }

    public function test_nothing_to_move_and_no_composer_json(): void
    {
        $this->writeJson($this->api . '/composer.json', ['require' => ['fleetbase/core-api' => '^1.6']]);
        $this->writeJson($this->api . '/composer.lock', ['packages' => [['name' => 'fleetbase/core-api']]]);
        $this->writeJson($this->api . '/vendor/composer/installed.json', ['packages' => [['name' => 'fleetbase/core-api', 'version' => '1.6.73']]]);
        $this->artisan('extensions:migrate-manifest')->expectsOutputToContain('No extensions to move')->assertSuccessful();

        // Without vendor/ or a lock a fleetbase/* package counts as an extension; others do not.
        unlink($this->api . '/vendor/composer/installed.json');
        unlink($this->api . '/composer.lock');
        $this->writeJson($this->api . '/composer.json', ['require' => ['fleetbase/ledger-api' => '^0.0.13', 'acme/lib' => '^1.0']]);
        $this->artisan('extensions:migrate-manifest', ['--dry-run' => true])
            ->expectsTable(['Package', 'Required in the manifest as', 'Found in'], [['fleetbase/ledger-api', '^0.0.13', 'composer.json']])
            ->assertSuccessful();

        unlink($this->api . '/composer.json');
        $this->artisan('extensions:migrate-manifest')->expectsOutputToContain('There is no readable composer.json')->assertFailed();
    }

    public function test_composer_objects_keeps_empty_sections_as_objects(): void
    {
        $json = ExtensionsMigrateManifest::composerObjects(['require' => [], 'config' => ['allow-plugins' => [], 'platform' => ['php' => '8.2']], 'repositories' => []]);

        $this->assertSame('{"require":{},"config":{"allow-plugins":{},"platform":{"php":"8.2"}},"repositories":[]}', json_encode($json));
        $this->assertSame('{"config":true}', json_encode(ExtensionsMigrateManifest::composerObjects(['config' => true])));
    }
}
