<?php

namespace App\Helpers;

use App\Models\User;

class UserHelper
{
    public static function getIdFromUuid(string $uuid): ?int
    {
        return User::where('uuid', $uuid)->value('id');
    }
}
