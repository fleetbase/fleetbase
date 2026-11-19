<?php

declare(strict_types=1);

// Writes api/extensions/core-platform/composer.json: the fleetbase/core-platform metapackage that tells
// the extensions project which packages core already installs (see app/Support/Extensions/CorePlatform.php
// and api/extensions/README.md).
//
// Usage:
//   php scripts/extensions-core-platform.php [api path] [extensions path]
//
// Runs from core's post-autoload-dump and from the Docker build before the extensions install, so it needs
// nothing autoloaded. Without an extensions project (no api/extensions/composer.json) it does nothing.

require_once __DIR__ . '/../app/Support/Extensions/CorePlatform.php';

use App\Support\Extensions\CorePlatform;

$api        = rtrim($argv[1] ?? dirname(__DIR__), '/');
$extensions = rtrim($argv[2] ?? $api . '/extensions', '/');

if (!is_file($extensions . '/composer.json')) {
    fwrite(STDOUT, "No extensions project at {$extensions}; nothing to describe.\n");
    exit(0);
}

try {
    $changed = CorePlatform::write($api, $extensions);
} catch (RuntimeException $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}

fwrite(STDOUT, sprintf("%s %s/%s/composer.json\n", $changed ? 'Wrote' : 'Unchanged:', $extensions, CorePlatform::DIRECTORY));
