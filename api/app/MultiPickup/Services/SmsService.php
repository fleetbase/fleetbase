<?php

namespace App\MultiPickup\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    public function send(string $to, string $message): bool
    {
        $apiKey = config('commission.africastalking_api_key');
        $username = config('commission.africastalking_username', 'sandbox');

        if (blank($apiKey)) {
            Log::info('Skipping SMS send because no Africa\'s Talking key is configured.', [
                'to' => $to,
                'message' => $message,
            ]);

            return true;
        }

        $baseUrl = $username === 'sandbox'
            ? 'https://api.sandbox.africastalking.com/version1/messaging'
            : 'https://api.africastalking.com/version1/messaging';

        try {
            $response = Http::withHeaders([
                'apiKey' => $apiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/x-www-form-urlencoded',
            ])->asForm()->post($baseUrl, [
                'username' => $username,
                'to' => $to,
                'message' => $message,
            ]);

            return $response->successful();
        } catch (\Throwable $exception) {
            Log::warning('SMS delivery failed.', [
                'to' => $to,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }
}
