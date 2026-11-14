<?php

namespace App\Console\Commands;

use App\Console\Commands\Concerns\RunsComposer;
use App\Support\Extensions\CorePlatform;
use Illuminate\Console\Command;

/**
 * Re-resolve the extensions project after core's packages changed (a core upgrade or `composer update`).
 *
 * Regenerates fleetbase/core-platform from api/vendor, then updates only that metapackage in
 * api/extensions: Composer drops packages core now ships, adds ones core no longer ships, and fails,
 * naming the extension, when an installed extension does not accept the new core.
 */
class ExtensionsSync extends Command
{
    use RunsComposer;

    protected $signature = 'extensions:sync
                            {--check : Resolve without writing api/extensions/composer.lock or vendor/}
                            {--force : Re-resolve even when core-platform did not change}
                            {--composer=composer : The Composer binary}';

    protected $description = 'Re-resolve installed extensions (api/extensions) against the packages core installs';

    public function handle(): int
    {
        $extensions = (string) $this->laravel->make('path.extensions');

        if (!is_file($extensions . '/composer.json')) {
            $this->components->info('No extensions manifest at ' . $extensions . '; nothing to sync.');

            return self::SUCCESS;
        }

        try {
            $changed = CorePlatform::write($this->laravel->basePath(), $extensions);
        } catch (\RuntimeException $e) {
            $this->components->error($e->getMessage());

            return self::FAILURE;
        }

        if (!$changed && !$this->option('force') && !$this->option('check') && is_file($extensions . '/composer.lock')) {
            $this->components->info('Core packages are unchanged; the extensions lock is current.');

            return self::SUCCESS;
        }

        // Without a lock (a manifest written by hand) a partial update is refused, so resolve everything.
        $command = [(string) $this->option('composer'), 'update', ...(is_file($extensions . '/composer.lock') ? [CorePlatform::PACKAGE] : []), '--no-interaction'];
        if ($this->option('check')) {
            $command[] = '--dry-run';
        }

        if (!$this->runComposer($extensions, $command)->successful()) {
            $this->components->error('An installed extension does not accept the packages core now installs (see Composer\'s output above). Update or remove that extension in api/extensions, or keep the previous core.');

            return self::FAILURE;
        }

        $this->components->info($this->option('check') ? 'Installed extensions resolve against core.' : 'Extensions re-resolved against core.');

        return self::SUCCESS;
    }
}
