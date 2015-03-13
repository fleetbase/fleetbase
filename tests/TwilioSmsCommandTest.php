<?php
namespace Aloha\Twilio\Tests;

use Aloha\Twilio\Commands\TwilioSmsCommand;
use PHPUnit_Framework_TestCase;

class TwilioSmsCommandTest extends PHPUnit_Framework_TestCase
{
    /**
     * Test the name of the command
     */
    public function testName()
    {
        // Arrange
        $stub = $this->getMock('Aloha\Twilio\TwilioInterface');
        $command = new TwilioSmsCommand($stub);

        // Act
        $name = $command->getName();

        // Assert
        $this->assertEquals('twilio:sms', $name);
    }
}
