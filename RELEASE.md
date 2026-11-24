> v0.8.3 ~ "App Review sign-in for customer apps"

---
## Highlights

- **App Review sign-in for customer apps.** Apps that customers sign in to through Fleet-Ops' customer API, such as the Passenger app, send a texted code, and Apple's and Google's reviewers can't receive one. Fleet-Ops → Settings → **Customer Apps** now turns App Review sign-in on and off for an organization, the way Settings → Navigator App does for Navigator.
  - Reviewers sign in with **+1 202 555 0145** and a six-digit code the Console shows once. The number is from the range reserved for fiction and is never texted. It differs from Navigator's (+1 202 555 0144), because a customer and a driver are different accounts.
  - The organization's code signs in as its review customer, **App Reviewer**, and only in that organization's apps. Orders it places get `meta.app_review = true`.
- **Two App Review types can share a model.** Navigator and the customer apps are both registered on the organization, and core now keeps each type's number, code and access apart.

---
## Component Versions
- `console`: `0.8.3`
- `core-api`: `2.0.5`
- `fleetops`: `0.7.3`
- `storefront`: `0.5.0`
- `ledger`: `0.1.0`
- `customer-portal`: `0.1.0`
- `registry-bridge`: `0.2.1`
- `ai`: `0.1.0`
- `valhalla`: `0.1.0`
- `vroom`: `0.1.0`
- `dev-engine`: `0.2.18`
- `ember-ui`: `0.4.7`
- `ember-core`: `0.3.27`
- `fleetops-data`: `0.2.4`
- `iam-engine`: `0.1.13`

---
## Core API `2.0.5`
- **A second App Review type on the same model is read and changed as itself.** Before, `AppReview::typeOf()` returned the first registered type whose model matched, so any other type on `Company` was treated as Navigator's.
  - `accessFor()`, `isEnabledFor()`, `acceptsCode()`, `update()` and `status()` take an optional `?string $type` as their last argument. Left out, it is `typeOf($subject)`, so existing callers behave as before.
  - New `AppReview::resolveType($subject, $type)` gives the type a subject is checked as.
  - The Console endpoint (`/int/v1/review-access/{type}/{id}`) and the OAuth endpoint (`/oauth/v1/review-access/{type}/{id}`) pass the route's `{type}` through.

## Fleet-Ops `0.7.3`
- **Settings → Customer Apps:** turn App Review sign-in for customer apps on and off, see the review number, and show or replace the code.
- **Customer API:**
  - With access on, `customers/request-code`, `customers/login-with-sms` and `customers/request-creation-code` (SMS) answer for the review number as if a code were sent, and send nothing. With access off, they answer 422 and say where to turn it on.
  - With the organization's code, `customers/verify-code` and `POST customers` sign in as the organization's review customer and return the same response as any sign-in, never `new_customer`. A wrong code, or another organization's, is refused.
- **Permissions:** `fleet-ops view customer-app-settings` and `fleet-ops update customer-app-settings`, a **CustomerAppSettingsManager** policy and a **Customer App Manager** role. Administrators have them already.

---
## Upgrade Steps
- Pull the new images and restart the API, queue, scheduler and events containers. There's no new migration.
- Run `php artisan fleetbase:create-permissions` (or your usual permission sync) so Fleet-Ops' new permissions, the **CustomerAppSettingsManager** policy and the **Customer App Manager** role exist.
- No configuration changes are needed. Customer app review sign-in is off until an organization turns it on.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
