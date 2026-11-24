<?php

namespace App\Support\Extensions;

/**
 * Describes the packages core installs (api/vendor) as one Composer metapackage, fleetbase/core-platform,
 * which the extensions project (api/extensions) requires.
 *
 * For every non-dev package core installed (and every package those replace) the metapackage `provide`s it
 * at the installed version and `conflict`s with any copy of it. Composer then resolves extensions against
 * core's own packages and installs only what core lacks into api/extensions/vendor: no second Laravel or
 * core-api, and an extension that needs a core package at a version core does not have fails to resolve
 * instead of loading twice. It also passes on what core's packages provide (psr/log-implementation, …).
 *
 * `provide` + `conflict` rather than `replace`: Composer 2.9+ blocks a package that replaces something with
 * a security advisory, so `replace` would refuse every extension install while core has any advisory.
 * Core's own `composer audit` reports those.
 *
 * This file is plain PHP with no dependencies, because api/scripts/extensions-core-platform.php runs it
 * before anything is autoloadable (the Docker build, core's post-autoload-dump).
 */
final class CorePlatform
{
    public const PACKAGE = 'fleetbase/core-platform';

    /** Folder inside the extensions project that holds the generated metapackage (a path repository). */
    public const DIRECTORY = 'core-platform';

    /**
     * The metapackage's composer.json for the core installed at $apiPath.
     *
     * @return array<string, mixed>
     *
     * @throws \RuntimeException when core has neither vendor/composer/installed.json nor composer.lock
     */
    public static function describe(string $apiPath): array
    {
        $provide  = [];
        $conflict = [];
        $virtual  = [];

        foreach (self::installedPackages($apiPath) as $package) {
            $name    = strtolower((string) $package['name']);
            $version = self::constraint($package);

            $provide[$name]  = $version;
            $conflict[$name] = '*';
            foreach ((array) ($package['replace'] ?? []) as $replaced => $constraint) {
                $replaced = strtolower((string) $replaced);
                $provide[$replaced] ??= $constraint === 'self.version' ? $version : (string) $constraint;
                $conflict[$replaced] = '*';
            }
            foreach ((array) ($package['provide'] ?? []) as $provided => $constraint) {
                $virtual[strtolower((string) $provided)] ??= $constraint === 'self.version' ? $version : (string) $constraint;
            }
        }

        // Virtual packages (psr/log-implementation) are provided, never conflicted: an extension may bring another implementation.
        $provide += $virtual;
        ksort($provide);
        ksort($conflict);

        $description = [
            'name'        => self::PACKAGE,
            'description' => 'Generated from api/vendor by api/scripts/extensions-core-platform.php. Do not edit: it lists the packages core already installs.',
            'type'        => 'metapackage',
            // Composer tells versions of a path package apart by the file's content, so this never changes.
            'version'     => '1.0.0',
        ];

        $php = self::coreRequire($apiPath)['php'] ?? null;
        if (is_string($php) && $php !== '') {
            $description['require'] = ['php' => $php];
        }

        $description['provide']  = (object) $provide;
        $description['conflict'] = (object) $conflict;

        return $description;
    }

    /**
     * Write <extensions>/core-platform/composer.json. Returns false when the file already had this content.
     *
     * @throws \RuntimeException when core is not installed or the file cannot be written
     */
    public static function write(string $apiPath, string $extensionsPath): bool
    {
        $directory = rtrim($extensionsPath, '/') . '/' . self::DIRECTORY;
        $file      = $directory . '/composer.json';
        $json      = json_encode(self::describe($apiPath), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";

        if (is_file($file) && file_get_contents($file) === $json) {
            return false;
        }

        if (!is_dir($directory) && !@mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new \RuntimeException(sprintf('Could not create %s.', $directory));
        }
        if (@file_put_contents($file, $json) === false) {
            throw new \RuntimeException(sprintf('Could not write %s.', $file));
        }

        return true;
    }

    /**
     * The packages core installed without its dev packages: vendor/composer/installed.json when core is
     * installed, else composer.lock (CI checks and lock generation, before any install).
     *
     * @return array<int, array<string, mixed>>
     */
    public static function installedPackages(string $apiPath): array
    {
        $apiPath   = rtrim($apiPath, '/');
        $installed = self::readJson($apiPath . '/vendor/composer/installed.json');
        if ($installed !== null) {
            $packages = $installed['packages'] ?? $installed;
            $dev      = array_map('strtolower', (array) ($installed['dev-package-names'] ?? []));

            return array_values(array_filter($packages, fn ($package) => is_array($package) && isset($package['name']) && !in_array(strtolower((string) $package['name']), $dev, true)));
        }

        $lock = self::readJson($apiPath . '/composer.lock');
        if ($lock !== null) {
            return array_values(array_filter((array) ($lock['packages'] ?? []), fn ($package) => is_array($package) && isset($package['name'])));
        }

        throw new \RuntimeException(sprintf('Core is not installed at %s: there is no vendor/composer/installed.json or composer.lock. Run composer install there first.', $apiPath));
    }

    /**
     * An exact constraint for the installed version, plus the branch alias a dev branch carries
     * (dev-main aliased as 1.x-dev also satisfies ^1.6).
     *
     * @param array<string, mixed> $package
     */
    public static function constraint(array $package): string
    {
        $version = (string) ($package['version_normalized'] ?? $package['version'] ?? '');
        $alias   = $package['extra']['branch-alias'][$package['version'] ?? ''] ?? null;

        return is_string($alias) && $alias !== '' ? $version . ' || ' . $alias : $version;
    }

    /**
     * @return array<string, mixed>
     */
    private static function coreRequire(string $apiPath): array
    {
        return (array) ((self::readJson(rtrim($apiPath, '/') . '/composer.json') ?? [])['require'] ?? []);
    }

    /**
     * @return array<mixed>|null
     */
    private static function readJson(string $file): ?array
    {
        if (!is_file($file)) {
            return null;
        }
        $decoded = json_decode((string) file_get_contents($file), true);

        return is_array($decoded) ? $decoded : null;
    }
}
