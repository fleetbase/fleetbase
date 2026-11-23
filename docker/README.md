### Docker setup

To populate the database in docker put any `.sql` or `.sql.gz` file(s) into `docker/database` folder.
Then run `docker-compose up`.

### Installing extensions from the registry

`docker-compose.yml` installs extensions for real (not record-only), with no console rebuild:

| Piece | Where |
| --- | --- |
| The installer's queue worker | In `application`, beside Octane (`REGISTRY_INSTALLER_WORKER=true`, started by `docker/scripts/start-api.sh`). It reloads Octane's workers after each install (`REGISTRY_INSTALLER_RELOAD_OCTANE=true`), so new routes and service providers load without a restart. |
| Backend packages | `api/extensions` on the `api_extensions` named volume, shared with `queue` and `scheduler`. It is seeded from the image on first start and kept across image upgrades; `EXTENSIONS_SYNC_ON_START=true` re-resolves it against the new core when `application` starts. |
| Console engines | Prebuilt engine releases are unpacked into `api/storage/app/registry-runtime-engines` and served by the API at `~registry/v1/engines/files/…`; the console loads them at boot from the runtime manifest. |
| Compatibility check | The console image writes `host-modules.json` in every build; the API reads it from `http://console:4200/host-modules.json` (`REGISTRY_HOST_MODULES_PATH`). |

A release without a prebuilt engine would need a console rebuild, which this setup cannot do; the installer then reports why. Set `REGISTRY_PREINSTALLED_EXTENSIONS=true` only where every extension is already in the images (Fleetbase Cloud): installs then only record and report.
