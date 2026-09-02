<?php

namespace Tests\Concerns;

/**
 * Deterministic control over env() flags in tests.
 *
 * Both features these tests cover are read straight from env() rather than
 * config(), so config(['...']) cannot steer them. They also default to off,
 * which means a developer whose api/.env switches them ON (a perfectly normal
 * thing to do while debugging) would otherwise get different results from CI,
 * where the key is absent entirely.
 *
 * Values are written to $_ENV, $_SERVER and putenv() because Laravel builds its
 * Env repository from all three adapters, and which ones are active depends on
 * whether Env::disablePutenv() has been called. Writing a value BEFORE the
 * application boots also wins over api/.env: Laravel loads the file through an
 * immutable repository, which refuses to overwrite an already-defined variable.
 */
trait InteractsWithEnvironmentFlags
{
    /** @var array<string, string|false> */
    private array $originalEnvironmentFlags = [];

    protected function setEnvironmentFlag(string $key, ?string $value): void
    {
        if (!array_key_exists($key, $this->originalEnvironmentFlags)) {
            $this->originalEnvironmentFlags[$key] = getenv($key);
        }

        if ($value === null) {
            unset($_ENV[$key], $_SERVER[$key]);
            putenv($key);

            return;
        }

        $_ENV[$key]    = $value;
        $_SERVER[$key] = $value;
        putenv("{$key}={$value}");
    }

    protected function restoreEnvironmentFlags(): void
    {
        foreach ($this->originalEnvironmentFlags as $key => $value) {
            if ($value === false) {
                unset($_ENV[$key], $_SERVER[$key]);
                putenv($key);

                continue;
            }

            $_ENV[$key]    = $value;
            $_SERVER[$key] = $value;
            putenv("{$key}={$value}");
        }

        $this->originalEnvironmentFlags = [];
    }
}
