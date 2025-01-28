<?php

namespace Fleetbase\Console\Commands;

use Fleetbase\Support\Utils;
use Illuminate\Console\Command;

class MigrateSandbox extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sandbox:migrate {--refresh} {--seed} {--force}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Runs the migration script for test data';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $refresh = Utils::castBoolean($this->option('refresh'));
        $seed    = Utils::castBoolean($this->option('seed'));
        $force   = Utils::castBoolean($this->option('force'));

        $command = $refresh ? 'migrate:refresh' : 'migrate';

        // only run core and fleetops migrations
        $paths                = ['vendor/fleetbase/core-api/migrations'];
        $migrationDirectories = $this->getExtensionsMigrationPaths();

        if (is_array($migrationDirectories)) {
            $paths = array_merge($paths, $migrationDirectories);
        }

        foreach ($paths as $path) {
            $this->call($command, [
                '--seed'     => $seed,
                '--force'    => $force,
                '--database' => config('fleetbase.connection.sandbox'),
                '--path'     => $path,
            ]);
        }
    }

    /**
     * Returns the relative paths to the migration directories of all installed Fleetbase extensions.
     *
     * This function retrieves all installed Fleetbase extensions, and then for each extension,
     * it checks if sandbox migrations are disabled. If not, it gets the migration directory
     * for the extension. All collected paths are then converted to relative paths and returned.
     *
     * @return array an array of the relative paths to the migration directories of all installed Fleetbase extensions
     */
    private function getExtensionsMigrationPaths(): array
    {
        $packages = Utils::getInstalledFleetbaseExtensions();
        $paths    = [];

        foreach ($packages as $packageName => $package) {
            // check if migrations is disabled for sandbox
            $sandboxMigrations = Utils::getFleetbaseExtensionProperty($packageName, 'sandbox-migrations');

            if ($sandboxMigrations === false || $sandboxMigrations === 'false' || $sandboxMigrations === 0 || $sandboxMigrations === '0') {
                continue;
            }

            $path = Utils::getMigrationDirectoryForExtension($packageName);

            if ($path) {
                $paths[] = $path;
            }
        }

        return $this->makePathsRelative($paths);
    }

    /**
     * Converts an array of absolute paths to relative paths.
     *
     * This function maps over an array of paths and for each path, it creates a substring
     * from the position of 'vendor' to the end of the string, effectively creating a relative path.
     * The trailing slash is also removed from each path. If the provided input is not an array,
     * the function will return an empty array.
     *
     * @param array|null $paths an array of absolute paths that will be converted to relative paths
     *
     * @return array an array of relative paths
     */
    private function makePathsRelative(?array $paths = []): array
    {
        if (!is_array($paths)) {
            return [];
        }

        $relativePaths = array_map(function ($path) {
            // Find the position of "vendor" in the string
            $startPosition = strpos($path, 'vendor');
            // Create a substring from the position of "vendor" to the end of the string
            $relativePath = substr($path, $startPosition);
            // Remove the trailing slash
            $relativePath = rtrim($relativePath, '/');

            return $relativePath;
        }, $paths);

        return $relativePaths;
    }
}
