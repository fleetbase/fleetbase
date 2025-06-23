<?php
namespace Fleetbase\Http\Controllers\Internal\v1;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Fleetbase\Services\GoCardlessWebhookService;
use Exception;

class GoCardlessWebhookController extends Controller
{
    protected $webhookService;

    public function __construct(GoCardlessWebhookService $webhookService)
    {
        $this->webhookService = $webhookService;
    }

    public function handle(Request $request)
    {
       
        try {
            // Verify webhook signature
            if (!$this->verifyWebhookSignature($request)) {
                echo "Inside GoCardless webhook signature verification failed";
                Log::warning('GoCardless webhook signature verification failed');
                return response('Unauthorized', 401);
            }

            // Process webhook events
            $events = $request->json('events', []);
            print_r($events);
            foreach ($events as $event) {
                $this->webhookService->processEvent($event);
            }

            return response('OK', 200);
           
        } catch (Exception $e) {
            Log::error('GoCardless webhook processing failed: ' . $e->getMessage());
            return response('Internal Server Error', 500);
        }
    }

    private function verifyWebhookSignature(Request $request): bool
    {
        $providedSignature = $request->header('Webhook-Signature');
        $body = $request->getContent();
        $secret = config('services.gocardless.webhook_secret');

        if (!$providedSignature || !$secret) {
            return false;
        }

        $calculatedSignature = hash_hmac('sha256', $body, $secret);
        
        return hash_equals($calculatedSignature, $providedSignature);
    }
}