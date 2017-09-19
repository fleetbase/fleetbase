<?php
namespace Aloha\Twilio\Commands;

use Aloha\Twilio\TwilioInterface;
use Illuminate\Console\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputOption;

class TwilioSmsCommand extends Command
{
    /**
     * The console command name.
     *
     * @var string
     */
    protected $name = 'twilio:sms';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Twilio command to test Twilio API Integration.';

    /**
     * @var \Aloha\Twilio\TwilioInterface
     */
    protected $twilio;

    /**
     * Create a new command instance.
     *
     * @param \Aloha\Twilio\TwilioInterface $twilio
     */
    public function __construct(TwilioInterface $twilio)
    {
        parent::__construct();
        $this->twilio = $twilio;
    }

    /**
     * Execute the console command.
     */
    public function fire()
    {
        $this->line('Sending SMS via Twilio to: '.$this->argument('phone'));

        // Grab the text option if specified
        $text = $this->option('text');

        // If we havent specified a message, setup a default one
        if (is_null($text)) {
            $text = 'This is a test message sent from the artisan console';
        }

        $this->line($text);

        $this->twilio->message($this->argument('phone'), $text);
    }

    /**
     * Proxy method for Laravel 5.1+
     */
    public function handle()
    {
        return $this->fire();
    }

    /**
     * Get the console command arguments.
     *
     * @return array
     */
    protected function getArguments()
    {
        return [
            ['phone', InputArgument::REQUIRED, 'The phone number that will receive a test message.'],
        ];
    }

    /**
     * Get the console command options.
     *
     * @return array
     */
    protected function getOptions()
    {
        return [
            ['text', null, InputOption::VALUE_OPTIONAL, 'Optional message that will be sent.', null],
        ];
    }
}
