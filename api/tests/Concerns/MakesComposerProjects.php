<?php

namespace Tests\Concerns;

/**
 * Throwaway core and extensions Composer projects on disk (composer.json, composer.lock and
 * vendor/composer/installed.json), for the extensions-manifest tests.
 */
trait MakesComposerProjects
{
    /** @var array<int, string> */
    private array $composerProjects = [];

    /**
     * @param array<mixed>|null    $installed vendor/composer/installed.json, or null for no vendor
     * @param array<mixed>|null    $lock      composer.lock, or null for none
     * @param array<string, mixed> $require   composer.json require
     */
    protected function makeCore(?array $installed = null, ?array $lock = null, array $require = ['php' => '>=8.0 <8.3'], array $extra = []): string
    {
        $root                     = sys_get_temp_dir() . '/fleetbase-extensions-test-' . bin2hex(random_bytes(6));
        $this->composerProjects[] = $root;

        $this->writeJson($root . '/composer.json', ['name' => 'fleetbase/fleetbase', 'require' => $require, ...$extra]);
        if ($installed !== null) {
            $this->writeJson($root . '/vendor/composer/installed.json', $installed);
        }
        if ($lock !== null) {
            $this->writeJson($root . '/composer.lock', $lock);
        }

        return $root;
    }

    /**
     * @param array<mixed> $data
     */
    protected function writeJson(string $file, array $data): void
    {
        if (!is_dir(dirname($file))) {
            mkdir(dirname($file), 0775, true);
        }
        file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    /**
     * @return array<mixed>|null
     */
    protected function readJsonFile(string $file): ?array
    {
        return is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
    }

    protected function removeProjects(): void
    {
        foreach ($this->composerProjects as $root) {
            $this->removeDirectory($root);
        }
        $this->composerProjects = [];
    }

    private function removeDirectory(string $path): void
    {
        if (!is_dir($path) || is_link($path)) {
            @unlink($path);

            return;
        }
        foreach (scandir($path) ?: [] as $entry) {
            if ($entry !== '.' && $entry !== '..') {
                $this->removeDirectory($path . '/' . $entry);
            }
        }
        @chmod($path, 0775);
        @rmdir($path);
    }
}
