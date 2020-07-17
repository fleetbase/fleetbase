<?php

namespace Aloha\Twilio\Support\Laravel;

use Aloha\Twilio\Commands\TwilioCallCommand;
use Aloha\Twilio\Commands\TwilioSmsCommand;
use Aloha\Twilio\Manager;
use Aloha\Twilio\TwilioInterface;
use Illuminate\Foundation\Application;
use Illuminate\Support\ServiceProvider as BaseServiceProvider;

class ServiceProvider extends BaseServiceProvider
{
    /**
     * Register the service provider.
     */
    public function register()
    {
        // Register manager for usage with the Facade.
        $this->app->singleton('twilio', function() {
            $config = $this->app['config']->get('twilio.twilio');

            return new Manager($config['default'], $config['connections']);
        });

        // Define an alias.
        $this->app->alias('twilio', Manager::class);

        // Register Twilio Test SMS Command.
        $this->app->singleton('twilio.sms', TwilioSmsCommand::class);

        // Register Twilio Test Call Command.
        $this->app->singleton('twilio.call', TwilioCallCommand::class);

        // Register TwilioInterface concretion.
        $this->app->singleton(TwilioInterface::class, function() {
            return $this->app->make('twilio')->defaultConnection();
        });
    }

    /**
     * Boot method.
     */
    public function boot()
    {
        $this->publishes([
            __DIR__.'/../../config/config.php' => config_path('twilio.php'),
        ], 'config');

        $this->mergeConfigFrom(__DIR__.'/../../config/config.php', 'twilio');

        $this->commands([
            TwilioCallCommand::class,
            TwilioSmsCommand::class,
        ]);
    }
}
