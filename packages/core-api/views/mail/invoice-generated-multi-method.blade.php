@component('mail::message')
@if($status === 'paid')
# ✅ Invoice Paid Successfully

Payment has been received for invoice from {{ $customer['first_name'] ?? '' }} {{ $customer['last_name'] ?? '' }} ({{ $customer['email'] ?? 'N/A' }}).
@else
# 📄 New Invoice Generated

A new invoice has been generated for {{ $customer['first_name'] ?? '' }} {{ $customer['last_name'] ?? '' }} ({{ $customer['email'] ?? 'N/A' }}).
@endif

## Invoice Details

**Invoice Number:** {{ $invoice['invoice_number'] ?? $invoice['id'] ?? 'N/A' }}  
**Amount:** {{ number_format($amount / 100, 2) }} {{ strtoupper($currency) }}  
**Status:** {{ ucfirst($status) }}  
@if($status === 'paid' && isset($invoice['paid_at']))
**Paid Date:** {{ \Carbon\Carbon::createFromTimestamp($invoice['paid_at'])->format('M j, Y g:i A') }}  
@else
**Due Date:** {{ $dueDate ? \Carbon\Carbon::createFromTimestamp($dueDate)->format('M j, Y') : 'N/A' }}  
@endif
**Created:** {{ $createdAt ? \Carbon\Carbon::createFromTimestamp($createdAt)->format('M j, Y g:i A') : 'N/A' }}

@if($pdfAvailable && $pdfDownloadUrl)
📥 [Download Invoice]({{ $pdfDownloadUrl }})

@elseif($fallbackUrl)
[View Invoice Online]({{ $fallbackUrl }})

@else
**❌ Invoice Access Unavailable**  
*Please contact support for assistance accessing your invoice*  
**Invoice ID:** {{ $invoice['id'] ?? 'Unknown' }}
@endif



Thanks,<br>
{{ config('app.name') }}
@endcomponent