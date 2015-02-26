<?php
namespace Aloha\Twilio\Support\Laravel;

use Illuminate\Support\ServiceProvider as BaseServiceProvider;

class ServiceProvider extends BaseServiceProvider
{
    /**
     * Boot Method
     */
    public function boot()
    {
        // Register commands.
        $this->commands('twilio.sms', 'twilio.call');
    }

    /**
     * Register the service provider.
     */
    public function register()
    {
        // Register manager for usage with the Facade.
        $this->app->singleton('twilio', function ($app) {
            $config = $app['config']->get('services.twilio');
            return new Manager($config['default'], $config['connections']);
        });

        // Define an alias.
        $this->app->alias('twilio', 'Aloha\Twilio\Manager');

        // Register Twilio Test SMS Command.
        $this->app->singleton('twilio.sms', 'Aloha\Twilio\Commands\TwilioSmsCommand');

        // Register Twilio Test Call Command.
        $this->app->singleton('twilio.call', 'Aloha\Twilio\Commands\TwilioCallCommand');

        // Register TwilioInterface concretion.
        $this->app->singleton('Aloha\Twilio\TwilioInterface', function ($app) {
            return $app->make('twilio')->defaultConnection();
        });
    }
}
