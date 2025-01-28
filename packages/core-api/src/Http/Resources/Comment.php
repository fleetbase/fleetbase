<?php

namespace Fleetbase\Http\Resources;

use Fleetbase\Support\Http;

class Comment extends FleetbaseResource
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
            'id'                    => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'                  => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'             => $this->when(Http::isInternalRequest(), $this->public_id),
            'company_uuid'          => $this->when(Http::isInternalRequest(), $this->company_uuid),
            'author_uuid'           => $this->when(Http::isInternalRequest(), $this->author_uuid),
            'parent_comment_uuid'   => $this->when(Http::isInternalRequest(), $this->parent_comment_uuid),
            'subject_uuid'          => $this->when(Http::isInternalRequest(), $this->subject_uuid),
            'subject_type'          => $this->when(Http::isInternalRequest(), $this->subject_type),
            'content'               => $this->content,
            'tags'                  => $this->tags,
            'meta'                  => $this->meta,
            'author'                => new Author($this->author),
            'replies'               => static::collection($this->replies),
            'editable'              => $this->when(Http::isInternalRequest(), $request->hasSession() && session('user') === $this->author_uuid),
            'updated_at'            => $this->updated_at,
            'created_at'            => $this->created_at,
            'deleted_at'            => $this->deleted_at,
        ];
    }
}
