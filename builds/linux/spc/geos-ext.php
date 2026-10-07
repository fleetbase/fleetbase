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
 * php-geos has only ever been built as a shared extension via phpize, so a
 * static in-tree build needs three fixes:
 *
 * - config.m4 locates GEOS through `geos-config`, which is only found when a
 *   system GEOS is on PATH, and its AC_CHECK_LIB(geos_c, ...) probes link a
 *   test program with `-lgeos_c` alone. The static libgeos_c.a needs libgeos.a
 *   and the C++ runtime behind it on the link line, so without help every probe
 *   fails and configure aborts with "a newer libgeos is required".
 * - php_geos.h uses GEOSContextHandle_t without including <geos_c.h>. geos.c
 *   includes it first, but main/internal_functions.c includes php_geos.h alone.
 * - php_geos.h defines phpext_geos_ptr with a trailing semicolon, which breaks
 *   the module entry array in main/internal_functions.c.
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
        $ext_dir = SOURCE_PATH . '/php-src/ext/geos';
        if (!file_exists($ext_dir . '/config.m4')) {
            throw new RuntimeException("php-geos source was not extracted to php-src/ext/geos (missing {$ext_dir}/config.m4)");
        }

        $patched = $this->patchConfigM4($ext_dir . '/config.m4');
        $patched = $this->patchHeader($ext_dir . '/php_geos.h') || $patched;

        return $patched;
    }

    /**
     * @throws RuntimeException
     */
    private function patchConfigM4(string $config_m4): bool
    {
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

    /**
     * @throws RuntimeException
     */
    private function patchHeader(string $header): bool
    {
        $content = FileSystem::readFile($header);
        $patched = false;

        $bad_ptr = '#define phpext_geos_ptr &geos_module_entry;';
        if (str_contains($content, $bad_ptr)) {
            $content = str_replace($bad_ptr, '#define phpext_geos_ptr &geos_module_entry', $content);
            $patched = true;
        }

        if (!str_contains($content, '#include <geos_c.h>')) {
            $anchor = 'ZEND_BEGIN_MODULE_GLOBALS(geos)';
            if (!str_contains($content, $anchor)) {
                throw new RuntimeException("php-geos php_geos.h changed, cannot find anchor line: {$anchor}");
            }
            $content = str_replace($anchor, "#include <geos_c.h>\n\n" . $anchor, $content);
            $patched = true;
        }

        if ($patched) {
            FileSystem::writeFile($header, $content);
        }

        return $patched;
    }
}
