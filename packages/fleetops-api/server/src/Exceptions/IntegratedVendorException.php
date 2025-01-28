<?php

namespace Fleetbase\FleetOps\Exceptions;

use Fleetbase\FleetOps\Models\IntegratedVendor;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;

/**
 * Class IntegratedVendorException.
 *
 * Custom exception class for IntegratedVendor-related exceptions.
 */
class IntegratedVendorException extends \Exception implements Responsable
{
    /**
     * @var IntegratedVendor|null the IntegratedVendor instance associated with the exception
     */
    public ?IntegratedVendor $integratedVendor;

    /**
     * @var string the trigger method that caused the exception
     */
    public string $triggerMethod;

    /**
     * IntegratedVendorException constructor.
     *
     * @param string                $message          the exception message
     * @param IntegratedVendor|null $integratedVendor the IntegratedVendor instance associated with the exception
     * @param string|null           $triggerMethod    the trigger method that caused the exception
     * @param int                   $code             the exception code
     * @param \Throwable|null       $previous         the previous throwable used for the exception chaining
     */
    public function __construct(string $message = '', ?IntegratedVendor $integratedVendor = null, ?string $triggerMethod = null, int $code = 400, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
        $this->integratedVendor = $integratedVendor;
        $this->triggerMethod    = $triggerMethod;
    }

    /**
     * Get the response representing the exception.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return JsonResponse
     */
    public function toResponse($request)
    {
        $errorMessage = $this->getMessage();

        return new JsonResponse(
            [
                'errors'             => [$errorMessage],
                'integratedVendorId' => data_get($this->integratedVendor, 'uuid'),
            ],
            400
        );
    }
}
