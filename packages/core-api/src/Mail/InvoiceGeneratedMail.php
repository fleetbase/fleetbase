<?php

namespace Fleetbase\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Spatie\Browsershot\Browsershot;

class InvoiceGeneratedMail extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public array $invoice;
    public array $customer;
    private array $tempFiles = [];
    private ?array $pdfInfo = null;

    public function __construct(array $invoice, array $customer = [])
    {
        $this->invoice = $invoice;
        $this->customer = $customer;
    }

    public function __destruct()
    {
        // Clean up temporary files
        foreach ($this->tempFiles as $tempFile) {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }
    }
    private function getPdfInfo(): array
    {
        if ($this->pdfInfo === null) {
            $this->pdfInfo = $this->handlePdfGeneration();
        }
        return $this->pdfInfo;
    }
    public function envelope(): Envelope
    {
        $invoiceNumber = $this->invoice['invoice_number'] ?? 'Invoice #' . ($this->invoice['id'] ?? 'Unknown');
        $status = $this->invoice['status'] ?? 'unknown';
        
        if ($status === 'paid') {
            $subject = '✅ Invoice Paid Successfully - ' . $invoiceNumber;
        } else {
            $subject = '📄 New Invoice Generated - ' . $invoiceNumber;
        }
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        // Use memoized PDF info instead of calling handlePdfGeneration() directly
        $pdfInfo = $this->getPdfInfo();

        return new Content(
            markdown: 'fleetbase::mail.invoice-generated-multi-method',
            with: [
                'invoice' => $this->invoice,
                'customer' => $this->customer,
                'amount' => $this->invoice['amount_paid'] ?? 0,
                'currency' => $this->invoice['currency_code'] ?? 'USD',
                'status' => $this->invoice['status'] ?? 'unknown',
                'dueDate' => $this->invoice['due_date'] ?? null,
                'createdAt' => $this->invoice['created_at'] ?? null,
                'pdfDownloadUrl' => $pdfInfo['download_url'] ?? null,
                'pdfViewUrl' => $pdfInfo['view_url'] ?? null,
                'pdfAvailable' => $pdfInfo['available'] ?? false,
                'generationMethod' => $pdfInfo['method'] ?? 'none',
                'fallbackUrl' => $this->buildChargebeeViewUrl(),
            ]
        );
    }

    public function attachments(): array
    {
        $attachments = [];
        
        // Use memoized PDF info instead of calling handlePdfGeneration() directly
        $pdfInfo = $this->getPdfInfo();
        
        // Only attach PDF if we have a local file path (not using Chargebee direct URL)
        if (($pdfInfo['available'] ?? false) && ($pdfInfo['file_path'] ?? null) && ($pdfInfo['method'] ?? '') !== 'chargebee_direct_url') {
            try {
                // Get PDF content from S3
                $pdfContent = Storage::disk('s3')->get($pdfInfo['file_path']);
                
                if ($pdfContent) {
                    $fileName = basename($pdfInfo['file_path']);
                    
                    // Create a temporary file for the attachment
                    $tempPath = tempnam(sys_get_temp_dir(), 'invoice_') . '.pdf';
                    file_put_contents($tempPath, $pdfContent);
                    $this->tempFiles[] = $tempPath; // Track for cleanup
                    
                    $attachments[] = Attachment::fromPath($tempPath)
                        ->as($fileName)
                        ->withMime('application/pdf');
                    
                    Log::info('PDF attached to email', [
                        'filename' => $fileName,
                        'size' => strlen($pdfContent),
                        'generation_method' => $pdfInfo['method'] ?? 'unknown'
                    ]);
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to attach PDF to email', [
                    'error' => $e->getMessage(),
                    'file_path' => $pdfInfo['file_path'] ?? 'unknown',
                    'generation_method' => $pdfInfo['method'] ?? 'unknown'
                ]);
            }
        } else {
            Log::info('PDF not attached to email', [
                'reason' => $pdfInfo['method'] === 'chargebee_direct_url' ? 'using_direct_url' : 'no_file_path',
                'method' => $pdfInfo['method'] ?? 'unknown'
            ]);
        }
        
        return $attachments;
    }

    
    /**
     * Handle PDF generation using multiple methods
     */
    private function handlePdfGeneration(): array
    {
        $invoiceId = $this->invoice['id'] ?? null;
        if (!$invoiceId) {
            return ['available' => false, 'method' => 'no_invoice_id'];
        }

        Log::info('Starting PDF generation for invoice', ['invoice_id' => $invoiceId]);

        // Method 0: Try correct Chargebee API first (most reliable)
        $result = $this->downloadPdfViaCorrectChargebeeApi($invoiceId);
        if ($result['success']) {
            return $result;
        }

        // Method 1: Try browser automation (best quality)
        $result = $this->generatePdfWithBrowsershot($invoiceId);
        if ($result['success']) {
            return $result;
        }

        // Method 2: Try direct HTTP download with session
        $result = $this->downloadPdfWithSession($invoiceId);
        if ($result['success']) {
            return $result;
        }

        // Method 3: Try to extract PDF URL from embed page
        $result = $this->extractPdfFromEmbed($invoiceId);
        if ($result['success']) {
            return $result;
        }

        // Method 4: Generate PDF from HTML using wkhtmltopdf
        $result = $this->generatePdfFromHtml($invoiceId);
        if ($result['success']) {
            return $result;
        }

        Log::warning('All PDF generation methods failed', ['invoice_id' => $invoiceId]);
        
        // Return fallback information when PDF generation fails
        $fallbackUrl = $this->buildChargebeeViewUrl($invoiceId);
        return [
            'available' => false, 
            'method' => 'all_failed',
            'fallback_url' => $fallbackUrl,
            'download_url' => null,
            'view_url' => null
        ];
    }

    /**
     * Method 1: Generate PDF using Browsershot (Chrome headless)
     */
    private function generatePdfWithBrowsershot(string $invoiceId): array
    {
        // Check if Browsershot is available
        if (!class_exists(Browsershot::class)) {
            Log::info('Browsershot not available, skipping browser method', ['invoice_id' => $invoiceId]);
            return ['success' => false, 'method' => 'browsershot_not_available'];
        }

        try {
            $viewUrl = $this->buildChargebeeViewUrl($invoiceId);
            if (!$viewUrl) {
                return ['success' => false, 'method' => 'no_view_url'];
            }

            $fileName = $this->generateFileName($invoiceId);
            $filePath = 'invoices/' . $fileName;
            $fullPath = storage_path('app/temp/' . $fileName);

            Log::info('Generating PDF with Browsershot', [
                'invoice_id' => $invoiceId,
                'url' => $viewUrl,
                'temp_path' => $fullPath
            ]);

            // Create temp directory if needed
            $directory = dirname($fullPath);
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }

            // Generate PDF using Chrome headless
            Browsershot::url($viewUrl)
                ->format('A4')
                ->margins(10, 10, 10, 10)
                ->showBackground()
                ->waitUntilNetworkIdle()
                ->timeout(60)
                ->save($fullPath);

            if (file_exists($fullPath) && filesize($fullPath) > 1000) {
                // Upload to S3
                $pdfContent = file_get_contents($fullPath);
                if ($this->savePdf($pdfContent, $filePath)) {
                    // Clean up temp file
                    unlink($fullPath);
                    
                    Log::info('PDF generated successfully with Browsershot', [
                        'invoice_id' => $invoiceId,
                        'file_size' => strlen($pdfContent)
                    ]);

                    return [
                        'success' => true,
                        'available' => true,
                        'method' => 'browsershot',
                        'download_url' => route('invoice.download', ['filename' => $fileName]),
                        'view_url' => route('invoice.view', ['filename' => $fileName]),
                        'file_path' => $filePath
                    ];
                }
            }

            return ['success' => false, 'method' => 'browsershot_failed'];

        } catch (\Throwable $e) {
            Log::error('Browsershot PDF generation failed', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'method' => 'browsershot_exception'];
        }
    }
    /**
 * Method 0: Use correct Chargebee API (POST with disposition_type)
 */
/**
 * Method 0: Use correct Chargebee API (POST with disposition_type)
 */
/**
 * Method 0: Use correct Chargebee API (POST with disposition_type)
 */
private function downloadPdfViaCorrectChargebeeApi(string $invoiceId): array
{
    try {
        $apiKey = config('services.chargebee.api_key');
        $site = config('services.chargebee.site') ?: config('services.chargebee.site_name');

        if (!$apiKey || !$site) {
            Log::info('Missing Chargebee API credentials, skipping API method', ['invoice_id' => $invoiceId]);
            return ['success' => false, 'method' => 'api_credentials_missing'];
        }

        $base = $this->buildApiBase($site);
        $url = $base . '/api/v2/invoices/' . $invoiceId . '/pdf';

        Log::info('Downloading PDF via Chargebee API', [
            'invoice_id' => $invoiceId,
            'url' => $url
        ]);

        // Exact same request as your successful Postman test
        $response = Http::timeout(30)
            ->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/x-www-form-urlencoded'
            ])
            ->withBasicAuth($apiKey, '') // Username = API key, Password = empty
            ->asForm()
            ->post($url, [
                'disposition_type' => 'attachment'
            ]);

        if (!$response->successful()) {
            Log::warning('Chargebee API request failed', [
                'invoice_id' => $invoiceId,
                'status' => $response->status(),
                'response' => $response->body()
            ]);
            return ['success' => false, 'method' => 'chargebee_api_failed'];
        }

        $data = $response->json();
        
        // Handle the exact response structure from your Postman test
        $downloadInfo = $data['download'] ?? null;
        
        if (!$downloadInfo) {
            Log::error('No download object in Chargebee response', [
                'invoice_id' => $invoiceId,
                'response' => $data
            ]);
            return ['success' => false, 'method' => 'no_download_object'];
        }

        $downloadUrl = $downloadInfo['download_url'] ?? null;
        
        if (!$downloadUrl) {
            Log::error('No download_url in download object', [
                'invoice_id' => $invoiceId,
                'download_object' => $downloadInfo
            ]);
            return ['success' => false, 'method' => 'no_download_url'];
        }

        Log::info('Got PDF download URL from Chargebee', [
            'invoice_id' => $invoiceId,
            'download_url' => $downloadUrl
        ]);

        // Download the PDF from the S3 URL
        $pdfResponse = Http::timeout(60)
            ->withHeaders([
                'Accept' => 'application/pdf,application/octet-stream,*/*',
                'User-Agent' => 'Mozilla/5.0 (compatible; Laravel-App/1.0)'
            ])
            ->get($downloadUrl);

        if (!$pdfResponse->successful()) {
            Log::error('Failed to download PDF from S3 URL', [
                'invoice_id' => $invoiceId,
                'download_url' => $downloadUrl,
                'status' => $pdfResponse->status(),
                'response_body' => $pdfResponse->body()
            ]);
            
            // Try to create a simple PDF as fallback
            return $this->createSimplePdfFallback($invoiceId);
        }

        Log::info('Successfully downloaded PDF from Chargebee S3', [
            'invoice_id' => $invoiceId,
            'content_size' => strlen($pdfResponse->body()),
            'content_type' => $pdfResponse->header('Content-Type'),
            'content_preview' => substr($pdfResponse->body(), 0, 50)
        ]);

        $pdfBinary = $pdfResponse->body();

        if (!$this->validatePdfContent($pdfBinary)) {
            Log::error('Downloaded content is not a valid PDF', [
                'invoice_id' => $invoiceId,
                'content_size' => strlen($pdfBinary),
                'content_preview' => substr($pdfBinary, 0, 50),
                'content_type' => $pdfResponse->header('Content-Type'),
                'is_html' => str_contains($pdfBinary, '<html'),
                'is_xml' => str_contains($pdfBinary, '<?xml'),
                'starts_with_pdf' => str_starts_with(ltrim($pdfBinary), '%PDF')
            ]);
            
            // Try to create a simple PDF as fallback
            return $this->createSimplePdfFallback($invoiceId);
        }

        // Save the PDF
        $fileName = $this->generateFileName($invoiceId);
        $filePath = 'invoices/' . $fileName;

        Log::info('Attempting to save PDF to S3', [
            'invoice_id' => $invoiceId,
            'file_path' => $filePath,
            'file_size' => strlen($pdfBinary)
        ]);

        if ($this->savePdf($pdfBinary, $filePath)) {
            Log::info('PDF successfully downloaded via Chargebee API', [
                'invoice_id' => $invoiceId,
                'file_size' => strlen($pdfBinary),
                'file_path' => $filePath
            ]);

            return [
                'success' => true,
                'available' => true,
                'method' => 'chargebee_api',
                'download_url' => $this->generateDownloadUrl($fileName),
                'view_url' => $this->generateViewUrl($fileName),
                'file_path' => $filePath
            ];
        }

        Log::warning('Failed to save PDF to S3, using Chargebee URL directly', [
            'invoice_id' => $invoiceId,
            'file_path' => $filePath,
            'file_size' => strlen($pdfBinary)
        ]);

        // Fallback: Use Chargebee URL directly
        return [
            'success' => true,
            'available' => true,
            'method' => 'chargebee_direct_url',
            'download_url' => $downloadUrl,
            'view_url' => $downloadUrl,
            'file_path' => null
        ];

    } catch (\Throwable $e) {
        Log::error('Exception in Chargebee API PDF download', [
            'invoice_id' => $invoiceId,
            'error' => $e->getMessage()
        ]);
        return ['success' => false, 'method' => 'chargebee_api_exception'];
    }
}   
/**
 * Generate download URL safely
 */
private function generateDownloadUrl(string $fileName): ?string
{
    try {
        return route('invoice.download', ['filename' => $fileName]);
    } catch (\Exception $e) {
        // Routes not set up yet, return null or a placeholder
        return url('/invoices/pdf/download/' . $fileName);
    }
}

/**
 * Generate view URL safely
 */
private function generateViewUrl(string $fileName): ?string
{
    try {
        return route('invoice.view', ['filename' => $fileName]);
    } catch (\Exception $e) {
        // Fallback to direct URL if route not available
        return url('/invoices/pdf/view/' . $fileName);
    }
}
    /**
     * Method 2: Download PDF with session/cookies
     */
    private function downloadPdfWithSession(string $invoiceId): array
    {
        try {
            $viewUrl = $this->buildChargebeeViewUrl($invoiceId);
            if (!$viewUrl) {
                return ['success' => false, 'method' => 'no_view_url'];
            }

            Log::info('Attempting PDF download with session handling', [
                'invoice_id' => $invoiceId,
                'url' => $viewUrl
            ]);

            // First, try to get the page and extract any PDF URLs
            $response = Http::withOptions([
                'verify' => false,
                'allow_redirects' => true,
            ])
            ->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language' => 'en-US,en;q=0.5',
                'Accept-Encoding' => 'gzip, deflate',
                'Connection' => 'keep-alive',
                'Upgrade-Insecure-Requests' => '1',
            ])
            ->timeout(30)
            ->get($viewUrl);

            if ($response->successful()) {
                $html = $response->body();
                
                // Look for direct PDF URLs in the HTML
                if (preg_match('/src="([^"]*\.pdf[^"]*)"/', $html, $matches)) {
                    $pdfUrl = $matches[1];
                    return $this->downloadDirectPdf($pdfUrl, $invoiceId, 'html_extraction');
                }

                // Look for PDF URLs in JavaScript
                if (preg_match('/["\']([^"\']*\.pdf[^"\']*)["\']/', $html, $matches)) {
                    $pdfUrl = $matches[1];
                    return $this->downloadDirectPdf($pdfUrl, $invoiceId, 'js_extraction');
                }
            }

            return ['success' => false, 'method' => 'session_download_failed'];

        } catch (\Throwable $e) {
            Log::error('Session download failed', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'method' => 'session_exception'];
        }
    }

    /**
     * Method 3: Extract PDF URL from embed page
     */
    private function extractPdfFromEmbed(string $invoiceId): array
    {
        try {
            $viewUrl = $this->buildChargebeeViewUrl($invoiceId);
            if (!$viewUrl) {
                return ['success' => false, 'method' => 'no_view_url'];
            }

            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (compatible; Laravel-PDF-Extractor/1.0)',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                ])
                ->get($viewUrl);

            if (!$response->successful()) {
                return ['success' => false, 'method' => 'embed_fetch_failed'];
            }

            $html = $response->body();
            
            // Multiple patterns to find PDF URLs
            $patterns = [
                '/original-url="([^"]*)"/',
                '/src="([^"]*\.pdf[^"]*)"/',
                '/<embed[^>]*src="([^"]*\.pdf[^"]*)"/',
                '/pdfUrl["\']?\s*[:=]\s*["\']([^"\']*)["\']/',
                '/(https?:\/\/[^"\s]*\.pdf[^"\s]*)/i',
            ];

            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $html, $matches)) {
                    $pdfUrl = html_entity_decode($matches[1]);
                    
                    if (filter_var($pdfUrl, FILTER_VALIDATE_URL)) {
                        Log::info('Found PDF URL in embed page', [
                            'invoice_id' => $invoiceId,
                            'pdf_url' => $pdfUrl,
                            'pattern' => $pattern
                        ]);
                        
                        return $this->downloadDirectPdf($pdfUrl, $invoiceId, 'embed_extraction');
                    }
                }
            }

            return ['success' => false, 'method' => 'embed_no_pdf_found'];

        } catch (\Throwable $e) {
            Log::error('Embed extraction failed', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'method' => 'embed_exception'];
        }
    }

    /**
     * Method 4: Generate PDF from HTML using wkhtmltopdf
     */
    private function generatePdfFromHtml(string $invoiceId): array
    {
        // Check if wkhtmltopdf is available
        if (!shell_exec('which wkhtmltopdf')) {
            Log::info('wkhtmltopdf not available, skipping HTML method', ['invoice_id' => $invoiceId]);
            return ['success' => false, 'method' => 'wkhtmltopdf_not_available'];
        }

        try {
            $viewUrl = $this->buildChargebeeViewUrl($invoiceId);
            if (!$viewUrl) {
                return ['success' => false, 'method' => 'no_view_url'];
            }

            $fileName = $this->generateFileName($invoiceId);
            $filePath = 'invoices/' . $fileName;
            $fullPath = storage_path('app/temp/' . $fileName);

            // Create temp directory if needed
            $directory = dirname($fullPath);
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }

            $command = sprintf(
                'wkhtmltopdf --page-size A4 --margin-top 10mm --margin-bottom 10mm --margin-left 10mm --margin-right 10mm --enable-javascript --javascript-delay 3000 %s %s',
                escapeshellarg($viewUrl),
                escapeshellarg($fullPath)
            );

            Log::info('Generating PDF with wkhtmltopdf', [
                'invoice_id' => $invoiceId,
                'command' => $command
            ]);

            $output = shell_exec($command . ' 2>&1');

            if (file_exists($fullPath) && filesize($fullPath) > 1000) {
                // Upload to S3
                $pdfContent = file_get_contents($fullPath);
                if ($this->savePdf($pdfContent, $filePath)) {
                    // Clean up temp file
                    unlink($fullPath);
                    
                    Log::info('PDF generated successfully with wkhtmltopdf', [
                        'invoice_id' => $invoiceId,
                        'file_size' => strlen($pdfContent)
                    ]);

                    return [
                        'success' => true,
                        'available' => true,
                        'method' => 'wkhtmltopdf',
                        'download_url' => route('invoice.download', ['filename' => $fileName]),
                        'view_url' => route('invoice.view', ['filename' => $fileName]),
                        'file_path' => $filePath
                    ];
                }
            }

            Log::warning('wkhtmltopdf failed to generate PDF', [
                'invoice_id' => $invoiceId,
                'output' => $output
            ]);

            return ['success' => false, 'method' => 'wkhtmltopdf_failed'];

        } catch (\Throwable $e) {
            Log::error('wkhtmltopdf generation failed', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'method' => 'wkhtmltopdf_exception'];
        }
    }

    /**
     * Download PDF from direct URL
     */
    private function downloadDirectPdf(string $pdfUrl, string $invoiceId, string $method): array
    {
        try {
            $response = Http::timeout(60)
                ->withHeaders([
                    'Accept' => 'application/pdf,application/octet-stream,*/*',
                    'User-Agent' => 'Mozilla/5.0 (compatible; Laravel-PDF-Downloader/1.0)'
                ])
                ->get($pdfUrl);

            if (!$response->successful()) {
                return ['success' => false, 'method' => $method . '_download_failed'];
            }

            $body = $response->body();
            
            if (!$this->validatePdfContent($body)) {
                return ['success' => false, 'method' => $method . '_invalid_pdf'];
            }

            $fileName = $this->generateFileName($invoiceId);
            $filePath = 'invoices/' . $fileName;
            
            if ($this->savePdf($body, $filePath)) {
                return [
                    'success' => true,
                    'available' => true,
                    'method' => $method,
                    'download_url' => route('invoice.download', ['filename' => $fileName]),
                    'view_url' => route('invoice.view', ['filename' => $fileName]),
                    'file_path' => $filePath
                ];
            }

            return ['success' => false, 'method' => $method . '_save_failed'];

        } catch (\Throwable $e) {
            Log::error('Direct PDF download failed', [
                'invoice_id' => $invoiceId,
                'pdf_url' => $pdfUrl,
                'method' => $method,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'method' => $method . '_exception'];
        }
    }

    /**
     * Validate PDF content
     */
    private function validatePdfContent(string $data): bool
    {
        return strlen($data) > 100 && str_starts_with(ltrim($data), '%PDF');
    }

    /**
     * Save PDF to S3 storage
     */
    private function savePdf(string $pdfBinary, string $filePath): bool
    {
        try {
            Log::info('Attempting to save PDF to S3', [
                'path' => $filePath,
                'size' => strlen($pdfBinary),
                's3_config' => [
                    'driver' => config('filesystems.disks.s3.driver'),
                    'bucket' => config('filesystems.disks.s3.bucket'),
                    'region' => config('filesystems.disks.s3.region'),
                    'key_set' => !empty(config('filesystems.disks.s3.key')),
                    'secret_set' => !empty(config('filesystems.disks.s3.secret'))
                ]
            ]);
            
            // Upload PDF to S3 bucket
            $uploaded = Storage::disk('s3')->put($filePath, $pdfBinary, 'private');
            
            if ($uploaded) {
                Log::info('PDF successfully uploaded to S3', [
                    'path' => $filePath,
                    'size' => strlen($pdfBinary),
                    'uploaded' => $uploaded
                ]);
                
                // Verify the file exists
                $exists = Storage::disk('s3')->exists($filePath);
                Log::info('PDF verification after upload', [
                    'path' => $filePath,
                    'exists' => $exists
                ]);
                
                return $exists;
            }

            Log::error('S3 upload returned false', [
                'path' => $filePath,
                'size' => strlen($pdfBinary)
            ]);
            return false;

        } catch (\Throwable $e) {
            Log::error('Failed to save PDF to S3', [
                'path' => $filePath,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Generate filename for PDF
     */
    private function generateFileName(string $invoiceId): string
    {
        $invoiceNumber = $this->invoice['invoice_number'] ?? $invoiceId;
        $companyId = $this->customer['company_uuid'] ?? 'unknown';
        $dmy = date('d-m-Y'); // Format: day-month-year (e.g., 09092025 for 09/09/2025)
        
        // Clean up invoice number and company ID for filename (replace special chars with underscores)
        $cleanInvoiceNumber = preg_replace('/[^a-zA-Z0-9]/', '_', $invoiceNumber);
        $cleanCompanyId = preg_replace('/[^a-zA-Z0-9]/', '_', $companyId);
        
        return "invoice-{$cleanInvoiceNumber}-{$cleanCompanyId}-{$dmy}.pdf";
    }

    /**
     * Build Chargebee view URL
     */
    private function buildChargebeeViewUrl(string $invoiceId = null): ?string
    {
        $invoiceId = $invoiceId ?: $this->invoice['id'] ?? null;
        if (!$invoiceId) {
            return null;
        }

        $site = config('services.chargebee.site') ?: config('services.chargebee.site_name');
        if (!$site) {
            return null;
        }

        $base = $this->buildApiBase($site);
        return $base . '/invoices/' . $invoiceId . '/view_pdf';
    }

    /**
     * Build API base URL
     */
    private function buildApiBase(string $site): string
    {
        if (str_starts_with($site, 'http')) {
            return rtrim($site, '/');
        } elseif (str_contains($site, '.')) {
            return 'https://' . rtrim($site, '/');
        } else {
            return 'https://' . $site . '.chargebee.com';
        }
    }

    /**
     * Create a simple PDF fallback when other methods fail
     */
    private function createSimplePdfFallback(string $invoiceId): array
    {
        try {
            $fileName = $this->generateFileName($invoiceId);
            $filePath = 'invoices/' . $fileName;
            
            // Create a simple PDF content
            $pdfContent = $this->generateSimplePdfContent($invoiceId);
            
            if ($this->savePdf($pdfContent, $filePath)) {
                Log::info('Simple PDF fallback created successfully', [
                    'invoice_id' => $invoiceId,
                    'file_path' => $filePath
                ]);
                
                return [
                    'success' => true,
                    'available' => true,
                    'method' => 'simple_pdf_fallback',
                    'download_url' => $this->generateDownloadUrl($fileName),
                    'view_url' => $this->generateViewUrl($fileName),
                    'file_path' => $filePath
                ];
            }
            
            return ['success' => false, 'method' => 'simple_pdf_fallback_failed'];
            
        } catch (\Throwable $e) {
            Log::error('Simple PDF fallback failed', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'method' => 'simple_pdf_fallback_exception'];
        }
    }

    /**
     * Generate simple PDF content
     */
    private function generateSimplePdfContent(string $invoiceId): string
    {
        $invoiceNumber = $this->invoice['invoice_number'] ?? $invoiceId;
        $amount = $this->invoice['amount'] ?? 0;
        $currency = $this->invoice['currency_code'] ?? 'USD';
        $customerName = ($this->customer['first_name'] ?? '') . ' ' . ($this->customer['last_name'] ?? '');
        
        // Simple PDF content (minimal valid PDF)
        return "%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length 200
>>
stream
BT
/F1 16 Tf
50 750 Td
(Invoice: {$invoiceNumber}) Tj
0 -30 Td
(Customer: {$customerName}) Tj
0 -30 Td
(Amount: " . number_format($amount / 100, 2) . " {$currency}) Tj
0 -30 Td
(Generated: " . date('Y-m-d H:i:s') . ") Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
0000000405 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
500
%%EOF";
    }
}