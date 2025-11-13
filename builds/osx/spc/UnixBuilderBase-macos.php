<?php

declare(strict_types=1);

namespace SPC\builder\unix;

use SPC\builder\BuilderBase;
use SPC\builder\linux\LinuxBuilder;
use SPC\exception\FileSystemException;
use SPC\exception\RuntimeException;
use SPC\exception\WrongUsageException;
use SPC\store\Config;
use SPC\store\FileSystem;
use SPC\util\DependencyUtil;
use SPC\util\SPCConfigUtil;

abstract class UnixBuilderBase extends BuilderBase
{
    /** @var string cflags */
    public string $arch_c_flags;

    /** @var string C++ flags */
    public string $arch_cxx_flags;

    /** @var string cmake toolchain file */
    public string $cmake_toolchain_file;

    /**
     * @throws WrongUsageException
     * @throws FileSystemException
     */
    public function getAllStaticLibFiles(): array
    {
        $libs = [];

        // reorder libs
        foreach ($this->libs as $lib) {
            foreach ($lib->getDependencies() as $dep) {
                $libs[] = $dep;
            }
            $libs[] = $lib;
        }

        $libFiles = [];
        $libNames = [];
        // merge libs
        foreach ($libs as $lib) {
            if (!in_array($lib::NAME, $libNames, true)) {
                $libNames[] = $lib::NAME;
                array_unshift($libFiles, ...$lib->getStaticLibs());
            }
        }
        return array_map(fn ($x) => realpath(BUILD_LIB_PATH . "/{$x}"), $libFiles);
    }

    /**
     * Return generic cmake options when configuring cmake projects
     */
    public function makeCmakeArgs(): string
    {
        $extra = $this instanceof LinuxBuilder ? '-DCMAKE_C_COMPILER=' . getenv('CC') . ' ' : '';

        // NEW: allow env-variable override
        $arch  = getenv('CMAKE_OSX_ARCHITECTURES') ?: 'arm64';

        return $extra .
            '-DCMAKE_BUILD_TYPE=Release ' .
            '-DCMAKE_INSTALL_PREFIX=' . BUILD_ROOT_PATH . ' ' .
            '-DCMAKE_INSTALL_BINDIR=bin ' .
            '-DCMAKE_INSTALL_LIBDIR=lib ' .
            '-DCMAKE_INSTALL_INCLUDEDIR=include ' .
            "-DCMAKE_OSX_ARCHITECTURES={$arch} " . 
            "-DCMAKE_TOOLCHAIN_FILE={$this->cmake_toolchain_file}";
    }

    /**
     * Generate configure flags
     */
    public function makeAutoconfFlags(int $flag = AUTOCONF_ALL): string
    {
        $extra = '';
        // TODO: add auto pkg-config support
        if (($flag & AUTOCONF_LIBS) === AUTOCONF_LIBS) {
            $extra .= 'LIBS="' . BUILD_LIB_PATH . '" ';
        }
        if (($flag & AUTOCONF_CFLAGS) === AUTOCONF_CFLAGS) {
            $extra .= 'CFLAGS="-I' . BUILD_INCLUDE_PATH . '" ';
        }
        if (($flag & AUTOCONF_CPPFLAGS) === AUTOCONF_CPPFLAGS) {
            $extra .= 'CPPFLAGS="-I' . BUILD_INCLUDE_PATH . '" ';
        }
        if (($flag & AUTOCONF_LDFLAGS) === AUTOCONF_LDFLAGS) {
            $extra .= 'LDFLAGS="-L' . BUILD_LIB_PATH . '" ';
        }
        return $extra;
    }

    public function proveLibs(array $sorted_libraries): void
    {
        // search all supported libs
        $support_lib_list = [];
        $classes = FileSystem::getClassesPsr4(
            ROOT_DIR . '/src/SPC/builder/' . osfamily2dir() . '/library',
            'SPC\builder\\' . osfamily2dir() . '\library'
        );
        foreach ($classes as $class) {
            if (defined($class . '::NAME') && $class::NAME !== 'unknown' && Config::getLib($class::NAME) !== null) {
                $support_lib_list[$class::NAME] = $class;
            }
        }

        // if no libs specified, compile all supported libs
        if ($sorted_libraries === [] && $this->isLibsOnly()) {
            $libraries = array_keys($support_lib_list);
            $sorted_libraries = DependencyUtil::getLibs($libraries);
        }

        // add lib object for builder
        foreach ($sorted_libraries as $library) {
            if (!in_array(Config::getLib($library, 'type', 'lib'), ['lib', 'package'])) {
                continue;
            }
            // if some libs are not supported (but in config "lib.json", throw exception)
            if (!isset($support_lib_list[$library])) {
                throw new WrongUsageException('library [' . $library . '] is in the lib.json list but not supported to compile, but in the future I will support it!');
            }
            $lib = new ($support_lib_list[$library])($this);
            $this->addLib($lib);
        }

        // calculate and check dependencies
        foreach ($this->libs as $lib) {
            $lib->calcDependency();
        }
        $this->lib_list = $sorted_libraries;
    }

    /**
     * Sanity check after build complete
     *
     * @throws RuntimeException
     */
    protected function sanityCheck(int $build_target): void
    {
        // sanity check for php-cli
        if (($build_target & BUILD_TARGET_CLI) === BUILD_TARGET_CLI) {
            logger()->info('running cli sanity check');
            [$ret, $output] = shell()->execWithResult(BUILD_ROOT_PATH . '/bin/php -n -r "echo \"hello\";"');
            $raw_output = implode('', $output);
            if ($ret !== 0 || trim($raw_output) !== 'hello') {
                throw new RuntimeException("cli failed sanity check: ret[{$ret}]. out[{$raw_output}]");
            }

            foreach ($this->getExts(false) as $ext) {
                logger()->debug('testing ext: ' . $ext->getName());
                $ext->runCliCheckUnix();
            }
        }

        // sanity check for phpmicro
        if (($build_target & BUILD_TARGET_MICRO) === BUILD_TARGET_MICRO) {
            $test_task = $this->getMicroTestTasks();
            foreach ($test_task as $task_name => $task) {
                $test_file = SOURCE_PATH . '/' . $task_name . '.exe';
                if (file_exists($test_file)) {
                    @unlink($test_file);
                }
                file_put_contents($test_file, file_get_contents(SOURCE_PATH . '/php-src/sapi/micro/micro.sfx') . $task['content']);
                chmod($test_file, 0755);
                [$ret, $out] = shell()->execWithResult($test_file);
                foreach ($task['conditions'] as $condition => $closure) {
                    if (!$closure($ret, $out)) {
                        $raw_out = trim(implode('', $out));
                        throw new RuntimeException("micro failed sanity check: {$task_name}, condition [{$condition}], ret[{$ret}], out[{$raw_out}]");
                    }
                }
            }
        }

        // sanity check for embed
        if (($build_target & BUILD_TARGET_EMBED) === BUILD_TARGET_EMBED) {
            logger()->info('running embed sanity check');
            $sample_file_path = SOURCE_PATH . '/embed-test';
            if (!is_dir($sample_file_path)) {
                @mkdir($sample_file_path);
            }
            // copy embed test files
            copy(ROOT_DIR . '/src/globals/common-tests/embed.c', $sample_file_path . '/embed.c');
            copy(ROOT_DIR . '/src/globals/common-tests/embed.php', $sample_file_path . '/embed.php');
            $util = new SPCConfigUtil($this);
            $config = $util->config($this->ext_list, $this->lib_list, $this->getOption('with-suggested-exts'), $this->getOption('with-suggested-libs'));
            $lens = "{$config['cflags']} {$config['ldflags']} {$config['libs']}";
            if (PHP_OS_FAMILY === 'Linux' && getenv('SPC_LIBC') === 'musl') {
                $lens .= ' -static';
            }
            [$ret, $out] = shell()->cd($sample_file_path)->execWithResult(getenv('CC') . ' -o embed embed.c ' . $lens);
            if ($ret !== 0) {
                throw new RuntimeException('embed failed sanity check: build failed. Error message: ' . implode("\n", $out));
            }
            // if someone changed to --enable-embed=shared, we need to add LD_LIBRARY_PATH
            if (getenv('SPC_CMD_VAR_PHP_EMBED_TYPE') === 'shared') {
                $ext_path = 'LD_LIBRARY_PATH=' . BUILD_ROOT_PATH . '/lib:$LD_LIBRARY_PATH ';
                FileSystem::removeFileIfExists(BUILD_ROOT_PATH . '/lib/libphp.a');
            } else {
                $ext_path = '';
                FileSystem::removeFileIfExists(BUILD_ROOT_PATH . '/lib/libphp.so');
            }
            [$ret, $output] = shell()->cd($sample_file_path)->execWithResult($ext_path . './embed');
            if ($ret !== 0 || trim(implode('', $output)) !== 'hello') {
                throw new RuntimeException('embed failed sanity check: run failed. Error message: ' . implode("\n", $output));
            }
        }
    }

    /**
     * 将编译好的二进制文件发布到 buildroot
     *
     * @param  int                 $type 发布类型
     * @throws RuntimeException
     * @throws FileSystemException
     */
    protected function deployBinary(int $type): bool
    {
        $src = match ($type) {
            BUILD_TARGET_CLI => SOURCE_PATH . '/php-src/sapi/cli/php',
            BUILD_TARGET_MICRO => SOURCE_PATH . '/php-src/sapi/micro/micro.sfx',
            BUILD_TARGET_FPM => SOURCE_PATH . '/php-src/sapi/fpm/php-fpm',
            default => throw new RuntimeException('Deployment does not accept type ' . $type),
        };
        logger()->info('Deploying ' . $this->getBuildTypeName($type) . ' file');
        FileSystem::createDir(BUILD_ROOT_PATH . '/bin');
        shell()->exec('cp ' . escapeshellarg($src) . ' ' . escapeshellarg(BUILD_ROOT_PATH . '/bin/'));
        return true;
    }

    /**
     * Run php clean
     *
     * @throws RuntimeException
     */
    protected function cleanMake(): void
    {
        logger()->info('cleaning up');
        shell()->cd(SOURCE_PATH . '/php-src')->exec('make clean');
    }

    /**
     * Patch phpize and php-config if needed
     * @throws FileSystemException
     */
    protected function patchPhpScripts(): void
    {
        // patch phpize
        if (file_exists(BUILD_BIN_PATH . '/phpize')) {
            logger()->debug('Patching phpize prefix');
            FileSystem::replaceFileStr(BUILD_BIN_PATH . '/phpize', "prefix=''", "prefix='" . BUILD_ROOT_PATH . "'");
            FileSystem::replaceFileStr(BUILD_BIN_PATH . '/phpize', 's##', 's#/usr/local#');
        }
        // patch php-config
        if (file_exists(BUILD_BIN_PATH . '/php-config')) {
            logger()->debug('Patching php-config prefix and libs order');
            $php_config_str = FileSystem::readFile(BUILD_BIN_PATH . '/php-config');
            $php_config_str = str_replace('prefix=""', 'prefix="' . BUILD_ROOT_PATH . '"', $php_config_str);
            // move mimalloc to the beginning of libs
            $php_config_str = preg_replace('/(libs=")(.*?)\s*(' . preg_quote(BUILD_LIB_PATH, '/') . '\/mimalloc\.o)\s*(.*?)"/', '$1$3 $2 $4"', $php_config_str);
            // move lstdc++ to the end of libs
            $php_config_str = preg_replace('/(libs=")(.*?)\s*(-lstdc\+\+)\s*(.*?)"/', '$1$2 $4 $3"', $php_config_str);
            FileSystem::writeFile(BUILD_BIN_PATH . '/php-config', $php_config_str);
        }
    }
}
