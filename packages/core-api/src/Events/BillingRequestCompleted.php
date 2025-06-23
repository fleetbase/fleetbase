<?php
namespace Fleetbase\Events;

// use App\Models\BillingRequest;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
class BillingRequestCompleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public BillingRequest $billingRequest)
    {
        //
    }
}