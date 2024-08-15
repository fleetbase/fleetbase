<?php

namespace Fleetbase\Twilio\Tests;

use Fleetbase\Twilio\Commands\TwilioSmsCommand;
use PHPUnit\Framework\TestCase;

class TwilioSmsCommandTest extends TestCase
{
    /**
     * Test the name of the command.
     */
    public function testName()
    {
        // Arrange
        $stub = $this->createMock('Fleetbase\Twilio\TwilioInterface');
        $command = new TwilioSmsCommand($stub);

        // Act
        $name = $command->getName();

        // Assert
        $this->assertEquals('twilio:sms', $name);
    }
}
