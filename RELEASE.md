> v0.7.65 ~ "Authenticator app two-factor sign-in, safer password changes, and a cross-platform installer"

---
## Highlights
Fleetbase `0.7.65` ships RELEASE_NOTES_PLACEHOLDER (component versions are filled in once the component releases are published).

- **Sign in with an authenticator app.** Two-factor authentication can use an authenticator app with recovery codes, set up from Account › Auth.
- **Two-factor sign-in checks the password first.** A two-factor code can no longer stand in for the password, and too many wrong codes end the sign-in.
- **Changing your password asks for the current one**, and organizations choose whether users can change their own password.
- **The Docker installer works on macOS and Windows.**

---
## Component Versions
- `console`: `0.7.65`
- RELEASE_NOTES_PLACEHOLDER

---
## Security
- **Two-factor sign-in checks the password first** (fleetbase #684). The login page asked the server about two-factor before sending the password, which let the two-factor code stand in for it. The password is now checked first, and the two-factor step starts only after it is accepted. After too many wrong codes the server ends the two-factor session and the console returns you to the login page.
- **Changing your password needs the current password** (fleetbase #685, core-api #275). Account › Auth › Change Password has a **Current Password** field, checked in the same request. Changing your own password is an IAM permission (`iam change-password`), or an organization setting that allows it for everyone.

---
## Authenticator App Two-Factor Authentication
(fleetbase #686, core-api #277)

- **Authenticator App** is offered, marked Recommended, as a two-factor method in Account › Auth. It shows **Needs setup** until you set it up.
- Setup asks for your current password, shows a QR code and the key for manual entry, checks a code from the app, then shows recovery codes to copy or download.
- A new **Authenticator App** panel sets the app up, removes it, or issues new recovery codes, each after your current password.
- At sign-in you enter the code from the app, or **Use a recovery code**, or **Send me a code instead** to fall back to email or SMS.
- Organization and system two-factor settings can't make the authenticator app the default, since each user has to set it up.

---
## Console
- **Settings › Authentication** is reachable, with a toggle for "Allow users to change their own password" (fleetbase #685).
- The Blog and GitHub widgets close the Default Dashboard as its right column. The GitHub card has a new look: a Star button, the latest release, and Stars, Watchers, Forks and Issues counts. It no longer scrolls inside its slot (fleetbase #682).
- Fixed "Configutation" in the Push Notifications settings panel titles (fleetbase #681).

---
## Installer
(fleetbase #677)

- `scripts/docker-install.sh` runs on macOS's stock `/bin/bash` 3.2 and on Windows Git Bash. The interactive wizard crashed on macOS with `bad substitution`.
- The port check works on macOS and Windows, and only warns.
- The installer creates `api/.env` before starting the stack, so Docker no longer creates a directory there and stops the API from booting.
- A root `.gitattributes` keeps shell scripts, Dockerfiles and config files LF on Windows checkouts.

---
## Console and API Packages
- Bumped the root Docker image version to `0.7.65`.
- Bumped Console to `0.7.65`.
- RELEASE_NOTES_PLACEHOLDER

---
## Bug Fixes
- Fixed a two-factor code being accepted in place of the password at sign-in.
- Fixed the Docker installer failing on macOS and Windows, and leaving `api/.env` as a directory.
- Fixed the Settings › Authentication page being unreachable.
- Fixed "Configutation" in the Push Notifications settings.

---
## Upgrade Steps
- Deploy the API and console together: the console now sends the current password when changing a password, and checks the password before two-factor sign-in.
- RELEASE_NOTES_PLACEHOLDER

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
