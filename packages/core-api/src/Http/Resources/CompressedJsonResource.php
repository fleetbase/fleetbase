<?php

namespace Fleetbase\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Response;

class CompressedJsonResource extends JsonResource
{
    public function toResponse($request)
    {
        $data = $this->resolve($request);

        return Response::compressedJson($data);
    }
}
