<?php

namespace Fleetbase\Jobs;

use Fleetbase\Models\ApiCredential;
use Fleetbase\Models\ApiRequestLog;
use Fleetbase\Support\Utils;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\ResponseCache\Facades\ResponseCache;

class LogApiRequest implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * The API Request/JsonResponse payload.
     *
     * @var array
     */
    public $payload;

    /**
     * The db connection to log rquest on.
     *
     * @var string
     */
    public $dbConnection;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct(array $payload, string $session)
    {
        $this->dbConnection = $session;
        $this->payload      = $payload;
    }

    /**
     * Log the API request w/ serialized payload.
     *
     * @return void
     */
    public function handle()
    {
        ApiRequestLog::on($this->dbConnection)->create($this->payload);
        ResponseCache::clear();
    }

    /**
     * Converts a Request and Response instance into a loggable array.
     *
     * @param JsonResponse|Response $response
     */
    public static function getPayload(Request $request, $response): array
    {
        // Prepare the payload
        $payload = [];

        // get response content
        $content = json_decode($response->content());

        // Get request/response relations
        $related = [];

        // If response has a `id` property push to related
        if (Utils::get($content, 'id')) {
            $related[] = Utils::get($content, 'id');
        }

        // Get api credential from session
        $apiCredential = session('api_credential');

        // Validate api credential, if not uuid then it could be internal
        if ($apiCredential && Str::isUuid($apiCredential) && ApiCredential::where('uuid', session('api_credential'))->exists()) {
            $payload['api_credential_uuid'] = $apiCredential;
        }

        // Check if it was a personal access token which made the request
        if ($apiCredential && is_numeric($apiCredential) && PersonalAccessToken::where('id', $apiCredential)->exists()) {
            $payload['access_token_id'] = (int) $apiCredential;
        }

        // Get request duration
        $duration = round(microtime(true) - LARAVEL_START, 13);

        // Finalize payload
        $payload = array_merge($payload, [
            '_key'                => session('api_key'),
            'company_uuid'        => session('company'),
            'method'              => $request->method(),
            'path'                => $request->path(),
            'full_url'            => $request->url(),
            'status_code'         => $response->getStatusCode() ?? 500,
            'reason_phrase'       => static::getResponseStatusText($response) ?? 'ERR',
            'duration'            => $duration,
            'ip_address'          => $request->ip(),
            'version'             => config('api.version'),
            'source'              => $request->header('User-Agent'),
            'content_type'        => $request->header('Content-Type'),
            'related'             => $related,
            'query_params'        => $request->query(),
            'request_headers'     => getallheaders(),
            'request_body'        => $request->all() ?? [],
            'request_raw_body'    => $request->getContent(),
            'response_headers'    => static::getResponseHeaders($response),
            'response_body'       => $content,
            'response_raw_body'   => $response->content(),
        ]);

        return $payload;
    }

    /**
     * Returns the current request session environment.
     */
    public static function getSession(): string
    {
        return session('is_sandbox') ? 'sandbox' : 'mysql';
    }

    /**
     * Array of response headers.
     *
     * @param Response $response
     *
     * @return array
     */
    public static function getResponseStatusText($response)
    {
        return $response::$statusTexts[$response->getStatusCode()] ?? 'ERR';
    }

    /**
     * Array of response headers.
     *
     * @param Response $response
     *
     * @return array
     */
    public static function getResponseHeaders($response)
    {
        $headers        = [];
        $resposeHeaders = collect($response->headers->all())
            ->map(function ($header) {
                return Arr::first($header);
            })
            ->toArray();

        foreach ($resposeHeaders as $header => $value) {
            $headers[Str::title($header)] = $value;
        }

        return $headers;
    }
}
