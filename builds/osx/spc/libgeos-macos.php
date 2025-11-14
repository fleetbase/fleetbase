<?php

declare(strict_types=1);

namespace SPC\builder\macos\library;

class libgeos extends MacOSLibraryBase
{
    use \SPC\builder\unix\library\libgeos;

    public const NAME = 'libgeos';
}