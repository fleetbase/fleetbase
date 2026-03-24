# Medusa <-> Fleetbase Logistics Contract

This contract is for integrating the `shopifyme` Medusa backend with Fleetbase as a logistics-only service.

Uber Direct is intentionally out of scope.

## Goal

Medusa remains responsible for:

- storefront
- cart
- checkout
- payment
- merchant isolation
- final order totals

Fleetbase becomes responsible for:

- delivery quote calculation
- rider assignment
- delivery tracking
- delivery status changes
- customer-ready confirmation on the delivery page

## Assumptions

- One storefront maps to one merchant sales channel.
- One cart belongs to one merchant sales channel.
- Customers do not need Fleetbase accounts.
- Merchant pickup origin comes from the merchant warehouse fields in Medusa.
- Customer dropoff comes from the cart shipping address in Medusa.

## Existing Medusa Data To Reuse

These fields already exist in `shopifyme` and should be the source of truth:

- merchant `sales_channel_id`
- merchant warehouse address fields
- cart `sales_channel_id`
- cart shipping address
- cart email
- order and fulfillment IDs

Relevant read-only references:

- [`merchant.ts`](/Users/leslieaine/shopify/shopifyme/src/modules/merchant/models/merchant.ts)
- [`resolve/route.ts`](/Users/leslieaine/shopify/shopifyme/src/api/storefront/resolve/route.ts)
- [`payment-sessions/route.ts`](/Users/leslieaine/shopify/shopifyme/src/api/store/payment-collections/[id]/payment-sessions/route.ts)

## Fleetbase Endpoints To Expose

### 1. Quote endpoint

`POST /api/v1/logistics/quotes`

Purpose:

- Medusa asks Fleetbase for a delivery quote before payment
- response amount becomes the delivery total shown at checkout

Request body:

```json
{
  "merchant": {
    "id": "mer_123",
    "sales_channel_id": "sc_123",
    "name": "Netnalysis",
    "phone": "+256700000001"
  },
  "cart": {
    "id": "cart_123",
    "currency_code": "ugx",
    "email": "customer@example.com",
    "item_count": 3,
    "subtotal": 85000,
    "weight_grams": 2400
  },
  "pickup": {
    "name": "Netnalysis Warehouse",
    "phone": "+256700000001",
    "address_line_1": "Plot 1 Example Road",
    "address_line_2": null,
    "city": "Kampala",
    "state": null,
    "postal_code": null,
    "country_code": "UG",
    "latitude": 0.3476,
    "longitude": 32.5825
  },
  "dropoff": {
    "name": "Leslie Aine",
    "phone": "+256700000002",
    "address_line_1": "Customer Address",
    "address_line_2": null,
    "city": "Kampala",
    "state": null,
    "postal_code": null,
    "country_code": "UG",
    "latitude": 0.3136,
    "longitude": 32.5811
  },
  "options": {
    "service_type": "standard",
    "collect_cash": false
  },
  "meta": {
    "source": "shopifyme"
  }
}
```

Response body:

```json
{
  "ok": true,
  "quote_id": "fq_01HXYZ",
  "provider": "fleetbase",
  "currency_code": "ugx",
  "amount": 6500,
  "breakdown": {
    "base_fee": 3000,
    "distance_fee": 2500,
    "service_fee": 1000,
    "commission_fee": 0
  },
  "distance_km": 5.2,
  "estimated_pickup_minutes": 12,
  "estimated_dropoff_minutes": 34,
  "expires_at": "2026-03-23T13:15:00Z",
  "meta": {
    "sales_channel_id": "sc_123",
    "cart_id": "cart_123"
  }
}
```

Failure response:

```json
{
  "ok": false,
  "error": "Delivery is unavailable for this destination."
}
```

### 2. Delivery creation endpoint

`POST /api/v1/logistics/deliveries`

Purpose:

- Medusa calls this only after order and fulfillment exist
- Fleetbase creates the real delivery job

Request body:

```json
{
  "quote_id": "fq_01HXYZ",
  "merchant": {
    "id": "mer_123",
    "sales_channel_id": "sc_123",
    "name": "Netnalysis"
  },
  "order": {
    "id": "order_123",
    "display_id": "ORDER-1001",
    "fulfillment_id": "ful_123",
    "currency_code": "ugx",
    "delivery_amount": 6500,
    "email": "customer@example.com"
  },
  "pickup": {
    "name": "Netnalysis Warehouse",
    "phone": "+256700000001",
    "address_line_1": "Plot 1 Example Road",
    "city": "Kampala",
    "country_code": "UG",
    "latitude": 0.3476,
    "longitude": 32.5825
  },
  "dropoff": {
    "name": "Leslie Aine",
    "phone": "+256700000002",
    "address_line_1": "Customer Address",
    "city": "Kampala",
    "country_code": "UG",
    "latitude": 0.3136,
    "longitude": 32.5811,
    "notes": "Leave at the gate"
  },
  "items": [
    {
      "title": "Product A",
      "quantity": 2
    },
    {
      "title": "Product B",
      "quantity": 1
    }
  ],
  "meta": {
    "source": "shopifyme",
    "medusa_order_id": "order_123",
    "fulfillment_id": "ful_123",
    "sales_channel_id": "sc_123"
  }
}
```

Response body:

```json
{
  "ok": true,
  "delivery": {
    "fleetbase_order_uuid": "25fd16d5-f9d4-43e5-9c5a-66f4ebef0ec6",
    "fleetbase_order_public_id": "ORDER-TEST-001",
    "status": "created",
    "tracking_url": "http://127.0.0.1:8000/track?order_id=ORDER-TEST-001&display_id=ORDER-TEST-001&merchant=Netnalysis"
  }
}
```

### 3. Tracking endpoint

Already present in Fleetbase:

- `GET /api/v1/multi-pickup/orders/{orderId}/tracking`
- `POST /api/v1/multi-pickup/orders/{orderId}/customer-confirm`
- `GET /api/v1/multi-pickup/orders/{orderId}/customer-confirmed`

These are enough for customer-facing delivery tracking after the delivery job is created.

### 4. Delivery completion callback

Already partially wired in Fleetbase:

- Fleetbase can call Medusa when a delivery is completed
- current Fleetbase webhook forwarding uses:
  - `MEDUSA_BACKEND_URL`
  - `MEDUSA_DELIVERY_CONFIRMED_PATH`
  - `MEDUSA_WEBHOOK_SECRET`

Expected payload from Fleetbase to Medusa:

```json
{
  "order_id": "order_123",
  "fulfillment_id": "ful_123",
  "source": "fleetbase",
  "delivered_at": "2026-03-23T14:30:00Z",
  "fleetbase_order_uuid": "25fd16d5-f9d4-43e5-9c5a-66f4ebef0ec6"
}
```

## Checkout Sequence

### A. Storefront resolves merchant

Medusa already resolves the storefront to a store and sales channel.

### B. Customer enters address

Once the cart has shipping address details, Medusa should call `POST /api/v1/logistics/quotes`.

### C. Medusa stores the quote on the cart

Recommended cart metadata:

```json
{
  "delivery_quote": {
    "quote_id": "fq_01HXYZ",
    "provider": "fleetbase",
    "amount": 6500,
    "currency_code": "ugx",
    "expires_at": "2026-03-23T13:15:00Z"
  }
}
```

### D. Medusa includes delivery in final total

The Fleetbase quote amount should become the shipping or delivery total inside Medusa before payment session creation.

The customer then pays:

- product subtotal
- tax
- delivery fee

in one payment.

### E. After order placement, Medusa creates the Fleetbase delivery

Once order and fulfillment exist, Medusa should call `POST /api/v1/logistics/deliveries`.

### F. Fleetbase tracks and completes delivery

Fleetbase becomes the system of record for rider assignment and delivery status.

### G. Fleetbase notifies Medusa on delivery completion

Medusa then marks fulfillment delivered and captures payment if needed.

## Data Medusa Should Persist

On cart metadata:

- `delivery_quote.quote_id`
- `delivery_quote.amount`
- `delivery_quote.currency_code`
- `delivery_quote.expires_at`

On order or fulfillment metadata:

- `fleetbase_order_uuid`
- `fleetbase_order_public_id`
- `fleetbase_tracking_url`
- `fleetbase_status`

## Recommended First Implementation Scope

Implement in this order:

1. Fleetbase quote endpoint
2. Medusa cart quote storage and delivery total inclusion
3. Fleetbase delivery creation endpoint
4. Medusa post-order dispatch to Fleetbase
5. Fleetbase completion callback to Medusa

## What Not To Do

- Do not make Fleetbase the payment system
- Do not require Fleetbase customer accounts
- Do not let Medusa and Fleetbase calculate separate final totals independently
- Do not keep Uber-specific dispatch logic in the new Fleetbase path

