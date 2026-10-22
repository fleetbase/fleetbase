<?php

/*
 * Fails the image build when the FrankenPHP binary in the base image is older than the
 * version the installed laravel/octane requires.
 *
 * `octane:frankenphp` makes this comparison every time it starts. When the binary is too old
 * it answers its own "download the latest binary?" prompt with yes (a container has no TTY),
 * moves /usr/local/bin/frankenphp aside, downloads a generic build to base_path('frankenphp'),
 * deletes the original and then runs the path it just emptied: `exec: /usr/local/bin/frankenphp:
 * not found`, exit 127, on every start. The v0.7.70 cloud deploy crash-looped on exactly this
 * (Octane 2.22.0 requires FrankenPHP 1.13.0; the image had 1.12.4) while the image built fine.
 *
 * Checking here turns that into a failed build that names both versions. The fix is always to
 * move the base image in docker/Dockerfile to a FrankenPHP release that meets the minimum.
 *
 * Usage: php assert-frankenphp-version.php [path/to/vendor/autoload.php]
 */

$fail = function (string $message) {
    fwrite(STDERR, "FrankenPHP/Octane compatibility check failed: {$message}\n");
    exit(1);
};

$autoload = $argv[1] ?? '/fleetbase/api/vendor/autoload.php';

if (!is_file($autoload)) {
    $fail("{$autoload} does not exist; run this after composer install.");
}

require $autoload;

$trait = 'Laravel\Octane\Commands\Concerns\InstallsFrankenPhpDependencies';

if (!trait_exists($trait)) {
    $fail("{$trait} was not found. Is laravel/octane installed?");
}

$required = (new ReflectionClass($trait))->getDefaultProperties()['requiredFrankenPhpVersion'] ?? null;

if (!is_string($required) || preg_match('/^\d+\.\d+\.\d+$/', $required) !== 1) {
    $fail('could not read the FrankenPHP version laravel/octane requires ($requiredFrankenPhpVersion on '
        . "{$trait}). Octane may have changed how it declares it; update this check to match.");
}

exec('frankenphp version 2>&1', $lines, $status);
$output = trim(implode("\n", $lines));

if ($status !== 0 || preg_match('/FrankenPHP v?(\d+\.\d+\.\d+)/', $output, $matches) !== 1) {
    $fail("could not read the FrankenPHP binary version from `frankenphp version` (exit {$status}): {$output}");
}

$installed = $matches[1];

if (version_compare($installed, $required, '<')) {
    $fail("the base image ships FrankenPHP {$installed}, but laravel/octane requires {$required} or newer. "
        . 'At startup Octane would delete the binary and the app would exit 127. Move the FROM line in '
        . "docker/Dockerfile to a dunglas/frankenphp {$required}+ image.");
}

echo "FrankenPHP {$installed} meets laravel/octane's minimum ({$required}).\n";
