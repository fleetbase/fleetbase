<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Fleetbase\Http\Controllers\Controller;

class InvoicePdfDownloadController extends Controller
{
    public function download(Request $request, string $filename): Response|BinaryFileResponse
    {
        Log::info('PDF download requested', ['filename' => $filename]);
        
        try {
            // Validate filename
            if (!$this->isValidFilename($filename)) {
                Log::warning('Invalid filename requested', ['filename' => $filename]);
                return response('Invalid filename', 400);
            }

            $filePath = 'invoices/' . $filename;

            Log::info('Looking for PDF file in S3', [
                'filename' => $filename,
                'filePath' => $filePath,
                'exists' => Storage::disk('s3')->exists($filePath)
            ]);

            if (!Storage::disk('s3')->exists($filePath)) {
                Log::warning('PDF file not found in S3', [
                    'filename' => $filename,
                    'filePath' => $filePath
                ]);
                return response('PDF not found. File: ' . $filename, 404);
            }

            // Get file from S3
            $fileContent = Storage::disk('s3')->get($filePath);
            $fileSize = strlen($fileContent);
            
            Log::info('Serving PDF file from S3', [
                'filename' => $filename,
                'size' => $fileSize
            ]);

            return response($fileContent, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'Content-Length' => $fileSize,
                'Cache-Control' => 'private, max-age=3600', // Cache for 1 hour
            ]);

        } catch (\Throwable $e) {
            Log::error('Error serving PDF download from S3', [
                'filename' => $filename,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response('Download error: ' . $e->getMessage(), 500);
        }
    }

    public function view(Request $request, string $filename): Response
    {
        Log::info('PDF view requested', ['filename' => $filename]);
        
        try {
            // Validate filename
            if (!$this->isValidFilename($filename)) {
                Log::warning('Invalid filename requested for view', ['filename' => $filename]);
                return response('Invalid filename', 400);
            }

            $filePath = 'invoices/' . $filename;

            Log::info('Looking for PDF file in S3 for view', [
                'filename' => $filename,
                'filePath' => $filePath,
                'exists' => Storage::disk('s3')->exists($filePath)
            ]);

            if (!Storage::disk('s3')->exists($filePath)) {
                Log::warning('PDF file not found in S3 for view', [
                    'filename' => $filename,
                    'filePath' => $filePath
                ]);
                return response('PDF not found. File: ' . $filename, 404);
            }

            // Get file from S3
            $fileContent = Storage::disk('s3')->get($filePath);
            $fileSize = strlen($fileContent);
            
            Log::info('Serving PDF file from S3 for view', [
                'filename' => $filename,
                'size' => $fileSize
            ]);

            return response($fileContent, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . $filename . '"',
                'Content-Length' => $fileSize,
                'Cache-Control' => 'private, max-age=3600', // Cache for 1 hour
            ]);

        } catch (\Throwable $e) {
            Log::error('Error serving PDF view from S3', [
                'filename' => $filename,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response('View error: ' . $e->getMessage(), 500);
        }
    }

    private function isValidFilename(string $filename): bool
    {
        // Prevent directory traversal
        if (str_contains($filename, '..') || str_contains($filename, '/')) {
            return false;
        }

        // Must be a PDF file
        if (!str_ends_with($filename, '.pdf')) {
            return false;
        }

        return true;
    }

}