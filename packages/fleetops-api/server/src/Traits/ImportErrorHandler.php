<?php

namespace Fleetbase\FleetOps\Traits;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Fleetbase\FleetOps\Exports\ImportErrorsExport;
use Fleetbase\FleetOps\Models\ImportLog;
use App\Helpers\UserHelper;
use Illuminate\Support\Str;

trait ImportErrorHandler
{
    /**
     * Process import files with enhanced error handling
     *
     * @param array $files
     * @param string $module
     * @param callable $importCallback
     * @param array $validFileTypes
     * @return array
     */
    protected function processImportWithErrorHandling($files, $module, $importCallback, $validFileTypes = ['csv', 'tsv', 'xls', 'xlsx'])
    {
        $allErrors = [];
        $totalSuccessfulImports = 0;
        $totalCreated = 0;
        $totalUpdated = 0;
        $hasPartialSuccess = false;

        foreach ($files as $file) {
            // validate file type
            if (!in_array(pathinfo($file->path, PATHINFO_EXTENSION), $validFileTypes)) {
                $allErrors[] = ['N/A', 'Invalid file uploaded: ' . $file->name, 'N/A'];
                continue;
            }

            try {
                $result = $importCallback($file);
                
                // Convert JsonResponse to array if needed
                if ($result instanceof \Illuminate\Http\JsonResponse) {
                    $result = json_decode($result->getContent(), true);
                }

                if (!empty($result) && isset($result['errors'])) {
                    $errors = $result['errors'];
                    
                    // Track partial success information
                    if (isset($result['partial_success']) && $result['partial_success']) {
                        $hasPartialSuccess = true;
                        $totalSuccessfulImports += $result['successful_imports'] ?? 0;
                        $totalCreated += $result['created_' . $module] ?? 0;
                        $totalUpdated += $result['updated_' . $module] ?? 0;
                    }

                    // Append detailed errors
                    if (is_array($errors)) {
                        foreach ($errors as $error) {
                            if (is_array($error)) {
                                $allErrors[] = $error;
                            } else {
                                $allErrors[] = ['N/A', $error, 'N/A'];
                            }
                        }
                    } else {
                        $allErrors[] = ['N/A', $errors, 'N/A'];
                    }
                } else if (!empty($result) && isset($result['summary'])) {
                    $summary = $result['summary'];
                    $totalSuccessfulImports += $summary['total_processed'] ?? 0;
                    $totalCreated += $summary['created'] ?? 0;
                    $totalUpdated += $summary['updated'] ?? 0;
                }
            } catch (\Exception $e) {
                Log::error('File import failed', [
                    'file' => $file->name,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);

                $allErrors[] = ['N/A', 'File import failed for ' . $file->name . ': ' . $e->getMessage(), 'N/A'];
            }
        }

        return [
            'allErrors' => $allErrors,
            'totalSuccessfulImports' => $totalSuccessfulImports,
            'totalCreated' => $totalCreated,
            'totalUpdated' => $totalUpdated,
            'hasPartialSuccess' => $hasPartialSuccess
        ];
    }

    /**
     * Generate error export file and return response
     *
     * @param array $allErrors
     * @param string $module
     * @param string $fileUuid
     * @param array $stats
     * @return array
     */
    protected function generateErrorResponse($allErrors, $module, $fileUuid, $stats)
    {
        $timestamp = date('Y_m_d_H_i_s');
        $company = session('company');
        $fileName = "{$company}_{$module}_import_errors_{$timestamp}.xlsx";
        
        $headings = ['Row', 'Error', ucfirst($module) . ' Identifier'];
        Excel::store(new ImportErrorsExport($allErrors, $headings), $fileName, 's3');
        $url = Storage::url($fileName);
        
        if ($stats['hasPartialSuccess']) {
            $this->logImportResult($fileUuid, $module, 'PARTIALLY_COMPLETED', $fileName);
            return [
                'error_log_url' => $url,
                'message' => __('messages.partial_success'),
                'status' => 'partial_success',
                'successful_imports' => $stats['totalSuccessfulImports'],
                'created_' . $module => $stats['totalCreated'],
                'updated_' . $module => $stats['totalUpdated'],
                'total_errors' => count($allErrors),
                'errors' => $allErrors,
                'success' => false,
            ];
        } else {
            $this->logImportResult($fileUuid, $module, 'ERROR', $fileName);
            return [
                'error_log_url' => $url,
                'message' => __('messages.full_import_error'),
                'status' => 'error',
                'total_errors' => count($allErrors),
                'errors' => $allErrors,
                'success' => false,
            ];
        }
    }

    /**
     * Generate success response
     *
     * @param string $module
     * @param string $fileUuid
     * @param array $stats
     * @return array
     */
    protected function generateSuccessResponse($module, $fileUuid, $stats)
    {
        $this->logImportResult($fileUuid, $module, 'COMPLETED', null);
        return [
            'success' => true,
            'message' => "Import completed successfully. {$stats['totalCreated']} {$module} created, {$stats['totalUpdated']} {$module} updated.",
            'created_' . $module => $stats['totalCreated'],
            'updated_' . $module => $stats['totalUpdated'],
            'total_processed' => $stats['totalSuccessfulImports']
        ];
    }

    /**
     * Log the import result to the import_logs table.
     *
     * @param string $fileUuid
     * @param string $module
     * @param string $status
     * @param string|null $errorLogPath
     * @return void
     */
    protected function logImportResult(string $fileUuid, string $module, string $status, ?string $errorLogPath = null): void
    {
        ImportLog::create([
            'uuid' => Str::uuid(),
            'imported_file_uuid' => $fileUuid,
            'module' => $module,
            'status' => $status,
            'error_log_file_path' => $errorLogPath,
            'company_uuid' => session('company'),
            'created_by_id' => UserHelper::getIdFromUuid(auth()->id()),
        ]);
    }
    /**
     * The function `validateImportHeaders` checks if all required headers are present in the data and
     * returns a success status or error message accordingly.
     * 
     * @param array data The `data` parameter in the `validateImportHeaders` function is expected to be a
     * multidimensional array containing the data to be validated. The function assumes that the headers
     * are located in the first row of the first element of the array. Each element in the array represents
     * a row of data, and
     * @param array requiredHeaders The `validateImportHeaders` function takes in two parameters:
     * 
     * @return array An array is being returned. If there are missing required headers, the returned array
     * will have the following structure:
     */
    protected function validateImportHeaders(array $data, array $requiredHeaders): array
    {
        // Extract headers
        $headers = array_keys(collect($data[0][0] ?? [])->toArray());

        // Normalize headers
        $normalizedHeaders = array_map(function ($header) {
            return str_replace(' ', '_', strtolower(trim($header)));
        }, $headers);

        // Check for missing headers
        $missingHeaders = array_diff($requiredHeaders, $normalizedHeaders);

        if (!empty($missingHeaders)) {
            return [
                'success' => false,
                'errors' => [
                    'Import failed: Missing required headers: ' . implode(', ', $missingHeaders),
                ]
            ];
        }

        return ['success' => true];
    }

} 