> v0.7.75 ~ "Sign in with Apple tokens are revoked on deletion, and Launch App opens AppHelm"

---
## Highlights

- **Sign in with Apple tokens are revoked when a customer deletes their account,** as App Review guideline 5.1.1(v) requires. Tokens are stored encrypted at sign-in, and a missing key or a refusal from Apple never blocks sign-in or deletion. (storefront #165)
- **Launch App opens AppHelm,** Fleetbase's service for publishing a store as a web and mobile app. Fleetbase Cloud accounts sign in with the account they're already using, and self-hosted installs go to the page that explains the service. (storefront #167)

Storefront is the only component updated in this release.

---
## Component Versions
- `console`: `0.7.75`
- `core-api`: `1.6.74`
- `fleetops`: `0.6.75`
- `storefront`: `0.4.31`
- `valhalla`: `0.0.5`
- `vroom`: `0.0.5`
- `registry-bridge`: `0.1.11`
- `ledger`: `0.0.13`
- `customer-portal`: `0.0.16`
- `dev-engine`: `0.2.18`
- `ember-ui`: `0.4.6`
- `ember-core`: `0.3.26`
- `fleetops-data`: `0.2.3`
- `iam-engine`: `0.1.13`

---
## Storefront `0.4.31`
- **Sign in with Apple token revocation** (#165): the app's authorization code is exchanged for a refresh token at sign-in and kept encrypted, then revoked with Apple when the customer deletes their account. Keys come from a store or network's `apple_sign_in` notification channel, or its `apn` channel when that key also has Sign in with Apple enabled. See `docs/sign-in-with-apple.md` in the Storefront repository.
- **Launch App opens AppHelm** (#167): the Launch App link in the Storefront module now goes to AppHelm.

---
## Upgrade Steps
- Pull the new images and restart every API, queue, scheduler and events container.
- Migrations run on deploy. They add `apple_sign_in_tokens` on the storefront connection.
- Customers who signed in with Apple before a key was configured have no token stored yet. Theirs is stored the next time they sign in with Apple.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
