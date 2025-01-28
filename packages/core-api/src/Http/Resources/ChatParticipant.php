<?php

namespace Fleetbase\Http\Resources;

use Fleetbase\Support\Http;

class ChatParticipant extends FleetbaseResource
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
            'id'                                 => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'                               => $this->when(Http::isInternalRequest(), $this->uuid),
            'chat_channel_uuid'                  => $this->when(Http::isInternalRequest(), $this->chat_channel_uuid),
            'chat_channel'                       => $this->when(Http::isPublicRequest(), $this->chatChannel->public_id),
            'user_uuid'                          => $this->when(Http::isInternalRequest(), $this->user_uuid),
            'user'                               => $this->when(Http::isPublicRequest(), $this->user ? $this->user->public_id : null),
            'name'                               => $this->whenLoaded('user', fn () => $this->user->name),
            'username'                           => $this->whenLoaded('user', fn () => $this->user->username),
            'email'                              => $this->whenLoaded('user', fn () => $this->user->email),
            'phone'                              => $this->whenLoaded('user', fn () => $this->user->phone),
            'avatar_url'                         => $this->whenLoaded('user', fn () => $this->user->avatar_url),
            'is_online'                          => $this->is_online,
            'last_seen_at'                       => $this->last_seen_at,
            'updated_at'                         => $this->updated_at,
            'created_at'                         => $this->created_at,
            'deleted_at'                         => $this->deleted_at,
        ];
    }
}
