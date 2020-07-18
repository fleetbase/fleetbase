<?php

namespace Aloha\Twilio\Commands;

use Aloha\Twilio\TwilioInterface;
use Illuminate\Console\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputOption;

class TwilioCallCommand extends Command
{
    /**
     * The console command name.
     *
     * @var string
     */
    protected $name = 'twilio:call';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Twilio command to test Twilio Call API Integration.';

    /**
     * @var TwilioInterface
     */
    protected $twilio;

    /**
     * Create a new command instance.
     *
     * @param TwilioInterface $twilio
     */
    public function __construct(TwilioInterface $twilio)
    {
        parent::__construct();

        $this->twilio = $twilio;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->line('Creating a call via Twilio to: '.$this->argument('phone'));

        // Grab options
        $from = $this->option('from');
        $url = $this->option('url');

        // Set a default URL if we haven't specified one since is mandatory.
        if (is_null($url)) {
            $url = 'http://demo.twilio.com/docs/voice.xml';
        }

        $this->twilio->call($this->argument('phone'), $url, [], $from);
    }

    /**
     * Get the console command arguments.
     *
     * @return array
     */
    protected function getArguments(): array
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
    protected function getOptions(): array
    {
        return [
            ['url', null, InputOption::VALUE_OPTIONAL, 'Optional url that will be used to fetch xml for call.', null],
            ['from', null, InputOption::VALUE_OPTIONAL, 'Optional from number that will be used.', null],
        ];
    }
}
