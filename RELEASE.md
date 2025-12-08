# 🚀 Fleetbase v0.7.22 — 2025-12-07

> "Organizations can now set their own alpha-numeric sender ID for SMS"

---

## ✨ Highlights
- **Custom Alphanumeric Sender ID for SMS:**  
  Organizations can now configure their own **Alphanumeric Sender ID** used when sending verification codes and other SMS notifications.  
  This feature improves brand recognition, enhances trust, and aligns outbound communication with each organization’s identity.  
  Supported in regions/carriers where alphanumeric senders are allowed (e.g., Mongolia and others).

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

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/ember-ui/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
