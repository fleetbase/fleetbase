<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\FleetbaseController;
use Fleetbase\Http\Requests\Internal\DownloadFileRequest;
use Fleetbase\Http\Requests\Internal\UploadBase64FileRequest;
use Fleetbase\Http\Requests\Internal\UploadFileRequest;
use Fleetbase\Models\File;
use Fleetbase\Support\Utils;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'file';

    /**
     * Handle file uploads.
     *
     * @return \Illuminate\Http\Response
     */
    public function upload(UploadFileRequest $request)
    {
        $disk        = $request->input('disk', config('filesystems.default'));
        $bucket      = $request->input('bucket', config('filesystems.disks.' . $disk . '.bucket', config('filesystems.disks.s3.bucket')));
        $type        = $request->input('type');
        $size        = $request->input('file_size', $request->file->getSize());
        $path        = $request->input('path', 'uploads');

        // Generate a filename
        $fileName = File::randomFileNameFromRequest($request);

        // Upload the file to storage disk
        try {
            $path = $request->file->storeAs($path, $fileName, ['disk' => $disk]);
        } catch (\Throwable $e) {
            return response()->error($e->getMessage());
        }

        // If file upload failed
        if ($path === false) {
            return response()->error('File upload failed.');
        }

        // Create a file record
        try {
            $file = File::createFromUpload($request->file, $path, $type, $size, $disk, $bucket);
        } catch (\Throwable $e) {
            return response()->error($e->getMessage());
        }

        // Set the subject if specified
        $file->setSubjectFromRequest($request);

        // Done ✓
        return response()->json(
            [
                'file' => $file,
            ]
        );
    }

    /**
     * Handle file upload of base64.
     *
     * @return \Illuminate\Http\Response
     */
    public function uploadBase64(UploadBase64FileRequest $request)
    {
        $disk        = $request->input('disk', config('filesystems.default'));
        $bucket      = $request->input('bucket', config('filesystems.disks.' . $disk . '.bucket', config('filesystems.disks.s3.bucket')));
        $data        = $request->input('data');
        $path        = $request->input('path', 'uploads');
        $fileName    = $request->input('file_name');
        $fileType    = $request->input('file_type', 'image');
        $contentType = $request->input('content_type', 'image/png');
        $subjectId   = $request->input('subject_uuid');
        $subjectType = $request->input('subject_type');

        if (!$data) {
            return response()->error('Oops! Looks like nodata was provided for upload.', 400);
        }

        // Correct $path for uploads
        if (Str::startsWith($path, 'uploads') && $disk === 'uploads') {
            $path = str_replace('uploads/', '', $path);
        }

        // Set the full file path
        $fullPath = $path . '/' . $fileName;
        $uploaded = false;

        // Upload file to path
        try {
            $uploaded = Storage::disk($disk)->put($fullPath, base64_decode($data));
        } catch (\Throwable $e) {
            return response()->error($e->getMessage());
        }

        // If file upload failed
        if ($uploaded === false) {
            return response()->error('File upload failed.');
        }

        // Create file record for upload
        try {
            $file = File::create([
                'company_uuid'      => session('company'),
                'uploader_uuid'     => session('user'),
                'subject_uuid'      => $subjectId,
                'subject_type'      => Utils::getMutationType($subjectType),
                'disk'              => $disk,
                'original_filename' => basename($fullPath),
                'extension'         => 'png',
                'content_type'      => $contentType,
                'path'              => $fullPath,
                'bucket'            => $bucket,
                'type'              => $fileType,
                'size'              => Utils::getBase64ImageSize($data),
            ]);
        } catch (\Throwable $e) {
            return response()->error($e->getMessage());
        }

        // Done ✓
        return response()->json(
            [
                'file' => $file,
            ]
        );
    }

    /**
     * Handle file download.
     *
     * @return \Illuminate\Http\Response
     */
    public function download(?string $id, DownloadFileRequest $request)
    {
        $disk = $request->input('disk', config('filesystems.default'));
        $file = File::where('uuid', $id)->first();
        /** @var \Illuminate\Filesystem\FilesystemAdapter $filesystem */
        $filesystem = Storage::disk($disk);

        return $filesystem->download($file->path, $file->original_filename);
    }
}
