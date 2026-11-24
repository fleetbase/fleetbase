#!/bin/sh
# Starts the API: Octane on FrankenPHP, with any extra arguments (the dev image passes --watch).
#
# Optional, for extensions installed from the Registry Service (registry-bridge's installer):
#   EXTENSIONS_SYNC_ON_START=true  re-resolve api/extensions against this image's core first
#                                  (`php artisan extensions:sync`), for an api/extensions volume kept
#                                  across image upgrades. A failure is reported and the API starts anyway.
#   REGISTRY_INSTALLER_WORKER=true run the installer's queue worker in this container, beside Octane, so an
#                                  install changes the files Octane serves and can reload its workers
#                                  (set REGISTRY_INSTALLER_RELOAD_OCTANE=true as well). The worker is
#                                  restarted when it exits.
set -u

if [ "${EXTENSIONS_SYNC_ON_START:-false}" = "true" ] && [ -f extensions/composer.json ]; then
  php artisan extensions:sync --ansi || echo "[start-api] extensions:sync failed; starting the API with the extensions as they are." >&2
fi

if [ "${REGISTRY_INSTALLER_WORKER:-false}" = "true" ]; then
  (
    while :; do
      php artisan queue:work --queue="${REGISTRY_INSTALLER_QUEUE:-installer}" --timeout="${REGISTRY_INSTALLER_TIMEOUT:-7200}" --tries=1 --max-time=3600 --sleep=3 \
        || echo "[start-api] installer worker exited ($?); restarting." >&2
      sleep 5
    done
  ) &
fi

exec php artisan octane:frankenphp --max-requests=1000 --port=8000 --host=0.0.0.0 "$@"
