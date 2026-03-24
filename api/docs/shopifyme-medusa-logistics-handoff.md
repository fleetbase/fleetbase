# Shopifyme Medusa Logistics Handoff

This note is for the `shopifyme` Medusa backend.

Use Fleetbase for logistics only.

Do not use Uber Direct.

## What Medusa Owns

Medusa remains responsible for:

- storefront
- cart
- shipping address capture
- checkout total calculation
- payment
- order creation
- fulfillment creation

Fleetbase is only responsible for:

- delivery quote calculation
- rider assignment
- delivery tracking
- delivery status updates
- customer-ready confirmation on the delivery page

## Fleetbase Endpoints Available

Base URL:

`http://127.0.0.1:8000/api/v1`

### 1. Quote delivery before payment

`POST /logistics/quotes`

Purpose:

- Medusa asks Fleetbase for a delivery quote after the cart has a shipping address.
- Medusa uses the returned amount as the delivery fee included in the final total.

### 2. Create delivery after order and fulfillment exist

`POST /logistics/deliveries`

Purpose:

- Medusa creates the real Fleetbase delivery job after order placement.

### 3. Tracking already available

Fleetbase already exposes:

- `GET /multi-pickup/orders/{orderId}/tracking`
- `POST /multi-pickup/orders/{orderId}/customer-confirm`
- `GET /multi-pickup/orders/{orderId}/customer-confirmed`

## Exact Quote Request Medusa Must Send

```json
{
  "merchant": {
    "id": "mer_test_1",
    "sales_channel_id": "sc_test_1",
    "name": "Netnalysis",
    "phone": "+256700000001"
  },
  "cart": {
    "id": "cart_test_1",
    "currency_code": "UGX",
    "email": "customer@example.com",
    "item_count": 3,
    "subtotal": 85000,
    "weight_grams": 2400
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

## Quote Response Medusa Will Receive

Example real response:

```json
{
  "ok": true,
  "quote_id": "fq_IFDY05YRF5SM",
  "provider": "fleetbase",
  "currency_code": "ugx",
  "amount": 5890,
  "breakdown": {
    "base_fee": 3000,
    "distance_fee": 1890,
    "service_fee": 1000,
    "commission_fee": 0
  },
  "distance_km": 3.78,
  "estimated_pickup_minutes": 10,
  "estimated_dropoff_minutes": 20,
  "expires_at": "2026-03-23T13:40:48+00:00",
  "meta": {
    "sales_channel_id": "sc_test_1",
    "cart_id": "cart_test_1",
    "merchant_id": "mer_test_1"
  }
}
```

## What Medusa Must Do With The Quote Response

Medusa should persist these values on the cart metadata:

```json
{
  "delivery_quote": {
    "quote_id": "fq_IFDY05YRF5SM",
    "provider": "fleetbase",
    "amount": 5890,
    "currency_code": "ugx",
    "expires_at": "2026-03-23T13:40:48+00:00",
    "distance_km": 3.78,
    "estimated_pickup_minutes": 10,
    "estimated_dropoff_minutes": 20
  }
}
```

Medusa should then use:

- `amount` as the delivery fee
- the cart metadata as the source of truth during payment and order creation

## Exact Delivery Creation Request Medusa Must Send

This should happen only after:

- order exists
- fulfillment exists
- the chosen quote is still valid

Request:

```json
{
  "quote_id": "fq_IFDY05YRF5SM",
  "merchant": {
    "id": "mer_test_1",
    "sales_channel_id": "sc_test_1",
    "name": "Netnalysis"
  },
  "order": {
    "id": "order_test_1",
    "display_id": "ORDER-1001",
    "fulfillment_id": "ful_test_1",
    "currency_code": "UGX",
    "delivery_amount": 5890,
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
    "source": "shopifyme"
  }
}
```

## Delivery Creation Response Medusa Will Receive

Example real response:

```json
{
  "ok": true,
  "delivery": {
    "fleetbase_order_uuid": "7cde2449-a198-4eb3-bd88-1a1837896e78",
    "fleetbase_order_public_id": "order_bqT7AkBZJv",
    "status": "dispatched",
    "tracking_url": "http://127.0.0.1:8000/track?order_id=order_bqT7AkBZJv&display_id=order_bqT7AkBZJv&merchant=Netnalysis",
    "driver_assigned_uuid": "6f23ab71-7226-487d-b37c-3749c30c9a0c"
  }
}
```

## What Medusa Must Do With The Delivery Response

Persist these values on order metadata or fulfillment metadata:

```json
{
  "fleetbase_delivery": {
    "fleetbase_order_uuid": "7cde2449-a198-4eb3-bd88-1a1837896e78",
    "fleetbase_order_public_id": "order_bqT7AkBZJv",
    "status": "dispatched",
    "tracking_url": "http://127.0.0.1:8000/track?order_id=order_bqT7AkBZJv&display_id=order_bqT7AkBZJv&merchant=Netnalysis",
    "driver_assigned_uuid": "6f23ab71-7226-487d-b37c-3749c30c9a0c"
  }
}
```

These values are needed for:

- merchant order views
- customer tracking links
- matching Medusa fulfillment records to Fleetbase records

## Field Mapping Medusa Should Use

### Merchant values

Get from the merchant record:

- `merchant.id`
- `merchant.sales_channel_id`
- `merchant.name`
- `merchant.warehouse_phone`
- `merchant.warehouse_address_line_1`
- `merchant.warehouse_city`
- `merchant.warehouse_postal_code`
- `merchant.warehouse_country_code`

Reference:

- [`merchant.ts`](/Users/leslieaine/shopify/shopifyme/src/modules/merchant/models/merchant.ts)

### Cart values

Get from the cart:

- `cart.id`
- `cart.currency_code`
- `cart.email`
- `cart.item_count`
- `cart.subtotal`

For `cart.weight_grams`:

- sum line item weight if available
- otherwise send `0`

### Pickup values

Build from merchant warehouse fields.

### Dropoff values

Build from cart shipping address:

- customer name
- customer phone
- address 1
- city
- country code
- latitude/longitude if your storefront has them

If the storefront currently stores address text but not coordinates, Medusa should geocode before asking Fleetbase for the quote.

### Order values

After order placement, send:

- Medusa `order.id`
- order display number
- `fulfillment_id`
- customer email
- delivery amount from cart quote metadata

## Expected Medusa Flow

### Step 1

Resolve storefront and merchant as normal.

### Step 2

Once the cart shipping address is known, call Fleetbase quote endpoint.

### Step 3

Store the Fleetbase quote on cart metadata.

### Step 4

Use the quote amount as the delivery fee included in the total shown to the customer.

### Step 5

Create payment session normally.

### Step 6

After order and fulfillment are created, call Fleetbase delivery creation endpoint.

### Step 7

Store Fleetbase delivery identifiers on the order or fulfillment metadata.

### Step 8

Expose Fleetbase tracking URL to the merchant dashboard and customer order experience.

## Validation Rules Medusa Should Respect

Do not call Fleetbase quote endpoint unless all of these exist:

- merchant sales channel
- merchant warehouse address
- cart shipping address
- currency code

Do not call Fleetbase delivery creation unless all of these exist:

- valid quote id
- order id
- fulfillment id
- delivery amount

## Failure Handling

If quote request fails:

- do not let checkout silently continue with zero delivery fee
- surface a delivery-unavailable error

If delivery creation fails after order placement:

- mark fulfillment as needing manual dispatch
- keep the quote and order metadata for retry

If Fleetbase returns an already-created delivery for the same order and fulfillment:

- treat that as idempotent success

## Files In Shopifyme That Matter

These are the main read-only reference points:

- [`payment-sessions/route.ts`](/Users/leslieaine/shopify/shopifyme/src/api/store/payment-collections/[id]/payment-sessions/route.ts)
- [`dispatch/route.ts`](/Users/leslieaine/shopify/shopifyme/src/api/merchant/orders/[id]/fulfillments/[fulfillment_id]/dispatch/route.ts)
- [`shipments/route.ts`](/Users/leslieaine/shopify/shopifyme/src/api/merchant/orders/[id]/fulfillments/[fulfillment_id]/shipments/route.ts)
- [`resolve/route.ts`](/Users/leslieaine/shopify/shopifyme/src/api/storefront/resolve/route.ts)
- [`merchant.ts`](/Users/leslieaine/shopify/shopifyme/src/modules/merchant/models/merchant.ts)

## Short Version To Hand Off

Tell the Medusa backend:

- call Fleetbase quote endpoint after shipping address is set
- store returned quote on cart metadata
- include quote amount in checkout total
- after order and fulfillment creation, call Fleetbase delivery endpoint
- persist Fleetbase delivery ids and tracking URL on the order or fulfillment
- ignore Uber Direct entirely

