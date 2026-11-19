<?php

namespace Tests\Unit\Console\Commands;

use App\Console\Commands\ExtensionsSync;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Symfony\Component\Console\Output\BufferedOutput;
use Tests\Concerns\MakesComposerProjects;
use Tests\TestCase;

class ExtensionsSyncTest extends TestCase
{
    use MakesComposerProjects;

    private string $api;

    protected function setUp(): void
    {
        parent::setUp();

        $this->api = $this->makeCore(installed: ['packages' => [['name' => 'fleetbase/core-api', 'version' => '1.6.73', 'version_normalized' => '1.6.73.0']]]);
        $this->writeJson($this->api . '/extensions/composer.json', ['require' => ['fleetbase/core-platform' => '*']]);
        $this->app->setBasePath($this->api);
        $this->app->instance('path.extensions', $this->api . '/extensions');
        Process::fake();
    }

    protected function tearDown(): void
    {
        $this->removeProjects();
        parent::tearDown();
    }

    private function ranComposer(array $command): void
    {
        Process::assertRan(fn (PendingProcess $process) => $process->command === $command && $process->path === $this->api . '/extensions');
    }

    public function test_it_rewrites_core_platform_and_updates_only_that_package(): void
    {
        file_put_contents($this->api . '/extensions/composer.lock', '{}');

        $this->artisan('extensions:sync')->expectsOutputToContain('Extensions re-resolved against core.')->assertSuccessful();

        $this->assertFileExists($this->api . '/extensions/core-platform/composer.json');
        $this->ranComposer(['composer', 'update', 'fleetbase/core-platform', '--no-interaction']);
    }

    public function test_an_unchanged_core_with_a_lock_needs_no_composer_run_unless_forced(): void
    {
        file_put_contents($this->api . '/extensions/composer.lock', '{}');
        $this->artisan('extensions:sync')->assertSuccessful();

        $this->artisan('extensions:sync')->expectsOutputToContain('the extensions lock is current')->assertSuccessful();
        Process::assertRanTimes(fn () => true, 1);

        $this->artisan('extensions:sync', ['--force' => true, '--composer' => '/usr/bin/composer'])->assertSuccessful();
        $this->ranComposer(['/usr/bin/composer', 'update', 'fleetbase/core-platform', '--no-interaction']);
        Process::assertRanTimes(fn () => true, 2);
    }

    public function test_check_is_a_dry_run_and_a_missing_lock_resolves_everything(): void
    {
        $this->artisan('extensions:sync', ['--check' => true])->expectsOutputToContain('Installed extensions resolve against core.')->assertSuccessful();

        $this->ranComposer(['composer', 'update', '--no-interaction', '--dry-run']);
    }

    public function test_an_extension_that_rejects_the_new_core_fails_the_command(): void
    {
        Process::fake(['*' => Process::result(errorOutput: 'Problem 1', exitCode: 2)]);

        $this->artisan('extensions:sync')->expectsOutputToContain('does not accept the packages core now installs')->assertFailed();
    }

    public function test_without_a_manifest_or_an_installed_core_there_is_nothing_to_sync(): void
    {
        unlink($this->api . '/extensions/composer.json');
        $this->artisan('extensions:sync')->expectsOutputToContain('nothing to sync')->assertSuccessful();

        $this->writeJson($this->api . '/extensions/composer.json', []);
        unlink($this->api . '/vendor/composer/installed.json');
        $this->artisan('extensions:sync')->expectsOutputToContain('Core is not installed')->assertFailed();

        Process::assertNothingRan();
    }

    public function test_composer_output_is_relayed_to_the_console(): void
    {
        $command = $this->app->make(ExtensionsSync::class);
        $buffer  = new BufferedOutput();
        $command->setOutput(new \Illuminate\Console\OutputStyle(new \Symfony\Component\Console\Input\ArrayInput([]), $buffer));

        $command->relayOutput('err', "Loading composer repositories\n");

        $this->assertSame("Loading composer repositories\n", $buffer->fetch());
    }
}
