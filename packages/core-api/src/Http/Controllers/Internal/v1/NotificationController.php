<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\FleetbaseController;
use Fleetbase\Models\Notification;
use Fleetbase\Models\Setting;
use Fleetbase\Support\NotificationRegistry;
use Illuminate\Http\Request;

/**
 * Controller for managing notifications.
 */
class NotificationController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'notification';

    /**
     * Receives an array of ID's for notifications which should be marked as read.
     *
     * @param Request $request the HTTP request object
     *
     * @return \Illuminate\Http\Response the HTTP response
     */
    public function markAsRead(Request $request)
    {
        $notifications = $request->input('notifications');
        $total         = count($notifications);
        $read          = [];

        foreach ($notifications as $id) {
            $notification = Notification::where('id', $id)->first();

            if ($notification) {
                $read[] = $notification->markAsRead();
            }
        }

        return response()->json([
            'status'         => 'ok',
            'message'        => 'Notifications marked as read',
            'marked_as_read' => count($read),
            'total'          => $total,
        ]);
    }

    /**
     * Receives an array of ID's for notifications which should be marked as read.
     *
     * @return \Illuminate\Http\Response the HTTP response
     */
    public function markAllAsRead()
    {
        $notifications = Notification::where('notifiable_id', session('user'))->get();

        foreach ($notifications as $notification) {
            $notification->markAsRead();
        }

        return response()->json([
            'status'  => 'ok',
            'message' => 'All notifications marked as read',
        ]);
    }

    /**
     * Deletes a single notification.
     *
     * @param int $notificationId the ID of the notification to delete
     *
     * @return \Illuminate\Http\Response the HTTP response
     */
    public function deleteNotification($notificationId)
    {
        $notification = Notification::find($notificationId);

        if ($notification) {
            $notification->deleteNotification();

            return response()->json(['message' => 'Notification deleted successfully'], 200);
        } else {
            return response()->json(['error' => 'Notification not found'], 404);
        }
    }

    /**
     * Deletes all notifications for the authenticated user.
     *
     * @param Request $request the HTTP request object
     *
     * @return \Illuminate\Http\Response the HTTP response
     */
    public function bulkDelete(Request $request)
    {
        $notifications = $request->input('notifications');

        if (empty($notifications)) {
            Notification::where('notifiable_id', session('user'))->delete();
        } else {
            Notification::whereIn('id', $notifications)->delete();
        }

        return response()->json([
            'status'  => 'ok',
            'message' => 'Selected notifications deleted successfully',
        ]);
    }

    /**
     * Get the list of registered notifications from the NotificationRegistry.
     *
     * @return \Illuminate\Http\JsonResponse The JSON response
     */
    public function registry()
    {
        return response()->json(NotificationRegistry::$notifications);
    }

    public function notifiables()
    {
        return response()->json(NotificationRegistry::getNotifiables());
    }

    /**
     * Save user notification settings.
     *
     * @param Request $request the HTTP request object containing the notification settings data
     *
     * @return \Illuminate\Http\JsonResponse a JSON response
     *
     * @throws \Exception if the provided notification settings data is not an array
     */
    public function saveSettings(Request $request)
    {
        $notificationSettings = $request->input('notificationSettings');
        if (!is_array($notificationSettings)) {
            throw new \Exception('Invalid notification settings data.');
        }
        Setting::configure('notification_settings', $notificationSettings);

        return response()->json([
            'status'  => 'ok',
            'message' => 'Notification settings succesfully saved.',
        ]);
    }

    /**
     * Retrieve and return the notification settings for the user.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getSettings()
    {
        $notificationSettings = Setting::lookup('notification_settings');

        return response()->json([
            'status'               => 'ok',
            'message'              => 'Notification settings successfully fetched.',
            'notificationSettings' => $notificationSettings,
        ]);
    }
}
