<?php

declare(strict_types=1);

namespace SPC\builder\linux\library;

class libgeos extends LinuxLibraryBase
{
    use \SPC\builder\unix\library\libgeos;

    public const NAME = 'libgeos';
}