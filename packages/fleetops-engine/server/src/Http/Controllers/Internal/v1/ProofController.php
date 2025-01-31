<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Http\Controllers\FleetOpsController;
use Fleetbase\FleetOps\Models\Entity;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Models\Proof;
use Fleetbase\FleetOps\Models\Waypoint;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Models\File;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProofController extends FleetOpsController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'proof';

    /**
     * Verify a QR code.
     *
     * @return void
     */
    public function verifyQrCode(string $publicId, Request $request)
    {
        $code = $request->input('code');
        $type = $request->input('type', strtok($publicId, '_'));

        switch ($type) {
            case 'order':
                $subject = Order::where('uuid', $code)->withoutGlobalScopes()->first();
                break;

            case 'waypoint':
                $subject = Waypoint::where('uuid', $code)->withoutGlobalScopes()->first();
                break;

            case 'entity':
                $subject = Entity::where('uuid', $code)->withoutGlobalScopes()->first();
                break;
        }

        if (!$subject) {
            return response()->error('Unable to validate QR code data.');
        }

        // validate
        if ($publicId === $subject->public_id) {
            // create verification proof
            $proof = Proof::create([
                'company_uuid' => session('company'),
                'subject_uuid' => $subject->uuid,
                'subject_type' => Utils::getModelClassName($subject),
                'remarks'      => 'Verified by QR Code Scan',
                'raw_data'     => $request->input('raw_data'),
                'data'         => $request->input('data'),
            ]);

            return response()->json([
                'status' => 'success',
                'proof'  => $proof->public_id,
            ]);
        }

        return response()->error('Unable to validate QR code data.');
    }

    /**
     * Validate a QR code.
     *
     * @return void
     */
    public function captureSignature(string $publicId, Request $request)
    {
        $signature = $request->input('signature');
        $type      = $request->input('type', strtok($publicId, '_'));

        switch ($type) {
            case 'order':
                $subject = Order::where('public_id', $publicId)->withoutGlobalScopes()->first();
                break;

            case 'waypoint':
                $subject = Waypoint::where('public_id', $publicId)->withoutGlobalScopes()->first();
                break;

            case 'entity':
                $subject = Entity::where('public_id', $publicId)->withoutGlobalScopes()->first();
                break;
        }

        if (!$subject) {
            return response()->error('Unable to capture signature data.');
        }

        // create proof instance
        $proof = Proof::create([
            'company_uuid' => session('company'),
            'subject_uuid' => $subject->uuid,
            'subject_type' => Utils::getModelClassName($subject),
            'remarks'      => 'Verified by Signature',
            'raw_data'     => $request->input('signature'),
        ]);

        // set the signature storage path
        $path = 'uploads/' . session('company') . '/signatures/' . $proof->public_id . '.png';

        // upload signature
        Storage::disk('s3')->put($path, base64_decode($signature), 'public');

        // create file record for upload
        $file = File::create([
            'company_uuid'      => session('company'),
            'uploader_uuid'     => session('user'),
            'name'              => basename($path),
            'original_filename' => basename($path),
            'extension'         => 'png',
            'content_type'      => 'image/png',
            'path'              => $path,
            'bucket'            => config('filesystems.disks.s3.bucket'),
            'type'              => 'signature',
            'size'              => Utils::getBase64ImageSize($signature),
        ])->setKey($proof);

        // set file to proof
        $proof->file_uuid = $file->uuid;
        $proof->save();

        return response()->json([
            'status' => 'success',
            'proof'  => $proof->public_id,
        ]);
    }
}
