<?php

namespace Fleetbase\Traits;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

trait HasPresence
{
    public function getPresenceCacheKey(): string
    {
        return 'last-seen-at:' . $this->getKey();
    }

    public function rememberPresence(): bool
    {
        $lastPresent = now();

        return Cache::put($this->getPresenceCacheKey(), $lastPresent);
    }

    public function forgetPresence(): bool
    {
        return Cache::delete($this->getPresenceCacheKey());
    }

    public function isPresent(): bool
    {
        $lastSeenAt = $this->lastSeenAt();
        if (!is_null($lastSeenAt) && $lastSeenAt->diffInMinutes(now()) < 2) {
            return true;
        }

        return false;
    }

    public function isOnline(): bool
    {
        return $this->isPresent();
    }

    public function lastSeenAt(): ?Carbon
    {
        $lastSeenAt = Cache::get($this->getPresenceCacheKey(), null);
        if ($lastSeenAt) {
            return Carbon::parse($lastSeenAt);
        }

        return $lastSeenAt;
    }
}
