<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Exceptions\FleetbaseRequestValidationException;
use Fleetbase\Http\Controllers\FleetbaseController;
use Fleetbase\Models\ChatReceipt;
use Illuminate\Http\Request;

class ChatReceiptController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'chat_receipt';

    /**
     * Creates a record with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function createRecord(Request $request)
    {
        // Make sure no duplicate receipts are create
        $existingChatReceipt = ChatReceipt::where([
            'company_uuid'      => session('company'),
            'chat_message_uuid' => $request->input('chatReceipt.chat_message_uuid'),
            'participant_uuid'  => $request->input('chatReceipt.participant_uuid'),
        ])->first();
        if ($existingChatReceipt) {
            return ['chatReceipt' => new $this->resource($existingChatReceipt)];
        }

        try {
            $record = $this->model->createRecordFromRequest($request);

            return ['chatReceipt' => new $this->resource($record)];
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }
}
