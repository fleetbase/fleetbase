@component('mail::message')
# New Invoice Generated

**Invoice**: {{ $invoice['invoice_number'] ?? ('Invoice #' . ($invoice['id'] ?? 'Unknown')) }}

**Amount**: {{ $amount ?? ($invoice['amount'] ?? 'N/A') }} {{ $currency ?? ($invoice['currency_code'] ?? '') }}

**Status**: {{ ucfirst($status ?? ($invoice['status'] ?? 'unknown')) }}

@if(!empty($dueDate) || !empty($invoice['due_date']))
**Due Date**: {{ $dueDate ?? $invoice['due_date'] }}
@endif

@if(!empty($customer))
**Customer**:
- Name: {{ $customer['first_name'] ?? '' }} {{ $customer['last_name'] ?? '' }}
- Email: {{ $customer['email'] ?? 'N/A' }}
@endif

@if(!empty($invoiceUrl))
@component('mail::button', ['url' => $invoiceUrl])
View Invoice
@endcomponent
@endif

@if(!empty($downloadUrl))
@component('mail::button', ['url' => $downloadUrl])
Download PDF
@endcomponent
@endif

Thanks,
{{ config('app.name') }}
@endcomponent


