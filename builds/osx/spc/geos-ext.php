<?php

declare(strict_types=1);

namespace SPC\builder\extension;

use SPC\builder\Extension;
use SPC\exception\RuntimeException;
use SPC\store\FileSystem;
use SPC\util\CustomExt;

/**
 * php-geos (https://github.com/libgeos/php-geos), compiled against the libgeos
 * that static-php-cli builds into buildroot.
 *
 * Its config.m4 locates GEOS through `geos-config`, which is only found when a
 * system GEOS is on PATH, and its AC_CHECK_LIB(geos_c, ...) probes link a test
 * program with `-lgeos_c` alone. The static libgeos_c.a needs libgeos.a and the
 * C++ runtime behind it on the link line, so without help every probe fails and
 * configure aborts with "a newer libgeos is required".
 */
#[CustomExt('geos')]
class geos extends Extension
{
    public function getUnixConfigureArg(bool $shared = false): string
    {
        // Use the geos-config SPC installed, never one from the host system.
        return '--with-geos-config=' . BUILD_ROOT_PATH . '/bin/geos-config';
    }

    /**
     * @throws RuntimeException
     */
    public function patchBeforeBuildconf(): bool
    {
        $config_m4 = SOURCE_PATH . '/php-src/ext/geos/config.m4';
        if (!file_exists($config_m4)) {
            throw new RuntimeException("php-geos source was not extracted to php-src/ext/geos (missing {$config_m4})");
        }

        $content = FileSystem::readFile($config_m4);
        $marker = 'LIBS="-lgeos ';
        if (str_contains($content, $marker)) {
            // Already patched (cached source directory).
            return false;
        }

        $anchor = 'GEOS_LDFLAGS=`$GEOS_CONFIG --ldflags`';
        if (!str_contains($content, $anchor)) {
            throw new RuntimeException("php-geos config.m4 changed, cannot find anchor line: {$anchor}");
        }

        // Dependencies of libgeos_c.a must come after -lgeos_c, i.e. in LIBS.
        $cxx = PHP_OS_FAMILY === 'Darwin' ? '-lc++' : '-lstdc++';
        $content = str_replace($anchor, $anchor . "\n    {$marker}{$cxx} -lm \$LIBS\"", $content);
        FileSystem::writeFile($config_m4, $content);

        return true;
    }
}
