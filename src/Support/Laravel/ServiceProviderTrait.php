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
        $this->app->singleton('twilio', function () {
            $config = $this->config();

            return new Manager($config['default'], $config['connections']);
        });

        // Define an alias.
        $this->app->alias('twilio', \Aloha\Twilio\Manager::class);

        // Register Twilio Test SMS Command.
        $this->app->singleton('twilio.sms', \Aloha\Twilio\Commands\TwilioSmsCommand::class);

        // Register Twilio Test Call Command.
        $this->app->singleton('twilio.call', \Aloha\Twilio\Commands\TwilioCallCommand::class);

        // Register TwilioInterface concretion.
        $this->app->singleton(\Aloha\Twilio\TwilioInterface::class, function () {
            return $this->app->make('twilio')->defaultConnection();
        });
    }
}
