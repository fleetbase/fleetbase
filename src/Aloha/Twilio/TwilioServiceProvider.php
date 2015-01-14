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
        $this->package('aloha/twilio');
        $this->app->alias('twilio', 'Aloha\Twilio\Twilio');
    }

    /**
	 * Register the service provider.
	 *
	 * @return void
	 */
	public function register()
	{
        $this->app->singleton('twilio', function ($app) {
            $config = $app->make('config')->get('twilio::twilio');
            return new Twilio($config['token'], $config['from'], $config['sid']);
        });

        // Register Twilio Test SMS Command
        $this->app->singleton('twilio.call', 'Aloha\Twilio\Commands\TwilioSmsCommand');

        // Register Twilio Test Call Command
        $this->app->singleton('twilio.call', 'Aloha\Twilio\Commands\TwilioCallCommand');

        $this->commands('twilio.sms', 'twilio.call');
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
