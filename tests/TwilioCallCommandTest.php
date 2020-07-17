<?php
namespace Aloha\Twilio\Tests;

use Aloha\Twilio\Commands\TwilioCallCommand;
use PHPUnit\Framework\TestCase;

class TwilioCallCommandTest extends TestCase
{
    /**
     * Test the name of the command
     */
    public function testName()
    {
        // Arrange
        $stub = $this->createMock('Aloha\Twilio\TwilioInterface');
        $command = new TwilioCallCommand($stub);

        // Act
        $name = $command->getName();

        // Assert
        $this->assertEquals('twilio:call', $name);
    }
}
