<?php
namespace Aloha\Twilio\Support\Laravel;

use Illuminate\Support\ServiceProvider as LaravelServiceProvider;

class L4ServiceProvider extends LaravelServiceProvider
{
    use ServiceProviderTrait;

    /**
     * Boot Method.
     */
    public function boot()
    {
        // Register commands.
        $this->commands('twilio.sms', 'twilio.call');
        $this->package('aloha/twilio');
    }

    protected function config()
    {
        return $this->app['config']->get('twilio::twilio');
    }
}
