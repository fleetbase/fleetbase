# Shopifyme Driver Payout Handoff

This note is for the `shopifyme` Medusa backend.

It does not require any changes in `shopifyme` from this repo. It is an implementation handoff only.

## Core Decision

Driver money movement should be handled by Medusa, not Fleetbase.

Fleetbase should remain the logistics and payout-ledger side.

Medusa should remain the payments and transfer side.

## Why This Split Is Correct

Your system already works like this:

- customer pays once in Medusa
- merchant allocation is already handled in Medusa and Flutterwave
- transport is part of the single total

Driver payouts are different from merchant checkout splits.

Merchant distribution is a checkout-time split.

Driver payout is better handled as a scheduled settlement:

- weekly
- batched
- based on completed deliveries
- based on driver payout details already collected

So the clean architecture is:

- `Medusa + Flutterwave`
  - collect customer payment
  - split merchant amounts
  - create/update driver payout recipients or subaccounts
  - send weekly driver payouts

- `Fleetbase`
  - store which driver completed which delivery
  - store delivery amount and rider earnings ledger
  - store rider payout preferences
  - group unpaid deliveries into payout batches
  - show payout status in rider/admin dashboards

## What Fleetbase Stores Now

Fleetbase now has the rider-facing pieces for payout preparation.

### 1. Driver payout profile

Saved in the driver meta as `payout_profile`.

Fields currently captured:

- `method`
- `account_name`
- `payout_email`
- `account_number`
- `account_bank`
- `country`
- `bank_id`
- `bank_name`
- `bank_code`
- `provider_type`
- `branch_code`
- `branch_name`
- `swift_code`
- `routing_number`
- `country_code`
- `business_name`
- `business_email`
- `business_mobile`
- `business_contact`
- `business_contact_mobile`
- `sync_status`
- `medusa_recipient_id`

Purpose:

- driver chooses how they want to be paid
- Fleetbase fetches the country-specific institution list from Flutterwave
- driver sees a human-readable bank name dropdown, not the raw Flutterwave code
- Medusa later turns this into a real recipient/subaccount/transfer target
- the rider UI is fixed to the Flutterwave `bank account` path, so Medusa should treat this profile as a bank-account-style payout destination

Flutterwave lookup behavior now assumed by Fleetbase:

- `GET /v3/banks/:country` is used to populate the rider-facing bank/provider dropdown
- `include_provider_type=1` is requested so Medusa can tell bank transfer from mobile money where Flutterwave supports that distinction
- `GET /v3/banks/:bank_id/branches` is used for countries where Flutterwave requires a branch code
- for `GH`, `TZ`, `RW`, `UG`, Fleetbase expects a branch code before sync
- for `US`, Fleetbase expects both `routing_number` and `swift_code`
- for common SEPA/SWIFT countries, Fleetbase expects `swift_code`

Important mapping:

- rider picks `bank_name` from the dropdown
- Fleetbase stores the matching Flutterwave code as `account_bank`
- Medusa should send `account_bank`, not `bank_name`, in the real Flutterwave request body
- `account_name` is the rider-facing label collected in Fleetbase
- `business_name` is the Medusa/Flutterwave-ready name field for `POST /v3/subaccounts`
- `country` is the exact country field Medusa should send to Flutterwave

## Exact Flutterwave Subaccount Shape Medusa Should Build

If Medusa creates a Flutterwave subaccount from Fleetbase driver payout data, the request body should use Flutterwave's exact field names:

```json
{
  "account_bank": "044",
  "account_number": "0690000037",
  "business_name": "Driver Test",
  "country": "NG",
  "split_value": 0.5,
  "business_mobile": "+256700000010",
  "business_email": "driver@example.com",
  "business_contact": "Driver Test",
  "business_contact_mobile": "+256700000010",
  "split_type": "percentage",
  "meta": []
}
```

Important notes for Medusa:

- use Flutterwave's exact keys above when calling `POST /v3/subaccounts`
- `bank_name` is not part of the request body; Flutterwave resolves it from `account_bank`
- `business_name` goes in, while Flutterwave may return it back as `full_name`
- `subaccount_id` from Flutterwave is the identifier Medusa should store and use later
- `split_type` and `split_value` should remain Medusa-owned policy values
- Fleetbase should not be the source of truth for `split_value`

## Exact Mapping From Fleetbase Profile To Flutterwave Request

When Medusa reads `payout_profile` from Fleetbase, map it like this:

- `payout_profile.account_bank` -> `account_bank`
- `payout_profile.account_number` -> `account_number`
- `payout_profile.business_name` -> `business_name`
- `payout_profile.country` -> `country`
- `payout_profile.business_mobile` -> `business_mobile`
- `payout_profile.business_email` -> `business_email`
- `payout_profile.business_contact` -> `business_contact`
- `payout_profile.business_contact_mobile` -> `business_contact_mobile`
- Medusa-owned config/policy -> `split_type`
- Medusa-owned config/policy -> `split_value`
- `payout_profile.branch_code`, `swift_code`, `routing_number` -> `meta` or companion payout fields where country rules require them

For the current Fleetbase implementation:

- `business_name` is derived from the rider payout `account_name`
- `business_email` is derived from the payout email
- `business_mobile` and `business_contact_mobile` are derived from the rider phone
- `business_contact` is derived from the rider name

## Flutterwave Response Fields Medusa Should Store

After a successful `POST /v3/subaccounts`, Medusa should persist at least:

- `subaccount_id`
- `account_bank`
- `bank_name`
- `account_number`
- `full_name`
- `split_type`
- `split_value`
- raw Flutterwave response payload

### 2. Driver earnings ledger

Fleetbase calculates rider earnings from delivery amounts already attached to logistics orders.

Current config:

- `DRIVER_EARNINGS_PERCENTAGE`
- `PAYOUT_SCHEDULE`
- `PAYOUT_DAY`

Purpose:

- show rider lifetime earnings
- show unpaid current-cycle earnings
- show delivered order history

### 3. Driver payout batches

Fleetbase now has a `driver_payout_batches` table.

Purpose:

- record which completed deliveries were grouped into one payout batch
- mark batches as `queued`, later `processing`, `completed`, or `failed`
- avoid double-paying the same deliveries

## What Medusa Should Own

Medusa should own the real payout execution lifecycle.

That means:

- create or update driver payout recipient from Fleetbase payout profile
- store Flutterwave recipient or subaccount id
- execute transfer on payout day
- persist transfer response and transfer id
- notify Fleetbase of payout result

Fleetbase should not directly call Flutterwave for driver payouts.

## Recommended Money Flow

### At checkout

Customer pays one total in Medusa:

- product total
- merchant amounts
- transport total

Merchant split continues to work in Medusa as it already does.

Do **not** treat drivers as another checkout split target if payout is weekly.

Instead:

- delivery fee remains in the platform-controlled flow
- Fleetbase records which driver earned what
- Medusa pays drivers later in payout batches

## Recommended Weekly Payout Flow

### Step 1. Driver saves payout profile in Fleetbase

Driver enters:

- mobile money details or bank details

Fleetbase stores this with:

- `sync_status = pending_medusa_sync`

### Step 2. Medusa syncs payout recipient details

Medusa reads or receives the Fleetbase payout profile and:

- creates or updates the Flutterwave transfer recipient or subaccount
- stores Medusa-side payout recipient reference

Then Medusa should write back:

- recipient id
- sync success/failure state

### Step 3. Ops queues weekly payout batch in Fleetbase

When admin clicks `Queue payout`, Fleetbase creates a local payout batch record containing:

- driver
- cycle dates
- unpaid delivered order UUIDs
- total rider earnings

This means Fleetbase has now prepared a payout, but not executed it.

### Step 4. Medusa processes queued payout batches

Medusa should:

- fetch queued Fleetbase payout batches
- verify payout profile exists and is synced
- create Flutterwave transfer(s)
- mark batch `processing`
- when transfer succeeds, mark batch `completed`
- when transfer fails, mark batch `failed`

### Step 5. Fleetbase reflects payout result

Once Fleetbase knows a batch is `completed`:

- those orders remain paid
- unpaid cycle total drops correctly
- rider payout history shows the completed batch

## Recommended Contract Between Fleetbase And Medusa

Because Medusa should own money movement, these are the best contracts to implement there.

## Option A: Medusa pulls from Fleetbase

This is the cleaner approach.

Medusa runs a scheduled job and fetches:

- driver payout profiles that need sync
- queued payout batches

Why this is good:

- Medusa stays in control of payout timing
- easier retries
- easier audit trail
- fewer secret-sharing webhook flows

## Option B: Fleetbase pushes into Medusa

This also works, but is slightly noisier operationally.

Fleetbase would:

- push payout profile updates when rider saves them
- push payout batch creation when admin queues a batch

For your setup, I recommend **Option A first**.

## Data Medusa Needs From Fleetbase

### Payout profile payload

Medusa should receive or fetch something shaped like:

```json
{
  "driver": {
    "uuid": "drv_123",
    "public_id": "DRIVER-001",
    "name": "Driver Test",
    "phone": "+256700000010",
    "email": "driver@example.com"
  },
  "payout_profile": {
    "method": "bank_transfer",
    "account_name": "Driver Test",
    "payout_email": "driver@example.com",
    "account_number": "0690000037",
    "account_bank": "044",
    "country": "UG",
    "bank_id": "1",
    "bank_name": "Access Bank",
    "bank_code": "044",
    "provider_type": "bank",
    "branch_code": null,
    "branch_name": null,
    "swift_code": null,
    "routing_number": null,
    "country_code": "UG",
    "business_name": "Driver Test",
    "business_email": "driver@example.com",
    "business_mobile": "+256700000010",
    "business_contact": "Driver Test",
    "business_contact_mobile": "+256700000010",
    "sync_status": "pending_medusa_sync",
    "medusa_recipient_id": null,
    "updated_at": "2026-03-24T10:00:00Z"
  }
}
```

### Payout batch payload

Medusa should receive or fetch something shaped like:

```json
{
  "batch": {
    "uuid": "payout_batch_123",
    "driver_uuid": "drv_123",
    "currency_code": "UGX",
    "status": "queued",
    "gross_earnings": 42000,
    "order_count": 7,
    "cycle_started_at": "2026-03-19T00:00:00Z",
    "cycle_ended_at": "2026-03-26T00:00:00Z",
    "scheduled_for": "2026-03-26T00:00:00Z",
    "orders": [
      {
        "fleetbase_order_uuid": "ord_1",
        "fleetbase_order_public_id": "order_abc",
        "delivery_amount": 6500,
        "driver_earnings": 5200
      }
    ]
  }
}
```

## What Medusa Should Store

### On driver payout recipient

Medusa should store:

- `fleetbase_driver_uuid`
- transfer recipient/subaccount id from Flutterwave
- method type
- last sync timestamp

### On payout batch

Medusa should store:

- `fleetbase_payout_batch_uuid`
- `fleetbase_driver_uuid`
- transfer id
- transfer status
- transfer response payload
- paid amount
- paid at

## Batch Status Lifecycle

Use a simple shared lifecycle:

- `queued`
- `processing`
- `completed`
- `failed`

Suggested behavior:

- Fleetbase creates `queued`
- Medusa changes to `processing` when transfer starts
- Medusa changes to `completed` when Flutterwave confirms success
- Medusa changes to `failed` when payout fails

## Suggested Medusa Endpoints

These are suggested Medusa endpoints to implement.

### 1. Sync driver payout recipient

`POST /fleetbase/drivers/payout-profile/sync`

Purpose:

- create or update a Flutterwave payout recipient from Fleetbase data

Request:

```json
{
  "driver_uuid": "drv_123",
  "public_id": "DRIVER-001",
  "name": "Driver Test",
  "phone": "+256700000010",
  "email": "driver@example.com",
  "payout_profile": {
    "method": "bank_transfer",
    "account_name": "Driver Test",
    "payout_email": "driver@example.com",
    "account_number": "0690000037",
    "account_bank": "044",
    "country": "UG",
    "bank_id": "1",
    "bank_name": "Access Bank",
    "bank_code": "044",
    "provider_type": "bank",
    "branch_code": null,
    "branch_name": null,
    "swift_code": null,
    "routing_number": null,
    "country_code": "UG",
    "business_name": "Driver Test",
    "business_email": "driver@example.com",
    "business_mobile": "+256700000010",
    "business_contact": "Driver Test",
    "business_contact_mobile": "+256700000010"
  }
}
```

Response:

```json
{
  "ok": true,
  "recipient_id": "flw_recipient_123",
  "status": "synced"
}
```

### 2. Create payout transfer from queued batch

`POST /fleetbase/payout-batches`

Purpose:

- Medusa accepts a queued payout batch and starts a real transfer

Request:

```json
{
  "batch_uuid": "payout_batch_123",
  "driver_uuid": "drv_123",
  "gross_earnings": 42000,
  "currency_code": "UGX",
  "recipient_id": "flw_recipient_123",
  "orders": [
    {
      "fleetbase_order_uuid": "ord_1",
      "driver_earnings": 5200
    }
  ]
}
```

Response:

```json
{
  "ok": true,
  "transfer_id": "flw_transfer_123",
  "status": "processing"
}
```

### 3. Mark payout batch completed or failed back in Fleetbase

After transfer resolution, Medusa should call back to Fleetbase.

Suggested Fleetbase callback shapes:

#### Completed

```json
{
  "batch_uuid": "payout_batch_123",
  "status": "completed",
  "transfer_id": "flw_transfer_123",
  "paid_at": "2026-03-26T10:30:00Z",
  "meta": {
    "processor": "flutterwave"
  }
}
```

#### Failed

```json
{
  "batch_uuid": "payout_batch_123",
  "status": "failed",
  "transfer_id": "flw_transfer_123",
  "error": "Recipient account failed verification"
}
```

## Env Vars Medusa Will Likely Need

Suggested Medusa env:

```env
FLEETBASE_BASE_URL=http://127.0.0.1:8000/api/v1
FLEETBASE_WEBHOOK_SECRET=medusa-fleetbase-local-secret
FLEETBASE_PAYOUT_SYNC_ENABLED=true
FLEETBASE_DRIVER_PAYOUT_DAY=thursday
FLEETBASE_DRIVER_PAYOUT_PERCENTAGE=80
```

## Env Vars Fleetbase Will Likely Need Later

Current Fleetbase env already supports the timing knobs:

```env
DRIVER_EARNINGS_PERCENTAGE=80
PAYOUT_SCHEDULE=weekly
PAYOUT_DAY=thursday
MEDUSA_BACKEND_URL=http://127.0.0.1:9000
MEDUSA_WEBHOOK_SECRET=medusa-fleetbase-local-secret
FLUTTERWAVE_BASE_URL=https://api.flutterwave.com/v3
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
```

## Important Rule

Do not let Fleetbase and Medusa both calculate final money independently.

Use this split:

- Fleetbase calculates rider ledger visibility for operations
- Medusa remains the final settlement source of truth

If Medusa decides a payout succeeded, that result must be the final authority.

## Practical Recommendation For Your Stack

Because merchants already use Flutterwave subaccounts under your main account:

- keep merchant payout exactly as it is
- do not mix weekly driver payouts into merchant checkout split logic
- create drivers as transfer recipients or an equivalent payout target
- pay them on Thursday from Medusa using queued Fleetbase payout batches

That is the least disruptive and most scalable design for your current stack.

## Short Version To Hand Off

Tell the Medusa backend:

- customer still pays once in Medusa
- merchant split remains in Medusa/Flutterwave
- Fleetbase only prepares driver payout profiles and weekly payout batches
- Medusa must create/update driver payout recipients from Fleetbase payout profile data
- Medusa must execute weekly driver transfers
- Medusa must mark Fleetbase payout batches completed or failed
- Fleetbase should display payout state, not own money movement
