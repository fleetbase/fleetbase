<?php

namespace App\Console\Commands;

use App\Console\Commands\Concerns\RunsComposer;
use App\Support\Extensions\CorePlatform;
use Illuminate\Console\Command;

/**
 * One-shot move of extensions from core's api/composer.json into the extensions manifest
 * (api/extensions/composer.json), for instances installed before the manifest existed.
 *
 * An extension here is a package that requires fleetbase/core-api, other than core-api itself and
 * fleetbase/registry-bridge (the installer, which stays in core). Two kinds are moved:
 *
 *  - extensions core's composer.json still requires (an install made by the old installer, or kept by a merge);
 *  - extensions still in api/vendor that core's composer.lock no longer lists, which is what an upgrade
 *    that replaced composer.json and composer.lock with the release's leaves behind.
 *
 * Each is required in the manifest at the version installed now (or core's constraint with
 * --keep-constraints), removed from core, and installed into api/extensions/vendor. The four Composer
 * files are copied to storage/app/extensions-migration/<time> first and put back if a step fails.
 */
class ExtensionsMigrateManifest extends Command
{
    use RunsComposer;

    /** Packages that require core-api but are part of core. */
    public const CORE_PACKAGES = ['fleetbase/core-api', 'fleetbase/registry-bridge'];

    /** The v1 registry; the Registry Service repository replaces it, so it is not carried over. */
    public const RETIRED_REPOSITORIES = ['https://registry.fleetbase.io', 'https://registry.fleetbase.io/'];

    protected $signature = 'extensions:migrate-manifest
                            {--package=* : Also move this package}
                            {--keep=* : Leave this package in core}
                            {--keep-constraints : Require core\'s version constraint instead of the installed version}
                            {--dry-run : Show what would move and change nothing}
                            {--force : Do not ask for confirmation}
                            {--composer=composer : The Composer binary}';

    protected $description = 'Move installed extensions from api/composer.json into the extensions manifest (api/extensions/composer.json)';

    public function handle(): int
    {
        $api        = rtrim($this->laravel->basePath(), '/');
        $extensions = rtrim((string) $this->laravel->make('path.extensions'), '/');
        $core       = $this->readJson($api . '/composer.json');

        if ($core === null) {
            $this->components->error('There is no readable composer.json at ' . $api . '.');

            return self::FAILURE;
        }

        $manifest = $this->readJson($extensions . '/composer.json') ?? self::defaultManifest();
        $moves    = $this->moves($api, $core, $manifest);

        if ($moves === []) {
            $this->components->info('No extensions to move: core\'s composer.json and vendor hold only core packages.');

            return self::SUCCESS;
        }

        $this->table(['Package', 'Required in the manifest as', 'Found in'], array_map(fn ($move) => [$move['name'], $move['constraint'], $move['source']], $moves));

        if ($this->option('dry-run')) {
            $this->components->info('Dry run: nothing changed.');

            return self::SUCCESS;
        }

        if (!$this->option('force') && !$this->confirm('Move these packages? Run this during a maintenance window: extensions are unavailable until it finishes.')) {
            $this->components->warn('Nothing changed.');

            return self::FAILURE;
        }

        $backup = $this->backup($api, $extensions);
        $this->components->info('Copied the Composer files to ' . $backup);

        try {
            $this->move($api, $extensions, $core, $manifest, $moves);
        } catch (\RuntimeException $e) {
            $this->components->error($e->getMessage());
            $this->restore($api, $extensions, $backup);

            return self::FAILURE;
        }

        $this->components->info(sprintf('Moved %d package(s) into %s/composer.json. Re-run any config:cache or route:cache your deploy uses, and reload Octane workers.', count($moves), $extensions));

        return self::SUCCESS;
    }

    /**
     * The manifest an instance gets when it has none (the one api/extensions ships with).
     *
     * @return array<string, mixed>
     */
    public static function defaultManifest(): array
    {
        return [
            'name'         => 'fleetbase/extensions',
            'description'  => 'Extensions installed on this Fleetbase instance. Core packages are in ../composer.json; see README.md.',
            'type'         => 'project',
            'license'      => 'AGPL-3.0-or-later',
            'require'      => [CorePlatform::PACKAGE => '*'],
            'repositories' => [CorePlatform::DIRECTORY => ['type' => 'path', 'url' => CorePlatform::DIRECTORY, 'options' => ['symlink' => false]]],
            'config'       => ['autoloader-suffix' => 'FleetbaseExtensions', 'optimize-autoloader' => true, 'preferred-install' => 'dist', 'sort-packages' => true, 'allow-plugins' => (object) []],
            'scripts'      => ['post-autoload-dump' => ['@php ../artisan package:discover --ansi']],
            'minimum-stability' => 'dev',
            'prefer-stable'     => true,
        ];
    }

    /**
     * @param array<string, mixed> $core
     * @param array<string, mixed> $manifest
     *
     * @return array<int, array{name: string, constraint: string, source: string, required: bool}>
     */
    protected function moves(string $api, array $core, array $manifest): array
    {
        $installed = [];
        foreach ($this->installedPackages($api) as $package) {
            $installed[strtolower((string) $package['name'])] = $package;
        }

        $locked = [];
        foreach ((array) (($this->readJson($api . '/composer.lock') ?? [])['packages'] ?? []) as $package) {
            $locked[strtolower((string) ($package['name'] ?? ''))] = true;
        }

        $keep     = array_map('strtolower', (array) $this->option('keep'));
        $extra    = array_map('strtolower', (array) $this->option('package'));
        $required = array_change_key_case((array) ($core['require'] ?? []));
        $moves    = [];

        $consider = function (string $name, ?string $constraint, string $source) use (&$moves, $installed, $keep, $extra, $manifest) {
            if (isset($moves[$name]) || in_array($name, $keep, true) || in_array($name, self::CORE_PACKAGES, true) || $name === CorePlatform::PACKAGE || !str_contains($name, '/')) {
                return;
            }
            $package     = $installed[$name] ?? null;
            $isExtension = in_array($name, $extra, true)
                || ($package !== null ? isset($package['require']['fleetbase/core-api']) : str_starts_with($name, 'fleetbase/'));
            if (!$isExtension) {
                return;
            }

            $version = $package['version'] ?? null;
            $pin     = $this->option('keep-constraints') && $constraint !== null ? $constraint : ($version ?? $constraint ?? '*');

            $moves[$name] = [
                'name'       => $name,
                // A package the manifest already requires keeps the manifest's constraint.
                'constraint' => (string) ($manifest['require'][$name] ?? $pin),
                'source'     => $source,
                'required'   => $source === 'composer.json',
            ];
        };

        foreach ($required as $name => $constraint) {
            $consider((string) $name, (string) $constraint, 'composer.json');
        }
        foreach ($installed as $name => $package) {
            if (!isset($locked[$name]) && !isset($required[$name])) {
                $consider($name, null, 'vendor (not in composer.lock)');
            }
        }
        foreach ($extra as $name) {
            $consider($name, isset($required[$name]) ? (string) $required[$name] : null, isset($required[$name]) ? 'composer.json' : '--package');
        }

        return array_values($moves);
    }

    /**
     * @param array<string, mixed>                                                                  $core
     * @param array<string, mixed>                                                                  $manifest
     * @param array<int, array{name: string, constraint: string, source: string, required: bool}> $moves
     */
    protected function move(string $api, string $extensions, array $core, array $manifest, array $moves): void
    {
        $hadLock = is_file($extensions . '/composer.lock');

        $manifest['require'] = (array) ($manifest['require'] ?? []);
        foreach ($moves as $move) {
            $manifest['require'][$move['name']] = $move['constraint'];
        }
        ksort($manifest['require']);
        $manifest['repositories'] = $this->repositories((array) ($manifest['repositories'] ?? []), (array) ($core['repositories'] ?? []));
        $this->writeJson($extensions . '/composer.json', $manifest);

        $composer = (string) $this->option('composer');
        $fromCore = array_column(array_filter($moves, fn ($move) => $move['required']), 'name');

        // --no-scripts: core's post-update-cmd would run extensions:sync before the manifest is resolved.
        $this->composer($api, $fromCore !== []
            ? [$composer, 'remove', ...$fromCore, '--no-interaction', '--no-scripts']
            : [$composer, 'install', '--no-interaction', '--no-scripts']);

        CorePlatform::write($api, $extensions);

        // Packages the manifest's lock already has (the extensions a release ships there) install at their
        // locked versions; only the ones new to it are resolved.
        $locked = array_map(fn ($package) => strtolower((string) ($package['name'] ?? '')), (array) (($this->readJson($extensions . '/composer.lock') ?? [])['packages'] ?? []));
        $new    = array_values(array_filter(array_column($moves, 'name'), fn ($name) => !in_array($name, $locked, true)));

        $this->composer($extensions, $hadLock
            // No --with-dependencies: it would also move packages already locked (seen on Composer 2.11).
            ? [$composer, 'update', ...$new, CorePlatform::PACKAGE, '--no-interaction']
            : [$composer, 'update', '--no-interaction']);
    }

    /**
     * The manifest's repositories plus core's, except path repositories (local development links) and
     * the retired v1 registry. Core's are kept: core may still need them.
     *
     * @param array<int|string, mixed> $manifest
     * @param array<int|string, mixed> $core
     *
     * @return array<int|string, mixed>
     */
    protected function repositories(array $manifest, array $core): array
    {
        $urls = array_filter(array_map(fn ($repository) => is_array($repository) ? ($repository['url'] ?? null) : null, $manifest));

        foreach ($core as $key => $repository) {
            $url = is_array($repository) ? ($repository['url'] ?? null) : null;
            if (!is_string($url) || ($repository['type'] ?? null) === 'path' || in_array($url, self::RETIRED_REPOSITORIES, true) || in_array($url, $urls, true)) {
                continue;
            }
            $name = is_string($key) ? $key : (string) ($repository['name'] ?? (parse_url($url, PHP_URL_HOST) ?: 'repository-' . count($manifest)));
            unset($repository['name']);
            $manifest[$name] = $repository;
            $urls[]          = $url;
            $this->components->info(sprintf('Repository %s (%s) is now also listed in the manifest.', $name, $url));
        }

        return $manifest;
    }

    protected function backup(string $api, string $extensions): string
    {
        $directory = storage_path('app/extensions-migration/' . date('Ymd-His'));
        @mkdir($directory, 0775, true);

        foreach ($this->backupFiles($api, $extensions) as $name => $file) {
            if (is_file($file)) {
                copy($file, $directory . '/' . $name);
            }
        }

        return $directory;
    }

    protected function restore(string $api, string $extensions, string $backup): void
    {
        $this->components->warn('Putting the Composer files back from ' . $backup);

        foreach ($this->backupFiles($api, $extensions) as $name => $file) {
            if (is_file($backup . '/' . $name)) {
                copy($backup . '/' . $name, $file);
            } elseif (str_starts_with($name, 'extensions.') && is_file($file)) {
                unlink($file);
            }
        }

        $composer = (string) $this->option('composer');
        $restored = true;
        try {
            $this->composer($api, [$composer, 'install', '--no-interaction', '--no-scripts']);
            if (is_file($extensions . '/composer.lock')) {
                CorePlatform::write($api, $extensions);
                $this->composer($extensions, [$composer, 'install', '--no-interaction']);
            }
        } catch (\RuntimeException $e) {
            $restored = false;
            $this->components->error($e->getMessage());
        }

        $restored
            ? $this->components->warn('The files are back as they were. vendor/ folders were reinstalled from them; run php artisan package:discover.')
            : $this->components->error('The files are back, but reinstalling vendor/ failed. Run composer install in api/ and api/extensions/ by hand.');
    }

    /**
     * @return array<string, string>
     */
    protected function backupFiles(string $api, string $extensions): array
    {
        return [
            'core.composer.json'       => $api . '/composer.json',
            'core.composer.lock'       => $api . '/composer.lock',
            'extensions.composer.json' => $extensions . '/composer.json',
            'extensions.composer.lock' => $extensions . '/composer.lock',
        ];
    }

    /**
     * @param array<int, string> $command
     *
     * @throws \RuntimeException when Composer fails
     */
    protected function composer(string $cwd, array $command): void
    {
        $result = $this->runComposer($cwd, $command);

        if (!$result->successful()) {
            throw new \RuntimeException(sprintf('`%s` failed in %s (exit code %d).', implode(' ', $command), $cwd, (int) $result->exitCode()));
        }
    }


    /**
     * @return array<int, array<string, mixed>>
     */
    protected function installedPackages(string $api): array
    {
        try {
            return CorePlatform::installedPackages($api);
        } catch (\RuntimeException) {
            return [];
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function readJson(string $file): ?array
    {
        $decoded = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param array<string, mixed> $data
     */
    protected function writeJson(string $file, array $data): void
    {
        if (!is_dir(dirname($file))) {
            mkdir(dirname($file), 0775, true);
        }
        file_put_contents($file, json_encode(self::composerObjects($data), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
    }

    /**
     * Sections Composer's schema requires to be objects, put back as objects: json_decode(…, true) turns an
     * empty `{}` into `[]`, and Composer rejects `"allow-plugins": []`.
     *
     * @param array<string, mixed> $json
     *
     * @return array<string, mixed>
     */
    public static function composerObjects(array $json): array
    {
        foreach (['require', 'require-dev', 'conflict', 'provide', 'replace', 'suggest', 'autoload', 'autoload-dev', 'scripts', 'config', 'extra'] as $key) {
            if (($json[$key] ?? null) === []) {
                $json[$key] = new \stdClass();
            }
        }
        foreach (['allow-plugins', 'platform'] as $key) {
            if (is_array($json['config'] ?? null) && ($json['config'][$key] ?? null) === []) {
                $json['config'][$key] = new \stdClass();
            }
        }

        return $json;
    }
}
