<?php

namespace Tests\Unit;

use App\Providers\EventServiceProvider;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Tests\TestCase;

class EventServiceProviderTest extends TestCase
{
    public function test_registered_event_sends_email_verification(): void
    {
        $provider = new EventServiceProvider($this->app);

        $listen = $provider->listens();

        $this->assertArrayHasKey(Registered::class, $listen);
        $this->assertContains(SendEmailVerificationNotification::class, $listen[Registered::class]);
    }
}
