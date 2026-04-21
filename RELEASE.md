> v0.7.35 ~ "Send user invites directly"
---
## ✨ Highlights
Patched user invitation flow and adds an explicit "Invite User" button to IAM.

---
## 🐛 Bug Fixes
- Patched user invitation flow via creation and explicit invites.
- Patch sandbox api key creation.

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
- **fleetbase**: v0.7.35
- **fleetops**: v0.6.42
- **core-api**: v1.6.41
- **iam-engine**: v0.1.9

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)