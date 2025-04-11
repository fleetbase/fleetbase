<?php

namespace Fleetbase\Http\Resources;

use Fleetbase\Support\Http;

class ChatMessage extends FleetbaseResource
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
            'id'                                  => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'                                => $this->when(Http::isInternalRequest(), $this->uuid),
            'chat_channel_uuid'                   => $this->when(Http::isInternalRequest(), $this->chat_channel_uuid),
            'chat_channel'                        => $this->when(Http::isPublicRequest() && $this->chatChannel !== null, optional($this->chatChannel)->public_id),
            'sender_uuid'                         => $this->when(Http::isInternalRequest(), $this->sender_uuid),
            'sender'                              => $this->when(Http::isPublicRequest() && $this->sender !== null, optional($this->sender)->public_id),
            'content'                             => $this->content,
            'sender'                              => new ChatParticipant($this->sender),
            'attachments'                         => ChatAttachment::collection($this->attachments),
            'receipts'                            => ChatReceipt::collection($this->receipts),
            'updated_at'                          => $this->updated_at,
            'created_at'                          => $this->created_at,
            'deleted_at'                          => $this->deleted_at,
        ];
    }
}
