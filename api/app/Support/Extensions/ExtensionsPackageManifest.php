<?php

namespace App\Support\Extensions;

use Illuminate\Filesystem\Filesystem;
use Illuminate\Foundation\PackageManifest;

/**
 * Laravel package discovery over both Composer projects: core's vendor/composer/installed.json first, then
 * the extensions project's. `dont-discover` is read from both root composer.json files. A package listed
 * by both projects keeps core's entry (core's autoloader is searched first too).
 */
class ExtensionsPackageManifest extends PackageManifest
{
    public function __construct(Filesystem $files, string $basePath, string $manifestPath, public readonly string $extensionsPath)
    {
        parent::__construct($files, $basePath, $manifestPath);
    }

    /**
     * Rebuild a cached manifest that is older than either project's installed.json or the extensions folder.
     *
     * Core's own Composer runs delete the cache first (Illuminate\Foundation\ComposerScripts), but the
     * extensions project cannot: that class is not in its vendor. Without this, removing an extension would
     * leave its provider in bootstrap/cache/packages.php and every boot, `package:discover` included, would
     * fail on the missing class.
     */
    protected function getManifest()
    {
        if ($this->manifest === null && $this->isStale()) {
            $this->build();
        }

        return parent::getManifest();
    }

    public function isStale(): bool
    {
        if (!is_file($this->manifestPath) || !is_writable(dirname($this->manifestPath))) {
            return false;
        }

        $built = (int) filemtime($this->manifestPath);
        foreach ([$this->vendorPath . '/composer/installed.json', $this->extensionsPath . '/vendor/composer/installed.json', $this->extensionsPath] as $path) {
            // Same-second writes count as newer: filemtime has one-second resolution.
            if (file_exists($path) && (int) filemtime($path) >= $built) {
                return true;
            }
        }

        return false;
    }

    public function build()
    {
        $ignore    = [...$this->packagesToIgnore(), ...$this->rootIgnores($this->extensionsPath . '/composer.json')];
        $manifest  = [];

        foreach ([...$this->installed($this->vendorPath), ...$this->installed($this->extensionsPath . '/vendor')] as $package) {
            $name                = $this->format($package['name']);
            $configuration       = $package['extra']['laravel'] ?? [];
            $manifest[$name] ??= $configuration;
            $ignore              = array_merge($ignore, $configuration['dont-discover'] ?? []);
        }

        $ignoreAll = in_array('*', $ignore, true);

        $this->write(array_filter($manifest, fn ($configuration, $package) => !$ignoreAll && !in_array($package, $ignore, true) && $configuration !== [], ARRAY_FILTER_USE_BOTH));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function installed(string $vendorPath): array
    {
        if (!$this->files->exists($path = $vendorPath . '/composer/installed.json')) {
            return [];
        }

        $installed = json_decode($this->files->get($path), true);
        $packages  = is_array($installed) ? ($installed['packages'] ?? $installed) : [];

        return array_values(array_filter($packages, fn ($package) => is_array($package) && isset($package['name'])));
    }

    /**
     * @return array<int, string>
     */
    protected function rootIgnores(string $composerJson): array
    {
        if (!$this->files->exists($composerJson)) {
            return [];
        }

        return (array) (json_decode($this->files->get($composerJson), true)['extra']['laravel']['dont-discover'] ?? []);
    }
}
