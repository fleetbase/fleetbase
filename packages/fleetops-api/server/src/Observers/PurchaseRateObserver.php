<?php

namespace Fleetbase\FleetOps\Observers;

use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Models\PurchaseRate;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Models\Company;
use Fleetbase\Models\Transaction;
use Fleetbase\Models\TransactionItem;

class PurchaseRateObserver
{
    /**
     * Handle the PurchaseRate "creating" event.
     * Create transactions accordingly.
     *
     * @return void
     */
    public function creating(PurchaseRate $purchaseRate)
    {
        $purchaseRate->load(['serviceQuote.items', 'serviceQuote.serviceRate']);

        // get company
        $company = Company::where('uuid', session('company', $purchaseRate->company_uuid))->first();

        // get currency to use
        $currency = data_get($purchaseRate, 'serviceQuote.currency', $company->country ? Utils::getCurrenyFromCountryCode($company->country) : 'SGD');

        // create transaction and transaction items
        $transaction = Transaction::create([
            'company_uuid'           => session('company', $purchaseRate->company_uuid),
            'customer_uuid'          => $purchaseRate->customer_uuid,
            'customer_type'          => $purchaseRate->customer_type,
            'gateway_transaction_id' => $purchaseRate->getMeta('transaction_id', Transaction::generateNumber()),
            'gateway'                => 'internal',
            'amount'                 => data_get($purchaseRate, 'serviceQuote.amount', 0),
            'currency'               => $currency,
            'description'            => 'Dispatch order',
            'type'                   => 'dispatch',
            'status'                 => 'success',
        ]);

        // Update order with transaction id
        Order::where('payload_uuid', $purchaseRate->payload_uuid)->update(['transaction_uuid' => $transaction->uuid]);

        if (isset($purchaseRate->serviceQuote)) {
            $purchaseRate->serviceQuote->items->each(function ($serviceQuoteItem) use ($transaction, $currency) {
                TransactionItem::create([
                    'transaction_uuid' => $transaction->uuid,
                    'amount'           => $serviceQuoteItem->amount ?? 0,
                    'currency'         => $currency,
                    'details'          => data_get($serviceQuoteItem, 'details', 'Internal dispatch'),
                    'code'             => data_get($serviceQuoteItem, 'code', 'internal'),
                ]);
            });
        }

        $purchaseRate->transaction_uuid = $transaction->uuid;
    }
}
