<?php

namespace Tests\Unit\Console;

use App\Console\Kernel;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Console\Kernel as KernelContract;
use ReflectionMethod;
use Tests\TestCase;

/**
 * commands() runs during bootstrap, but schedule() is only ever called by the
 * scheduler, so nothing in the suite reached it. The app defines no scheduled
 * commands today (cron work is driven by go-crond, see api/crontab), and this
 * asserts exactly that: registering one here without wiring the scheduler would
 * silently never run.
 */
class KernelTest extends TestCase
{
    public function test_the_application_defines_no_laravel_scheduled_commands(): void
    {
        $kernel = $this->app->make(KernelContract::class);
        $this->assertInstanceOf(Kernel::class, $kernel);

        $schedule = new Schedule();

        $method = new ReflectionMethod($kernel, 'schedule');
        $method->setAccessible(true);
        $method->invoke($kernel, $schedule);

        $this->assertSame([], $schedule->events());
    }
}
