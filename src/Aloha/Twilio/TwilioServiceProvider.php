<?php
namespace Aloha\Twilio;

use Illuminate\Support\ServiceProvider;

class TwilioServiceProvider extends ServiceProvider
{
    /**
     * Indicates if loading of the provider is deferred.
     *
     * @var bool
     */
    protected $defer = false;

    /**
     * Boot Method
     */
    public function boot()
    {
    }

    /**
     * Register the service provider.
     *
     * @return void
     */
    public function register()
    {
        $this->app['twilio'] = $this->app->share(function($app)
        {
            $config = $app['config']->get('services.twilio');
            return new Manager($config['default'], $config['connections']);
        });

        // Register Twilio Test SMS Command
        $this->app['twilio.sms'] = $this->app->share(function($app) {
            return new Commands\TwilioSmsCommand();
        });

        // Register Twilio Test Call Command
        $this->app['twilio.call'] = $this->app->share(function($app) {
            return new Commands\TwilioCallCommand();
        });

        $this->commands(
            'twilio.sms',
            'twilio.call'
        );
    }

    /**
     * Get the services provided by the provider.
     *
     * @return array
     */
    public function provides()
    {
        return array('twilio');
    }
}
