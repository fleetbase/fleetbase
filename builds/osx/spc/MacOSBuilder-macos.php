<?php

declare(strict_types=1);

namespace SPC\builder\macos;

use SPC\builder\macos\library\MacOSLibraryBase;
use SPC\builder\unix\UnixBuilderBase;
use SPC\exception\FileSystemException;
use SPC\exception\RuntimeException;
use SPC\exception\WrongUsageException;
use SPC\store\FileSystem;
use SPC\store\SourcePatcher;
use SPC\util\GlobalEnvManager;

class MacOSBuilder extends UnixBuilderBase
{
    /** @var bool Micro patch phar flag */
    private bool $phar_patched = false;

    /**
     * @throws RuntimeException
     * @throws WrongUsageException
     * @throws FileSystemException
     */
    public function __construct(array $options = [])
    {
        $this->options = $options;

        // apply global environment variables
        GlobalEnvManager::init($this);

        // ---------- set necessary compile vars ----------
        // concurrency
        $this->concurrency = intval(getenv('SPC_CONCURRENCY'));
        // cflags
        $this->arch_c_flags = getenv('SPC_DEFAULT_C_FLAGS');
        $this->arch_cxx_flags = getenv('SPC_DEFAULT_CXX_FLAGS');
        // cmake toolchain
        $this->cmake_toolchain_file = SystemUtil::makeCmakeToolchainFile('Darwin', getenv('SPC_ARCH'), $this->arch_c_flags);

        // create pkgconfig and include dir (some libs cannot create them automatically)
        f_mkdir(BUILD_LIB_PATH . '/pkgconfig', recursive: true);
        f_mkdir(BUILD_INCLUDE_PATH, recursive: true);
    }

    /**
     * [deprecated] 生成库构建采用的 autoconf 参数列表
     *
     * @param string $name      要构建的 lib 库名，传入仅供输出日志
     * @param array  $lib_specs 依赖的 lib 库的 autoconf 文件
     */
    public function makeAutoconfArgs(string $name, array $lib_specs): string
    {
        $ret = '';
        foreach ($lib_specs as $libName => $arr) {
            $lib = $this->getLib($libName);

            $arr = $arr ?? [];

            $disableArgs = $arr[0] ?? null;
            if ($lib instanceof MacOSLibraryBase) {
                logger()->info("{$name} \033[32;1mwith\033[0;1m {$libName} support");
                $ret .= '--with-' . $libName . '=yes ';
            } else {
                logger()->info("{$name} \033[31;1mwithout\033[0;1m {$libName} support");
                $ret .= ($disableArgs ?? "--with-{$libName}=no") . ' ';
            }
        }
        return rtrim($ret);
    }

    /**
     * Get dynamically linked macOS frameworks
     *
     * @param  bool                $asString If true, return as string
     * @throws FileSystemException
     * @throws WrongUsageException
     */
    public function getFrameworks(bool $asString = false): array|string
    {
        $libs = [];

        // reorder libs
        foreach ($this->libs as $lib) {
            foreach ($lib->getDependencies() as $dep) {
                $libs[] = $dep;
            }
            $libs[] = $lib;
        }

        $frameworks = [];
        /** @var MacOSLibraryBase $lib */
        foreach ($libs as $lib) {
            array_push($frameworks, ...$lib->getFrameworks());
        }

        if ($asString) {
            return implode(' ', array_map(fn ($x) => "-framework {$x}", $frameworks));
        }
        return $frameworks;
    }

    /**
     * Just start to build statically linked php binary
     *
     * @param  int                 $build_target build target
     * @throws FileSystemException
     * @throws RuntimeException
     * @throws WrongUsageException
     */
    public function buildPHP(int $build_target = BUILD_TARGET_NONE): void
    {
        $extra_libs = getenv('SPC_EXTRA_LIBS') ?: '';
        // ---------- Update extra-libs ----------
        // add macOS frameworks
        $extra_libs .= (empty($extra_libs) ? '' : ' ') . $this->getFrameworks(true);
        // add libc++, some extensions or libraries need it (C++ cannot be linked statically)
        $extra_libs .= (empty($extra_libs) ? '' : ' ') . ($this->hasCpp() ? '-lc++ ' : '');
        // bloat means force-load all static libraries, even if they are not used
        if (!$this->getOption('bloat', false)) {
            $extra_libs .= (empty($extra_libs) ? '' : ' ') . implode(' ', $this->getAllStaticLibFiles());
        } else {
            logger()->info('bloat linking');
            $extra_libs .= (empty($extra_libs) ? '' : ' ') . implode(' ', array_map(fn ($x) => "-Wl,-force_load,{$x}", array_filter($this->getAllStaticLibFiles())));
        }
        f_putenv('SPC_EXTRA_LIBS=' . $extra_libs);

        $this->emitPatchPoint('before-php-buildconf');
        SourcePatcher::patchBeforeBuildconf($this);

        shell()->cd(SOURCE_PATH . '/php-src')->exec(getenv('SPC_CMD_PREFIX_PHP_BUILDCONF'));

        $this->emitPatchPoint('before-php-configure');
        SourcePatcher::patchBeforeConfigure($this);

        $json_74 = $this->getPHPVersionID() < 80000 ? '--enable-json ' : '';
        $zts = $this->getOption('enable-zts', false) ? '--enable-zts --disable-zend-signals ' : '';

        $config_file_path = $this->getOption('with-config-file-path', false) ?
            ('--with-config-file-path=' . $this->getOption('with-config-file-path') . ' ') : '';
        $config_file_scan_dir = $this->getOption('with-config-file-scan-dir', false) ?
            ('--with-config-file-scan-dir=' . $this->getOption('with-config-file-scan-dir') . ' ') : '';

        $enableCli = ($build_target & BUILD_TARGET_CLI) === BUILD_TARGET_CLI;
        $enableFpm = ($build_target & BUILD_TARGET_FPM) === BUILD_TARGET_FPM;
        $enableMicro = ($build_target & BUILD_TARGET_MICRO) === BUILD_TARGET_MICRO;
        $enableEmbed = ($build_target & BUILD_TARGET_EMBED) === BUILD_TARGET_EMBED;

        // prepare build php envs
        $mimallocLibs = $this->getLib('mimalloc') !== null ? BUILD_LIB_PATH . '/mimalloc.o ' : '';
        $envs_build_php = SystemUtil::makeEnvVarString([
            'CFLAGS' => getenv('SPC_CMD_VAR_PHP_CONFIGURE_CFLAGS'),
            'CPPFLAGS' => getenv('SPC_CMD_VAR_PHP_CONFIGURE_CPPFLAGS'),
            'LDFLAGS' => getenv('SPC_CMD_VAR_PHP_CONFIGURE_LDFLAGS'),
            'LIBS' => $mimallocLibs . getenv('SPC_CMD_VAR_PHP_CONFIGURE_LIBS'),
        ]);

        if ($this->getLib('postgresql')) {
            shell()
                ->cd(SOURCE_PATH . '/php-src')
                ->exec(
                    'sed -i.backup "s/ac_cv_func_explicit_bzero\" = xyes/ac_cv_func_explicit_bzero\" = x_fake_yes/" ./configure'
                );
        }

        $embed_type = getenv('SPC_CMD_VAR_PHP_EMBED_TYPE') ?: 'static';
        shell()->cd(SOURCE_PATH . '/php-src')
            ->exec(
                getenv('SPC_CMD_PREFIX_PHP_CONFIGURE') . ' ' .
                ($enableCli ? '--enable-cli ' : '--disable-cli ') .
                ($enableFpm ? '--enable-fpm ' : '--disable-fpm ') .
                ($enableEmbed ? "--enable-embed={$embed_type} " : '--disable-embed ') .
                ($enableMicro ? '--enable-micro ' : '--disable-micro ') .
                $config_file_path .
                $config_file_scan_dir .
                $json_74 .
                $zts .
                $this->makeStaticExtensionArgs() . ' ' .
                $envs_build_php
            );

        $this->emitPatchPoint('before-php-make');
        SourcePatcher::patchBeforeMake($this);

        $this->cleanMake();

        if ($enableCli) {
            logger()->info('building cli');
            $this->buildCli();
        }
        if ($enableFpm) {
            logger()->info('building fpm');
            $this->buildFpm();
        }
        if ($enableMicro) {
            logger()->info('building micro');
            $this->buildMicro();
        }
        if ($enableEmbed) {
            logger()->info('building embed');
            if ($enableMicro) {
                FileSystem::replaceFileStr(SOURCE_PATH . '/php-src/Makefile', 'OVERALL_TARGET =', 'OVERALL_TARGET = libphp.la');
            }
            $this->buildEmbed();
        }

        $this->emitPatchPoint('before-sanity-check');
        $this->sanityCheck($build_target);
    }

    /**
     * Build cli sapi
     *
     * @throws RuntimeException
     * @throws FileSystemException
     */
    protected function buildCli(): void
    {
        $vars = SystemUtil::makeEnvVarString($this->getMakeExtraVars());

        $shell = shell()->cd(SOURCE_PATH . '/php-src');
        $shell->exec("\$SPC_CMD_PREFIX_PHP_MAKE {$vars} cli");
        if (!$this->getOption('no-strip', false)) {
            $shell->exec('dsymutil -f sapi/cli/php')->exec('strip sapi/cli/php');
        }
        $this->deployBinary(BUILD_TARGET_CLI);
    }

    /**
     * Build phpmicro sapi
     *
     * @throws FileSystemException
     * @throws RuntimeException
     * @throws WrongUsageException
     */
    protected function buildMicro(): void
    {
        if ($this->getPHPVersionID() < 80000) {
            throw new WrongUsageException('phpmicro only support PHP >= 8.0!');
        }
        if ($this->getExt('phar')) {
            $this->phar_patched = true;
            SourcePatcher::patchMicroPhar($this->getPHPVersionID());
        }

        $enable_fake_cli = $this->getOption('with-micro-fake-cli', false) ? ' -DPHP_MICRO_FAKE_CLI' : '';
        $vars = $this->getMakeExtraVars();

        // patch fake cli for micro
        $vars['EXTRA_CFLAGS'] .= $enable_fake_cli;
        if ($this->getOption('no-strip', false)) {
            $vars['STRIP'] = 'dsymutil -f ';
        }
        $vars = SystemUtil::makeEnvVarString($vars);

        shell()->cd(SOURCE_PATH . '/php-src')->exec(getenv('SPC_CMD_PREFIX_PHP_MAKE') . " {$vars} micro");

        $this->deployBinary(BUILD_TARGET_MICRO);

        if ($this->phar_patched) {
            SourcePatcher::unpatchMicroPhar();
        }
    }

    /**
     * Build fpm sapi
     *
     * @throws RuntimeException
     * @throws FileSystemException
     */
    protected function buildFpm(): void
    {
        $vars = SystemUtil::makeEnvVarString($this->getMakeExtraVars());

        $shell = shell()->cd(SOURCE_PATH . '/php-src');
        $shell->exec(getenv('SPC_CMD_PREFIX_PHP_MAKE') . " {$vars} fpm");
        if (!$this->getOption('no-strip', false)) {
            $shell->exec('dsymutil -f sapi/fpm/php-fpm')->exec('strip sapi/fpm/php-fpm');
        }
        $this->deployBinary(BUILD_TARGET_FPM);
    }

    /**
     * Build embed sapi
     *
     * @throws RuntimeException
     */
    protected function buildEmbed(): void
    {
        $vars = SystemUtil::makeEnvVarString($this->getMakeExtraVars());

        shell()->cd(SOURCE_PATH . '/php-src')
            ->exec(getenv('SPC_CMD_PREFIX_PHP_MAKE') . ' INSTALL_ROOT=' . BUILD_ROOT_PATH . " {$vars} install")
            // Fleetbase patch (see builds/osx/build-osx.sh): static libraries
            // passed through EXTRA_LIBS end up as nested .a members of libphp.a.
            // Upstream 2.5.2 worked around php-src#12082 by extracting the
            // archive with `ar x` and re-archiving *.o. The Xcode 26 ar cannot
            // handle a non-Mach-O member at all (it truncates the archive), so
            // build-osx.sh exports an AR wrapper that keeps .a operands out of
            // the archive in the first place, and this step only removes any
            // stragglers, the way current upstream static-php-cli does.
            ->exec('ar -t ' . BUILD_ROOT_PATH . "/lib/libphp.a | grep '\\.a$' | xargs -n1 ar d " . BUILD_ROOT_PATH . '/lib/libphp.a');
        $this->patchPhpScripts();
    }

    private function getMakeExtraVars(): array
    {
        return [
            'EXTRA_CFLAGS' => getenv('SPC_CMD_VAR_PHP_MAKE_EXTRA_CFLAGS'),
            'EXTRA_LIBS' => getenv('SPC_EXTRA_LIBS') . ' ' . getenv('SPC_CMD_VAR_PHP_MAKE_EXTRA_LIBS'),
        ];
    }
}
