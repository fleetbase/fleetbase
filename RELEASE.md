# 🚀 Fleetbase v0.7.29 — 2026-02-27

> "Major security enhancements, analytics tracking, developer tools, and UX improvements"

---

## ✨ Highlights

This release brings **critical security patches**, comprehensive **analytics event tracking** across the platform, enhanced **developer account management** for the extension marketplace, and several **user experience improvements** including accurate geolocation detection.

### 🔒 Security Enhancements

Fleetbase v0.7.29 includes critical security fixes that strengthen tenant isolation and prevent unauthorized access. The **core-api** has been patched to address a systemic tenant isolation vulnerability (GHSA-3wj9-hh56-7fw7) with the introduction of a `CompanyScope` global scope that enforces proper tenant boundaries. Additional security improvements include removal of hardcoded authentication bypasses, enforcement of strong password policies across all validators, and prevention of user enumeration in login flows. Cross-tenant IDOR vulnerabilities have been resolved with company-scoped authorization checks throughout the API.

### 📊 Analytics & Event Tracking

A comprehensive **events service** has been added to **ember-core**, providing centralized analytics tracking across all core services. The system emits both generic events (e.g., `resource.created`) and specific events (e.g., `order.created`) using a standardized dot notation naming convention. Event tracking has been integrated into CRUD operations (create, update, delete, bulk actions, import, export) and resource actions across the platform. In **FleetOps**, 30 controllers now emit analytics events, and import operations return accurate counts of imported records. The dual event system fires on both the events service and universe service, enabling cross-engine communication for analytics integrations like PostHog.

### 🛠️ Developer Tools & Marketplace

The **registry-bridge** now supports **Registry Developer Accounts** for self-hosted instances, enabling developers to publish and monetize extensions through a centralized marketplace. The Universal Extension Marketplace backend provides a public extension listing endpoint with 15-minute caching for performance. Stripe Connect account management has been added, allowing developers to update bank account details after initial onboarding. The **fleetbase-cli** has been significantly enhanced with new commands including `flb register` for developer account registration, `flb verify` for email verification, `flb resend-verification` for expired codes, and `flb install-fleetbase` for Docker-based installation with automatic repository cloning.

### 🌍 Geolocation & UX Improvements

A critical bug affecting user onboarding has been fixed where the system was displaying the **server's location** instead of the **user's actual location**. The **ember-core** now implements frontend IP lookup using multiple geolocation APIs (geoiplookup.io and ipapi.co) with automatic fallback support and localStorage caching. The **phone-input component** in **ember-ui** has been updated to use this frontend IP lookup, ensuring accurate country code detection for phone number formatting. The **IAM engine** now features tabbed user type sections in the users management interface for better organization.

### 📈 Reporting & Data Access

**FleetOps** now exposes the `meta` column and `Transaction` relationships in the Orders report schema, enabling users to query and report on order metadata, custom fields, and financial data including transaction amounts, line items, and aggregates. This resolves a significant limitation where critical financial data was previously inaccessible in reports.

### 🌐 Internationalization

Support for **KZT (Kazakhstani Tenge)** currency has been added across both **core-api** and **ember-ui**, expanding Fleetbase's international capabilities.

---

## 🔐 Security Fixes

- **[core-api]** Patched critical tenant isolation vulnerability (GHSA-3wj9-hh56-7fw7) with CompanyScope global scope
- **[core-api]** Removed hardcoded SMS auth bypass code, replaced with environment-driven bypass for non-production
- **[core-api]** Fixed cross-tenant IDOR vulnerabilities with company-scoped authorization
- **[core-api]** Enforced strong password policy across all validators
- **[core-api]** Prevented user enumeration in login flow
- **[core-api]** Restored authToken re-authentication with identity verification

---

## ✨ New Features

### Analytics & Tracking
- **[ember-core]** Added centralized events service for analytics tracking across all core services
- **[ember-core]** Event tracking in CRUD service (create, update, delete, bulk actions, import, export)
- **[ember-core]** Dual event system (fires on both events service and universe service)
- **[fleetops]** Added event tracking to 30 FleetOps controllers for event tracking
- **[fleetops]** Import operations now return count of imported records in response

### Developer Tools
- **[registry-bridge]** Registry Developer Account support for self-hosted instances
- **[registry-bridge]** Universal Extension Marketplace backend with public extension listing endpoint
- **[registry-bridge]** Stripe Connect account management for bank account updates
- **[registry-bridge]** Email verification for developer accounts using VerificationCode model
- **[registry-bridge]** Automatic registry token generation upon email verification
- **[fleetbase-cli]** Added `flb register` command for Registry Developer Account registration
- **[fleetbase-cli]** Added `flb verify` command for email verification
- **[fleetbase-cli]** Added `flb resend-verification` command to request new verification codes
- **[fleetbase-cli]** Added `flb install-fleetbase` command for Docker-based installation
- **[fleetbase-cli]** Auto-clone Fleetbase repository if not present during installation
- **[fleetbase-cli]** Support for `--host` parameter to work with self-hosted instances

### Reporting & Data
- **[fleetops]** Exposed meta column and Transaction relationships in Orders report schema for financial reporting
- **[core-api]** User cache now includes updated_at timestamp for automatic cache busting

### UI/UX
- **[iam-engine]** Added tabbed user type sections to users management interface
- **[iam-engine]** Enhanced edit user interface with better validation and error handling

### Internationalization
- **[core-api]** Added KZT (Kazakhstani Tenge) currency support
- **[ember-ui]** Added support for KZT currency

---

## 🐛 Bug Fixes

### Geolocation
- **[ember-core]** Implemented frontend IP lookup to get accurate user location (fixes onboarding showing server location)
- **[ember-core]** Added lookup-user-ip utility with multi-API fallback support (geoiplookup.io and ipapi.co)
- **[ember-core]** localStorage caching for IP lookup results (1 hour TTL)
- **[ember-core]** Graceful fallback to browser timezone when geolocation APIs fail
- **[ember-ui]** Updated phone-input component to use frontend IP lookup (fixes incorrect country code detection)
- **[ember-ui]** Phone input now always initializes with US fallback if geolocation fails

### Core Fixes
- **[core-api]** Verification codes now default to 'pending' status
- **[core-api]** Fixed verification email HTML rendering (button component)
- **[core-api]** Prevented empty email/phone on user update
- **[core-api]** Resolved camelCase expansion methods from snake_case query params in Filter
- **[fleetops]** Prevented duplicate driver creation when user_uuid already has a driver profile
- **[registry-bridge]** Made developer account registration routes public (no auth required)
- **[registry-bridge]** Polymorphic purchaser relationship for extension purchases (supports both Company and RegistryDeveloperAccount)

---

## 🔧 Improvements

- **[fleetops]** Moved avatar management to FleetOps settings
- **[ember-ui]** Faster phone input lookup (1 network hop vs 2, no backend dependency)
- **[fleetbase-cli]** Better error handling and debugging for all commands
- **[fleetbase-cli]** Skip interactive prompts when command-line options are provided
- **[ember-core]** Standardized event naming with dot notation (e.g., resource.created, order.created)

---

## ⚠️ Breaking Changes

- None 🙂

---

## 🔧 Upgrade Steps

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

## 📦 Component Versions

- **core-api**: v1.6.36
- **fleetops**: v0.6.36
- **registry-bridge**: v0.1.6
- **iam-engine**: v0.1.7
- **ember-core**: v0.3.11, v0.3.12
- **ember-ui**: v0.3.20, v0.3.21
- **fleetbase-cli**: v0.0.4

---

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/ember-ui/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
