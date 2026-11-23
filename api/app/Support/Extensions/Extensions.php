<?php

namespace App\Support\Extensions;

use Composer\Autoload\ClassLoader;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\PackageManifest;

/**
 * Wires the extensions project (api/extensions, see its README) into the application: its autoloader
 * after core's, its packages into Laravel's package discovery, and its path as `path.extensions`.
 *
 * Called from bootstrap/app.php, so it covers artisan, HTTP, Octane workers and the test suite alike.
 * Without an api/extensions/vendor folder (no extensions installed) only the path is bound.
 */
final class Extensions
{
    public static function register(Application $app, ?string $path = null): void
    {
        $path = rtrim($path ?? $app->basePath('extensions'), '/');

        $app->instance('path.extensions', $path);
        self::loadAutoloader($path);

        $app->singleton(PackageManifest::class, fn () => new ExtensionsPackageManifest(new Filesystem(), $app->basePath(), $app->getCachedPackagesPath(), $path));
    }

    /**
     * Require the extensions project's autoloader and move it behind core's.
     *
     * Composer registers every autoloader in front of those already registered, so without the move a
     * class that both projects ship would load from the extensions vendor. core-platform keeps core's
     * packages out of that vendor; this keeps core first if one gets in anyway.
     */
    public static function loadAutoloader(string $path): ?ClassLoader
    {
        $autoload = rtrim($path, '/') . '/vendor/autoload.php';
        if (!is_file($autoload)) {
            return null;
        }

        $loader = require $autoload;
        if (!$loader instanceof ClassLoader) {
            return null;
        }

        $loader->unregister();
        $loader->register(false);

        return $loader;
    }
}
