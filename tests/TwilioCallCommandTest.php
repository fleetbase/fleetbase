<?php
namespace Aloha\Twilio\Tests;

use Aloha\Twilio\Commands\TwilioCallCommand;
use PHPUnit_Framework_TestCase;

class TwilioCallCommandTest extends PHPUnit_Framework_TestCase
{
    /**
     * Test the name of the command
     */
    public function testName()
    {
        // Arrange
        $stub = $this->getMock('Aloha\Twilio\TwilioInterface');
        $command = new TwilioCallCommand($stub);

        // Act
        $name = $command->getName();

        // Assert
        $this->assertEquals('twilio:call', $name);
    }
}
