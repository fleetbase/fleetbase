<?php

namespace Fleetbase\Http\Resources;

use Fleetbase\Support\Http;

class File extends FleetbaseResource
{
    /**
     * Transform the resource into an array.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        return [
            'id'                         => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'                       => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'                  => $this->when(Http::isInternalRequest(), $this->public_id),
            'company_uuid'               => $this->when(Http::isInternalRequest(), $this->company_uuid),
            'url'                        => $this->url,
            'original_filename'          => $this->original_filename,
            'folder'                     => $this->folder,
            'content_type'               => $this->content_type,
            'file_size'                  => $this->file_size,
            'caption'                    => $this->caption,
            'type'                       => $this->type,
            'meta'                       => data_get($this, 'meta', []),
            'updated_at'                 => $this->updated_at,
            'created_at'                 => $this->created_at,
        ];
    }
}
