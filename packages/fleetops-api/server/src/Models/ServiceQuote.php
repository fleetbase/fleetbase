<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Json;
use Fleetbase\FleetOps\Integrations\Lalamove\Lalamove;
use Fleetbase\FleetOps\Support\Payment;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Models\Model;
use Fleetbase\Traits\Expirable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasMetaAttributes;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\SendsWebhooks;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServiceQuote extends Model
{
    use HasUuid;
    use HasPublicId;
    use SendsWebhooks;
    use TracksApiCredential;
    use Expirable;
    use HasMetaAttributes;
    use HasApiModelBehavior;

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'quote';

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'service_quotes';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = [];

    /**
     * The expiry datetime column.
     *
     * @var string
     */
    public static $expires_at = 'expired_at';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['_key', 'request_id', 'company_uuid', 'service_rate_uuid', 'payload_uuid', 'amount', 'currency', 'meta', 'expired_at'];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['service_rate_name'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'meta'       => Json::class,
        'expired_at' => 'datetime',
    ];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = ['serviceRate'];

    /**
     * Attributes that is filterable on this model.
     *
     * @var array
     */
    protected $filterParams = ['facilitator'];

    public function items(): HasMany
    {
        return $this->hasMany(ServiceQuoteItem::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(\Fleetbase\Models\Company::class);
    }

    public function serviceRate(): BelongsTo
    {
        return $this->belongsTo(ServiceRate::class);
    }

    public function payload(): BelongsTo|Builder
    {
        return $this->belongsTo(Payload::class)->withoutGlobalScopes();
    }

    public function integratedVendor(): BelongsTo
    {
        return $this->belongsTo(IntegratedVendor::class);
    }

    public function getServiceRateNameAttribute(): string
    {
        return data_get($this, 'serviceRate.service_name');
    }

    public function fromIntegratedVendor(): bool
    {
        return (bool) $this->integrated_vendor_uuid || $this->hasMeta('from_integrated_vendor');
    }

    public static function fromLalamoveQuotation($quotation = null): ServiceQuote
    {
        return Lalamove::serviceQuoteFromQuotation($quotation);
    }

    public static function resolveFromRequest(Request $request): ?ServiceQuote
    {
        $serviceQuote = $request->or(['order.service_quote_uuid', 'service_quote', 'service_quote_id', 'order.service_quote']);

        if (empty($serviceQuote)) {
            return null;
        }

        if (Str::isUuid($serviceQuote)) {
            $serviceQuote = static::where('uuid', $serviceQuote)->first();
        }

        if (Utils::isPublicId($serviceQuote)) {
            $serviceQuote = static::where('public_id', $serviceQuote)->first();
        }

        return $serviceQuote;
    }

    public function getPluralName(): string
    {
        if (isset($this->pluralName)) {
            return $this->pluralName;
        }

        if (isset($this->payloadKey)) {
            return Str::plural($this->payloadKey);
        }

        return Str::plural($this->getTable());
    }

    public function getSingularName(): string
    {
        if (isset($this->singularName)) {
            return $this->singularName;
        }

        if (isset($this->payloadKey)) {
            return Str::singular($this->payloadKey);
        }

        return Str::singular($this->getTable());
    }

    /**
     * Retrieves or creates a Stripe product associated with this model instance.
     *
     * This method attempts to fetch a Stripe product based on an existing 'stripe_product_id'.
     * If no product is found or if 'stripe_product_id' is not set, it creates a new Stripe product
     * with the current model's name and description and updates the model's 'stripe_product_id'.
     *
     * @return \Stripe\Product|null returns the Stripe Product object if successful, or null if the Stripe client is not available
     */
    public function getStripeProduct(): ?\Stripe\Product
    {
        $stripe = Payment::getStripeClient();
        if ($stripe) {
            $product = $this->getMeta('stripe_product_id') ? $stripe->products->retrieve($this->getMeta('stripe_product_id'), []) : null;
            if (!$product) {
                $product = $stripe->products->create(['name' => $this->public_id, 'description' => 'Service Quote for ' . Utils::moneyFormat($this->amount, $this->currency), 'metadata' => ['fleetbase_id' => $this->public_id]]);
            }

            // Update stripe product id
            if ($this->exists) {
                $this->updateMeta('stripe_product_id', $product->id);
            } else {
                $this->setMeta('stripe_product_id', $product->id);
            }

            return $product;
        }

        return null;
    }

    /**
     * Retrieves the active Stripe price for the associated product.
     *
     * This method first ensures the product exists in Stripe by calling getStripeProduct().
     * It then fetches the current active price for the product. If no active prices are found,
     * it returns null.
     *
     * @return \Stripe\Price|null returns the Stripe Price object if available, or null otherwise
     */
    public function getStripePrice(): ?\Stripe\Price
    {
        if ($this->missingMeta('stripe_product_id')) {
            $this->getStripeProduct();
        }

        $stripe  = Payment::getStripeClient();
        $price   = null;
        if ($stripe) {
            $prices = $stripe->prices->all(['product' => $this->getMeta('stripe_product_id'), 'limit' => 1, 'active' => true]);
            $price  = is_array($prices->data) && count($prices->data) ? $prices->data[0] : null;
        }

        return $price;
    }

    /**
     * Updates the existing active Stripe price to inactive and creates a new Stripe price.
     *
     * This method first retrieves the current active price and deactivates it if it exists.
     * It then creates a new price with the current model's price and currency, associated with
     * the Stripe product.
     *
     * @return \Stripe\Price|null returns the newly created Stripe Price object
     */
    public function updateOrCreateStripePrice(): ?\Stripe\Price
    {
        if ($this->missingMeta('stripe_product_id')) {
            $this->getStripeProduct();
        }

        $stripe = Payment::getStripeClient();
        $price  = $this->getStripePrice();
        if ($price instanceof \Stripe\Price) {
            // update stripe price
            $stripe->prices->update($price->id, ['active' => false]);
        }

        // create new stripe price
        $price = $stripe->prices->create(['unit_amount' => $this->amount, 'currency' => $this->currency, 'product' => $this->getMeta('stripe_product_id')]);

        return $price;
    }

    /**
     * Creates a Stripe Checkout session for purchasing this model's associated product.
     *
     * This method ensures that the model has a valid company (extension author) and an active price.
     * It calculates the facilitator fee based on the total amount and creates a checkout session with
     * the necessary Stripe configurations, including the return URI with query parameters.
     *
     * @param string $returnUri the URI to which the user should be returned after the checkout process
     *
     * @return \Stripe\Checkout\Session returns the Stripe Checkout Session object
     *
     * @throws \Exception throws an exception if the model does not have an associated company or price
     */
    public function createStripeCheckoutSession(string $returnUri): \Stripe\Checkout\Session
    {
        $this->loadMissing(['company']);
        // Get extension author
        $company = $this->company;
        if (!$company) {
            throw new \Exception('The company you attempted to purchase a service quote from is not available at this time.');
        }

        // Get the extension price from stripe
        $price = $this->updateOrCreateStripePrice();
        if (!$price) {
            throw new \Exception('The service quote you attempted to purchase is not available at this time.');
        }

        // Calculate the fee sysadmin takes for faciliation of extension
        $totalAmount    = $price->unit_amount;
        $facilitatorFee = Utils::calculatePercentage(config('fleet-ops.facilitator_fee', 0), $totalAmount);

        // Get the stripe client to create the checkout session
        $stripe          = Payment::getStripeClient();

        // Create the stripe checkout session
        $checkoutSession = $stripe->checkout->sessions->create([
            'ui_mode'    => 'embedded',
            'line_items' => [
                [
                    'price'    => $price->id,
                    'quantity' => 1,
                ],
            ],
            'mode'                => 'payment',
            'return_url'          => Utils::consoleUrl($returnUri) . '?service_quote=' . $this->uuid . '&checkout_session_id={CHECKOUT_SESSION_ID}&creating=1',
            'payment_intent_data' => [
                'application_fee_amount' => $facilitatorFee,
                'transfer_data'          => [
                    'destination' => $company->stripe_connect_id,
                ],
            ],
        ]);

        return $checkoutSession;
    }
}
