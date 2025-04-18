<?php

namespace Fleetbase\Http\Controllers\Api\v1;

use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Http\Requests\Internal\DownloadFileRequest;
use Fleetbase\Http\Requests\Internal\UploadBase64FileRequest;
use Fleetbase\Http\Requests\Internal\UploadFileRequest;
use Fleetbase\Http\Resources\DeletedResource;
use Fleetbase\Http\Resources\File as FileResource;
use Fleetbase\Models\File;
use Fleetbase\Support\Utils;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileController extends Controller
{
    /**
     * Creates a new Fleetbase File resource.
     *
     * @param \Fleetbase\Http\Requests\UploadFileRequest $request
     *
     * @return FileResource
     */
    public function create(UploadFileRequest $request)
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
            $path = $request->file->storeAs(
                $path,
                $fileName,
                [
                    'disk' => 'public',
                ]
            );
        } catch (\Throwable $e) {
            return response()->apiError($e->getMessage());
        }

        // If file upload failed
        if ($path === false) {
            return response()->apiError('File upload failed.');
        }

        // Create a file record
        try {
            $file = File::createFromUpload($request->file, $path, $type, $size, $disk, $bucket);
        } catch (\Throwable $e) {
            return response()->apiError($e->getMessage());
        }

        // Set the subject ID specified
        $file->setSubjectFromRequest($request);
        // Response the File resource
        return new FileResource($file);
    }

    /**
     * Create a file using base64 data.
     *
     * @param \Fleetbase\Http\Requests\UploadBase64FileRequest $request
     *
     * @return FileResource
     */
    public function createFromBase64(UploadBase64FileRequest $request)
    {
        $disk        = $request->input('disk', config('filesystems.default'));
        $bucket      = $request->input('bucket', config('filesystems.disks.' . $disk . '.bucket', config('filesystems.disks.s3.bucket')));
        $data        = $request->input('data');
        $path        = $request->input('path', 'uploads');
        $fileName    = $request->input('file_name');
        $fileType    = $request->input('file_type', 'image');
        $contentType = $request->input('content_type', 'image/png');

        if (!$data) {
            return response()->apiError('Oops! Looks like nodata was provided for upload.', 400);
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
            return response()->apiError($e->getMessage());
        }

        // If file upload failed
        if ($uploaded === false) {
            return response()->apiError('File upload failed.');
        }

        // Create file record for upload
        try {
            $file = File::create([
                'company_uuid'      => session('company'),
                'uploader_uuid'     => session('user'),
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

        // Set the subject ID specified
        $file->setSubjectFromRequest($request);

        // Response the File resource
        return new FileResource($file);
    }

    /**
     * Handle file download.
     *
     * @return \Illuminate\Http\Response
     */
    public function download(?string $id, DownloadFileRequest $request)
    {
        $disk = $request->input('disk', config('filesystems.default'));

        // Find for the file
        try {
            $file = File::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'File resource not found.',
                ],
                404
            );
        }

        /** @var \Illuminate\Filesystem\FilesystemAdapter $filesystem */
        $filesystem = Storage::disk($disk);

        return $filesystem->download($file->path, $file->original_filename);
    }

    /**
     * Updates a Fleetbase File resource.
     *
     * @param string $id
     *
     * @return FileResource
     */
    public function update($id, Request $request)
    {
        // Find for the file
        try {
            $file = File::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'File resource not found.',
                ],
                404
            );
        }

        // Get request input
        $input = $request->only(['caption', 'meta']);
        if ($input) {
            $file->update($input);
        }

        // If attempting to rename file
        $filename = $request->input('filename');
        if ($filename) {
            $file->update(['original_filename' => $filename]);
        }

        // Response the File resource
        return new FileResource($file);
    }

    /**
     * Query for Fleetbase Contact resources.
     *
     * @return \Fleetbase\Http\Resources\ContactCollection
     */
    public function query(Request $request)
    {
        $results = File::queryWithRequest($request);

        return FileResource::collection($results);
    }

    /**
     * Finds a single Fleetbase File resources.
     *
     * @return FileResource
     */
    public function find($id)
    {
        // Find for the File
        try {
            $file = File::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'File resource not found.',
                ],
                404
            );
        }

        // Response the File resource
        return new FileResource($file);
    }

    /**
     * Deletes a Fleetbase File resources.
     *
     * @return FileResource
     */
    public function delete($id)
    {
        // Finde for the File
        try {
            $file = File::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'File resource not found.',
                ],
                404
            );
        }

        // Delete the File
        $file->delete();

        // Response the File deleted resource
        return new DeletedResource($file);
    }
}
