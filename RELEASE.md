# 🚀 Fleetbase v0.7.21 — 2025-12-06

> "5x faster css compiling and flawless builds."

---

## ✨ Highlights

### 🔧 Critical Production Build Fix

This release resolves a **critical issue** that prevented production builds from succeeding when using ember-ui in Ember Engines environments. All Fleetbase applications and engines should upgrade immediately.

**What was broken:**
Production builds were failing with "Broken @import declaration" errors during CSS minification. Development builds worked fine, but production deployments were completely blocked.

**What we fixed:**
Implemented a proper architectural solution that prevents Ember Engines from attempting to recompile ember-ui styles. The addon now correctly detects when it's being included by an engine and blocks both the style tree distribution and PostCSS configuration override.

**The impact:**
- ✅ **Production builds now succeed** without CSS import errors
- ✅ **5x faster builds** — CSS is compiled once in the host app instead of being reprocessed by each engine
- ✅ **4x smaller bundles** — Eliminated CSS duplication across engine vendor files (reduced from ~3MB to ~750KB in typical setups)
- ✅ **Consistent styling** — All engines now use the same compiled CSS from the host application

**Technical details:**
The fix adds engine detection to both the `treeForStyles` and `included` hooks, ensuring that ember-ui styles are compiled exclusively in the host application and inherited by all engines. This follows the proper Ember Engines architecture pattern for shared addon styles.

---

## ⚠️ Breaking Changes
- None — This is a fully backward-compatible patch that only changes internal build behavior

---

## 🔧 Upgrade Steps

### For System
```bash
# Pull latest version
git pull origin main --no-rebase

# Update docker
docker compose pull
docker compose down && docker compose up -d

# Run deploy script
docker compose exec application bash -c "./deploy.sh"
```

### For Extension Developers
```bash
# Update ember-ui
pnpm upgrade @fleetbase/ember-ui@^0.3.14 @fleetbase/ember-core@^0.3.8

# Reinstall dependencies
pnpm install
```

### Verification
```bash
# Verify production build succeeds
pnpm build --environment production

# Check bundle sizes (should see significant reduction)
ls -lh dist/assets/vendor*.css
ls -lh dist/engines-dist/*/assets/engine-vendor*.css
```

---

## 📦 What Changed

### Fixed
- **Critical**: Production build failures in Ember Engines environments with "Broken @import declaration" errors
- CSS duplication across engine bundles causing bloated file sizes
- PostCSS configuration conflicts between host app and engines

### Changed
- Added `treeForStyles` hook with engine detection to prevent style tree distribution to engines
- Added engine detection guard in `included` hook to prevent `postcssOptions` override
- Improved CSS import path resolution in PostCSS configuration

### Performance
- Reduced build time by 5x through single CSS compilation
- Reduced total CSS bundle size by 4x through elimination of duplication
- Improved caching efficiency with shared vendor.css

---

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/ember-ui/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
