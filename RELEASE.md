> v0.7.72 ~ "Customers can sign up with their phone number again"

---
## Highlights

- **Storefront: phone sign-up works again.** Since Storefront v0.4.25, signing up with a phone number in a Storefront app failed for every customer with "That code didn't match", although the text with the code arrived. Phone codes are stored hashed, and the sign-up request still validated the code by looking up the plain code in `verification_codes`, which can never match a hash, so the request was refused before the code was checked. The request now only requires a code; the check against the newest live code for that number, with attempt counting and lockout, is unchanged. Sign-in and email sign-up were not affected. (storefront #160)

---
## Component Versions
- `console`: `0.7.72`
- `core-api`: `1.6.72`
- `fleetops`: `0.6.74`
- `storefront`: `0.4.28`
- `registry-bridge`: `0.1.11`
- `ledger`: `0.0.13`
- `customer-portal`: `0.0.16`
- `dev-engine`: `0.2.18`
- `ember-ui`: `0.4.6`
- `ember-core`: `0.3.26`
- `fleetops-data`: `0.2.3`
- `iam-engine`: `0.1.13`

---
## Storefront `0.4.28`
- **Fix: phone sign-up codes pass request validation** (#160): `CreateCustomerRequest` validated `code` with `exists:verification_codes,code`. Phone creation codes are stored as an HMAC since v0.4.25, so every phone sign-up got a 422 before `CustomerController::create()` ran. The rule is now `required|string|max:32`; `create()` still checks the code with `VerificationCode::findActiveFor()` and `check()`, which hash it the same way, count wrong attempts, lock the code and use it up.

---
## Upgrade Steps
- Pull the images as usual. No migrations in this release.
- Customers who tried to sign up by phone while this was broken only need to request a new code.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
