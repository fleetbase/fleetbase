<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\FleetbaseController;
use Fleetbase\Models\ChatChannel;
use Illuminate\Http\Request;

class ChatChannelController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'chat_channel';

    /**
     * Retrieves the unread message count for a specific chat channel.
     *
     * This method fetches a chat channel by its UUID and calculates the unread messages
     * for the authenticated user. It returns a JSON response with the count or an error
     * message if the chat channel is not found.
     *
     * @param string  $channelId the UUID of the chat channel
     * @param Request $request   the incoming request instance, containing the user information
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUnreadCountForChannel(string $channelId, Request $request)
    {
        $chatChannel = ChatChannel::where('uuid', $channelId)->first();
        if (!$chatChannel) {
            return response()->json(['error' => 'Chat channel not found.'], 404);
        }

        $unreadCount = $chatChannel->getUnreadMessageCountForUser($request->user());

        return response()->json(['unreadCount' => $unreadCount]);
    }

    /**
     * Retrieves the total unread message count across all chat channels for the current user.
     *
     * This method aggregates the unread messages for all channels in which the current user is a participant.
     * It returns the total unread count as a JSON response.
     *
     * @param Request $request the incoming request instance
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUnreadCount(Request $request)
    {
        $unreadCount  = 0;
        $userUuid     = $request->user()->uuid;
        $chatChannels = ChatChannel::whereHas('participants', function ($query) use ($userUuid) {
            $query->where('user_uuid', $userUuid);
        })->get();

        foreach ($chatChannels as $chatChannel) {
            $unreadCount += $chatChannel->getUnreadMessageCountForUser($request->user());
        }

        return response()->json(['unreadCount' => $unreadCount]);
    }
}
