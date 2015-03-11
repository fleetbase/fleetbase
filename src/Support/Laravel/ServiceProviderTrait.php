<?php
namespace Aloha\Twilio\Support\Laravel;

use Aloha\Twilio\Manager;

trait ServiceProviderTrait
{
    /**
     *
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