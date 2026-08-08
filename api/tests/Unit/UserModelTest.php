<?php

namespace Tests\Unit;

use App\Models\User;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    public function test_mass_assignable_attributes(): void
    {
        $user = new User();

        $this->assertSame(['name', 'email', 'password'], $user->getFillable());
    }

    public function test_hidden_attributes_are_not_serialized(): void
    {
        $user = new User();

        $this->assertContains('password', $user->getHidden());
        $this->assertContains('remember_token', $user->getHidden());
    }

    public function test_email_verified_at_is_cast_to_datetime(): void
    {
        $user = new User();

        $this->assertArrayHasKey('email_verified_at', $user->getCasts());
        $this->assertSame('datetime', $user->getCasts()['email_verified_at']);
    }
}
