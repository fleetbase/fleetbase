<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Exceptions\FleetbaseRequestValidationException;
use Fleetbase\Http\Controllers\FleetbaseController;
use Fleetbase\Models\ChatAttachment;
use Illuminate\Http\Request;

class ChatMessageController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'chat_message';

    /**
     * Creates a record with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function createRecord(Request $request)
    {
        try {
            $record = $this->model->createRecordFromRequest($request, null, function (&$request, &$chatMessage) {
                $attachmentFiles = $request->array('chatMessage.attachment_files');

                // If has attachment files create the attachments
                foreach ($attachmentFiles as $attachmentFileId) {
                    ChatAttachment::create([
                        'company_uuid'      => session('company'),
                        'chat_channel_uuid' => $chatMessage->chat_channel_uuid,
                        'chat_message_uuid' => $chatMessage->uuid,
                        'sender_uuid'       => $chatMessage->sender_uuid,
                        'file_uuid'         => $attachmentFileId,
                    ]);
                }
            });

            return ['chatMessage' => new $this->resource($record)];
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }
}
