<?php

namespace Fleetbase\Exceptions;

use Fleetbase\Support\Utils;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Support\Facades\Log;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array
     */
    protected $dontReport = [];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array
     */
    protected $dontFlash = ['password', 'password_confirmation'];

    /**
     * Registers a custom exception handler for the application.
     *
     * This function integrates with Sentry to capture unhandled exceptions.
     * It utilizes the Laravel's reportable method to define how exceptions
     * should be reported. Any unhandled exception will be captured and sent
     * to Sentry for monitoring and troubleshooting.
     */
    public function register(): void
    {
        $this->reportable(
            function (\Throwable $e) {
                \Sentry\Laravel\Integration::captureUnhandledException($e);
            }
        );
    }

    /**
     * Handles unauthenticated request esxceptions.
     *
     * @param \Iluminate\Http\Request $request
     *
     * @return void
     */
    protected function unauthenticated($request, AuthenticationException $exception)
    {
        return response()->error('Unauthenticated.', 401);
    }

    /**
     * Report or log an exception.
     *
     * @return void
     *
     * @throws \Exception
     */
    public function report(\Throwable $exception)
    {
        // Log to CloudWatch
        Log::error($this->getCloudwatchLoggableException($exception));

        parent::report($exception);
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return \Symfony\Component\HttpFoundation\Response
     *
     * @throws \Throwable
     */
    public function render($request, \Throwable $exception)
    {
        if ($this->shouldManuallyHandleException($exception)) {
            return $this->manuallyHandleException($exception);
        }

        return parent::render($request, $exception);
    }

    /**
     * Retrieves a loggable message from an exception for CloudWatch.
     *
     * This function attempts to extract a loggable message from the given exception object.
     * It first checks if the exception has a 'getMessage' method and uses it if available.
     * If not, it attempts to JSON encode the exception. If all else fails, it returns
     * the base class name of the exception.
     *
     * @param \Throwable $exception the exception object to extract a loggable message from
     *
     * @return string|null the loggable message or class name of the exception, or null if none is found
     */
    public function getCloudwatchLoggableException(\Throwable $exception)
    {
        $output = null;

        if (empty($output)) {
            try {
                $output = json_encode(
                    [
                        'message' => $exception->getMessage(),
                        'code'    => $exception->getCode(),
                        'file'    => $exception->getFile(),
                        'line'    => $exception->getLine(),
                    ]
                );
            } catch (\Exception $e) {
                $output = null;
            }
        }

        if (empty($output) && method_exists($exception, 'getMessage')) {
            $output = $exception->getMessage();
        }

        if (empty($output)) {
            $output = class_basename($exception);
        }

        return $output;
    }

    /**
     * Check if the given exception should be manually handled.
     *
     * @param \Exception $exception the exception to check
     *
     * @return bool returns true if the exception should be manually handled, false otherwise
     */
    private function shouldManuallyHandleException(\Throwable $exception): bool
    {
        $type       = Utils::classBasename($exception);
        $exceptions = ['TokenMismatchException', 'ThrottleRequestsException', 'AuthenticationException', 'NotFoundHttpException'];

        return in_array($type, $exceptions);
    }

    /**
     * Manually handle the given exception and return an appropriate JSON response.
     *
     * @param \Exception $exception the exception to handle
     *
     * @return \Illuminate\Http\JsonResponse|null returns a JSON response if the exception is handled, null otherwise
     */
    private function manuallyHandleException(\Throwable $exception): ?\Illuminate\Http\JsonResponse
    {
        $type = Utils::classBasename($exception);

        switch ($type) {
            case 'TokenMismatchException':
                return response()->error('Invalid XSRF token sent with request.');

            case 'ThrottleRequestsException':
                return response()->error('Too many requests.');

            case 'AuthenticationException':
                return response()->error('Unauthenticated.');

            case 'NotFoundHttpException':
                return response()->error('There is nothing to see here.');

            default:
                return response()->error($exception->getMessage());
        }
    }
}
