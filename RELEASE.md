> v0.7.64 ~ "Managed driver and customer logins, verification requests, and Fleetbase AI actions"

---
## Highlights
Fleetbase `0.7.64` ships Core API `1.6.63`, Fleet-Ops `0.6.69` and Fleetbase AI `0.0.5`.

- **Driver, customer and contact logins are managed from their profiles and kept out of the console.** Driver logins are reset, sent and deactivated from the driver profile, and IAM lists only team members.
- **Admins can request email and phone verification from IAM.** People confirm it through a one-click link.
- **Fleetbase AI now answers from the Fleetbase documentation** and can propose console actions that only run after you confirm them.
- **Two security fixes:**
  - a user created without a role no longer gets the Administrator role;
  - order actions can no longer reach another organization's orders.
- **The console is now available in Ukrainian, and the Customer Portal in English and Russian.**

---
## Component Versions
- `console`: `0.7.64`
- `core-api`: `1.6.63`
- `fleetops`: `0.6.69`
- `fleetops-data`: `0.2.2`
- `ember-ui`: `0.4.3`
- `iam-engine`: `0.1.12`
- `dev-engine`: `0.2.16`
- `customer-portal`: `0.0.14`
- `ai`: `0.0.5`

---
## Security
- **Blank role no longer means Administrator** (core-api #266). Creating, inviting or promoting a user without a role gave them the full Administrator role; for example, IAM › Customers › Add customer with no role selected. A role is now required, and only admins and Administrator-role holders can grant Administrator. Accepting an invite, or joining an organization, grants the invite's role.
- **Order actions are limited to your own organization** (fleetops #331). Anyone with ordinary order permissions could cancel, dispatch, start, schedule or reassign another organization's orders by supplying their IDs, and could read another organization's order import file. The same check now covers activity updates, route edits, photo capture, proofs, tracking-number lookups and driver pings.

---
## Accounts and Access
- Console sign-in, session restore, two-factor verification and impersonation refuse driver and contact accounts. Customers continue through the Customer Portal (core-api #264).
- Creating or inviting a team member whose email or phone matches an existing driver, customer or contact account upgrades that account instead of creating a duplicate. IAM shows which account was upgraded (core-api #264, iam-engine #35).
- A deleted user's email and phone number can be used again for a new account (core-api #264).
- IAM manages team members only. The Drivers and Customers tabs are removed, and the Role field is required (iam-engine #35).
- The unused `CompanyScope` global scope is removed. It was never registered, so nothing changes; tenant isolation relies on the explicit company checks (core-api #260).
- Groundwork for signing in with Google, Microsoft, GitHub and Apple (core-api #261). The console sign-in screens ship separately.

---
## Verification Requests
- In IAM, the new **Email Verified** and **Phone Verified** columns can be filtered. Optional Country, Timezone, Date of Birth and IP Address columns can be switched on (iam-engine #36).
- New row actions in IAM: **Send email verification**, **Send phone verification**, **Mark email verified** and **Mark phone verified** (iam-engine #36, core-api #267).
- Verification requests send a one-click link by email or SMS. It expires after 48 hours, and a newer request replaces an older one. A link is refused if the email or phone number changed after it was sent (core-api #267).
- New `/auth/verify-contact/:id` page in the console, where the person confirms with a single **Verify** button (fleetbase #673).

---
## Fleet-Ops
- The driver form has Name, Email and Phone fields in place of the user picker. The phone number can now be changed. For a driver who is also a team member, email and phone are managed from their team account (#338).
- New driver actions: **Reset Password**, **Send Credentials** and **Deactivate/Reactivate Login**. Deactivating a login also signs out the driver app, and credentials go by email, or by SMS when there's no email (#338).
- Deleting a driver also deletes its login account. Creating a driver no longer sends an organization invite, which could let drivers into the console (#338).
- Contact import rejects a row whose phone number belongs to a driver's account, instead of linking them (#338).
- AI resource search works again. It failed on every call, and sent the database error to the AI provider. Common words no longer match half the database, and order amount filters respect the currency (#330).
- New AI tools to search Fleet-Ops and propose new orders, plus Fleet-Ops console commands the AI can offer (#330).
- The Track Order button on the sign-in page matches the other sign-in buttons (#339).
- Ukrainian translation, thanks to @ispdomnet (#340).

---
## Fleetbase AI
- Answers are based on the fleetbase.io documentation. The docs are refreshed weekly by `ai:sync-docs`, and a copy ships with the package for offline and self-hosted installs. Answers link the page they used, and admins get a new **Knowledge Base** page (ai #6).
- The AI can propose one of 73 console actions on a card with **Go** and **Dismiss**. Nothing runs until you press Go, and your permissions are checked again at that point (ai #6, fleetops #330, dev-engine #46, iam-engine #33).
- Conversations keep full history and support tool calling with Anthropic and OpenAI, with refreshed model lists. A **Look up answers with tools** switch turns tool calling off (ai #6).
- The log viewer is rebuilt, with JSONL/CSV export, thumbs up/down feedback and a redesigned usage analytics page. New `ai:export-logs`, `ai:eval` and `ai:replay` commands (ai #6).
- The AI log and analytics pages use the full width of the admin area (fleetbase #671).

---
## Console, UI and Translations
- Numbers and dates follow your browser's language, falling back to English. They were shown in Arabic for everyone (fleetbase #671).
- Admin pages from extensions can use the full width of the page (fleetbase #671).
- The email-change confirmation link opens again (fleetbase #673).
- Phone number fields no longer accept letters, whether typed, pasted, dropped or autofilled (ember-ui #183).
- A shared `btn-auth` sign-in button style, and branded Google, Microsoft, GitHub and Apple buttons, for sign-in pages (ember-ui #179, #182). The Customer Portal and Track Order buttons on the sign-in page use the new style (customer-portal #17, fleetops #339).
- API key and webhook dialogs in Developers can be opened from anywhere, including by Fleetbase AI (dev-engine #46).
- Driver and contact records include each person's login status (fleetops-data #81).
- Ukrainian translations for the console, Fleet-Ops, Developers and IAM, thanks to @ispdomnet (fleetbase #674, fleetops #340, dev-engine #48, iam-engine #37).
- The Customer Portal is fully translatable and ships in English and Russian, thanks to @spanchenko (customer-portal #13).

---
## Console and API Packages
- Bumped the root Docker image version to `0.7.64`.
- Bumped Console to `0.7.64`.
- Updated the API dependencies: `fleetbase/core-api` to `^1.6.63`, `fleetbase/fleetops-api` to `^0.6.69`, `fleetbase/ai` to `^0.0.5`, and `fleetbase/customer-portal-api` to `^0.0.14`.
- Updated the Console dependencies: `@fleetbase/fleetops-engine` to `^0.6.69`, `@fleetbase/fleetops-data` to `^0.2.2`, `@fleetbase/ember-ui` to `^0.4.3`, `@fleetbase/iam-engine` to `^0.1.12`, `@fleetbase/dev-engine` to `^0.2.16`, `@fleetbase/customer-portal-engine` to `^0.0.14`, and `@fleetbase/ai-engine` to `^0.0.5`.
- Updated the component submodules to their release tags, and the API and Console lockfiles.

---
## Bug Fixes
- Fixed a user created without a role getting the Administrator role.
- Fixed order actions reaching other organizations' orders and import files.
- Fixed AI resource search failing on every call and sending database errors to the AI provider.
- Fixed AI answers being cut short in conversation history, and route names being shown to users.
- Fixed deleted drivers leaving their login accounts behind, and a linked driver's phone number being unchangeable.
- Fixed numbers and dates appearing in Arabic regardless of language.
- Fixed the email-change confirmation link not opening.
- Fixed phone number fields accepting letters.

---
## Upgrade Steps
This release includes database migrations and requires **PHP 8.1 or later**.

- Driver and contact accounts can no longer sign in to the console, and customers use the Customer Portal. Team members who also have a driver profile are unaffected.
- A role is now required to create or invite a user. Extensions that call `Company::addUser`, `Company::assignUser` or `User::assignCompany` must pass a role; none is assigned by default any more.
- A migration converts existing profile-only accounts to driver or customer accounts.
- Keep the scheduler running, so the weekly `ai:sync-docs` keeps the AI's documentation current.

```bash
# Pull latest version
git pull origin main --no-rebase
# Update docker
docker compose pull
docker compose down && docker compose up -d
# Run deploy script
docker compose exec application bash -c "./deploy.sh"
```

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
