<?php

namespace App\MultiPickup\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RiderNotificationService
{
    public function notify(string $event, array $payload): void
    {
        $url = config('commission.rider_notification_webhook_url');

        if (blank($url)) {
            Log::info('Multi-pickup notification queued without webhook target.', [
                'event' => $event,
                'payload' => $payload,
            ]);

            return;
        }

        try {
            Http::timeout(5)->post($url, [
                'event' => $event,
                'payload' => $payload,
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Failed to deliver multi-pickup notification.', [
                'event' => $event,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
