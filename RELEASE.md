> v0.7.67 ~ "API keys are generated randomly"

---
## Highlights
Fleetbase `0.7.67` ships Core API `1.6.67`. It is a security release: upgrade promptly.

- **API keys created in the same second were identical, across organizations.** API keys are now generated randomly.

---
## Component Versions
- `console`: `0.7.67`
- `core-api`: `1.6.67`
- `fleetops`: `0.6.70`
- `storefront`: `0.4.23`
- `ledger`: `0.0.11`
- `ember-ui`: `0.4.4`
- `registry-bridge`: `0.1.10`
- `customer-portal`: `0.0.15`

---
## Security
- **API keys created in the same second were identical, across organizations** (core-api #283). An API key was derived from the time it was created and its row id. The id was never loaded when the key was generated, so every key created in the same second, on any organization, got the same value. API authentication resolves a key to the first matching credential, so a key issued to one organization could authenticate as another's. Keys, including rolled keys, are now 32 random characters from a cryptographically secure generator.

---
## Upgrade Steps
- **Check for duplicate API keys and roll every credential that shares one.** Existing keys keep their values until they are rolled. Run this against both the live and the sandbox database:

```sql
SELECT `key`, COUNT(*) AS credentials, COUNT(DISTINCT company_uuid) AS orgs
FROM api_credentials WHERE deleted_at IS NULL
GROUP BY `key` HAVING COUNT(*) > 1;
```

Roll each affected key from Developers › API Keys, or tell the affected organizations to.

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
