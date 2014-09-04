<?php

namespace Aloha\Twilio\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;
use Aloha\Twilio;

class TwilioCallCommand extends Command {

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
    protected $description = 'Twilio command to test Twilio API Integration.';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return void
     */
    public function fire()
    {
        $this->line('Creating a call via Twilio to: '.$this->argument('phone'));

        // Grab options
        $from = $this->option('from');
        $url = $this->option('url');

        // Set a default URL if we havent specified one since is mandatory.
        if(is_null($url)) {
            $url = 'http://demo.twilio.com/docs/voice.xml';
        }

        \Twilio::call($this->argument('phone'), $url, array(), $from);
    }

    /**
     * Get the console command arguments.
     *
     * @return array
     */
    protected function getArguments()
    {
        return array(
            array('phone', InputArgument::REQUIRED, 'The phone number that will receive a test message.'),
        );
    }

    /**
     * Get the console command options.
     *
     * @return array
     */
    protected function getOptions()
    {
        return array(
            array('url', null, InputOption::VALUE_OPTIONAL, 'Optional url that will be used to fetch xml for call.', null),
            array('from', null, InputOption::VALUE_OPTIONAL, 'Optional from number that will be used.', null)
        );
    }

}
