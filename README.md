<div id="hero">
  <p align="center" dir="auto">
    <a href="https://fleetbase.io" rel="nofollow">
      <img src="https://user-images.githubusercontent.com/58805033/191936702-fed04b0f-7966-4041-96d0-95e27bf98248.png" alt="Fleetbase logo" width="500" height="120" style="max-width: 100%;">
    </a>
  </p>
  <p align="center" dir="auto">
    <a href="https://trendshift.io/repositories/1160?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-1160" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/repositories/1160" alt="fleetbase%2Ffleetbase | Trendshift" width="250" height="55"/></a>
  </p>
  <p align="center" dir="auto">
    <a href="https://github.com/fleetbase/fleetbase/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/fleetbase/fleetbase" alt="License"></a>
    <a href="https://github.com/fleetbase/fleetbase/releases"><img src="https://img.shields.io/github/v/release/fleetbase/fleetbase" alt="Latest Release"></a>
    <a href="https://codecov.io/gh/fleetbase/fleetbase"><img src="https://codecov.io/gh/fleetbase/fleetbase/branch/main/graph/badge.svg" alt="Coverage"></a>
    <a href="https://github.com/fleetbase/fleetbase/stargazers"><img src="https://img.shields.io/github/stars/fleetbase/fleetbase?style=social" alt="GitHub Stars"></a>
    <a href="https://discord.gg/V7RVWRQ2Wm"><img src="https://img.shields.io/discord/699834923032248430?logo=discord&label=Discord" alt="Discord"></a>
    <a href="https://github.com/fleetbase/fleetbase/issues"><img src="https://img.shields.io/github/issues/fleetbase/fleetbase" alt="GitHub Issues"></a>
  </p>
  <p align="center" dir="auto">
    <strong>Modular logistics and supply chain operating system</strong>
    <br>
    <a href="https://www.fleetbase.io/docs" rel="nofollow" target="_fleetbase_docs">Documentation</a>
    ·
    <a href="https://www.fleetbase.io/docs/api" rel="nofollow" target="_fleetbase_api_docs">API Reference</a>
    ·
    <a href="https://console.fleetbase.io" rel="nofollow" target="_fleetbase_console">Fleetbase Cloud</a>
    ·
    <a href="https://tally.so/r/3NBpAW" rel="nofollow">Book a Demo</a>
    ·
    <a href="https://discord.gg/V7RVWRQ2Wm" target="discord" rel="nofollow">Discord</a>
  </p>
  <hr />
</div>

## What is Fleetbase?

Fleetbase is an open-source, modular logistics and supply chain operating system. It gives you order management, dispatch, live fleet tracking, service zones, a full REST API, and an extension system to build the rest, whether you run last-mile delivery, a courier network, field services, or an enterprise supply chain.

<p align="center" dir="auto">
  <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/fleetbase_overview.png" alt="Fleetbase Console" width="1200" style="max-width: 100%;" />
</p>

## Quickstart

```bash
npm install -g @fleetbase/cli
flb install-fleetbase
```

Once the installer finishes, the console is at http://localhost:4200 and the API is at http://localhost:8000. See [Install](#install) for prerequisites, the script-based alternative, and configuration.

## Table of Contents

- [Who Is Fleetbase For?](#who-is-fleetbase-for)
- [Features](#features)
- [Screenshots](#screenshots)
- [Install](#install)
- [Fleetbase CLI](#fleetbase-cli)
- [Extensions](#extensions)
- [Apps](#apps)
- [Repository Layout](#repository-layout)
- [Roadmap](#roadmap)
- [Deployment Options](#deployment-options)
- [Documentation](#documentation)
- [Community & Support](#community--support)
- [Contributing](#contributing)
- [Creators](#creators)
- [License](#license)

## Who Is Fleetbase For?

- **E-commerce & Retail** - Manage deliveries, track orders, and optimize last-mile logistics
- **Food & Beverage** - Coordinate restaurant deliveries, manage drivers, and track orders in real time
- **Courier Services** - Dispatch drivers, optimize routes, and give customers live tracking
- **Field Services** - Schedule technicians, manage service areas, and track job completion
- **Enterprise Logistics** - Build custom supply chain solutions on top of a full API
- **Developers** - Extend and customize the platform through its modular architecture

## Features

| Feature | Description |
|---------|-------------|
| 🔌 **Extensible** | Install extensions or build your own to add features directly into the OS. |
| 👨‍💻 **Developer Friendly** | REST API, WebSockets, and webhooks for integrating external systems or building custom apps. |
| 📱 **Native Apps** | Open-source driver and storefront apps for iOS and Android. |
| 🔄 **Dynamic Workflows** | Configurable order flows, rules, custom fields, and automation. |
| 📊 **Dashboards** | Custom dashboards and widgets for full visibility into operations. |
| 📡 **Telematics** | Connect hardware devices and sensors for live feedback from the field. |
| 🤝 **Collaboration** | Built-in chat and comments across your organization. |
| 🔒 **Security** | Data encryption and a dynamic Identity and Access Management (IAM) system. |
| 🌐 **Internationalized** | Translate the console into any language. See [TRANSLATING.md](TRANSLATING.md). |
| ⚙️ **Framework** | A PHP core built around logistics and supply chain abstractions to speed up extension development. |
| 🌍 **Open Source** | AGPL-3.0 licensed. Run it on-premise or in the cloud, or use [Fleetbase Cloud](https://console.fleetbase.io). |

## Screenshots

| Feature | Screenshot | Description |
|---------|------------|-------------|
| **Order Board** | <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/order-board-kanban.png" alt="Fleetbase Order Board" width="600" /> | Visualize and manage orders on a dynamic Kanban board. |
| **Order Config** | <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/order-workflow-config.png" alt="Fleetbase Order Configuration" width="600" /> | Build custom order configurations with logic, rules, automation, activity flows, and custom fields. |
| **Order Tracking** | <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/order-map-view.png" alt="Fleetbase Order Map View" width="600" /> | Track individual orders in real time on an interactive map. |
| **Live Fleet Map** | <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/live-map-tracking.png" alt="Fleetbase Live Map Tracking" width="600" /> | See your whole fleet and every active order on one live map. |
| **Service Zones** | <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/fleet-map-zones.png" alt="Fleetbase Fleet Map with Zones" width="600" /> | Define and manage service areas and zones for your fleet. |

## Install

The Fleetbase CLI automates the whole Docker-based installation. For other local setups, read the [running locally guide](https://www.fleetbase.io/docs/platform/quickstart/running-locally).

### Prerequisites

- Node.js 22 or newer
- Docker and Docker Compose
- Git

### Install with the CLI

```bash
# Install the Fleetbase CLI globally
npm install -g @fleetbase/cli

# Run the interactive installer
flb install-fleetbase
```

### Install with the script

```bash
git clone git@github.com:fleetbase/fleetbase.git
cd fleetbase && ./scripts/docker-install.sh
```

### Access Fleetbase

| Service | URL |
|---------|-----|
| Console | http://localhost:4200 |
| API | http://localhost:8000 |

### Configuration

Fleetbase is configured through environment variables on its containers. Copy [`docker-compose.override.yml.example`](docker-compose.override.yml.example) to `docker-compose.override.yml` and set what you need:

```yaml
services:
  application:
    environment:
      CONSOLE_HOST: http://localhost:4200
      MAIL_MAILER: smtp # or ses, mailgun, postmark, sendgrid
      OSRM_HOST: https://router.project-osrm.org
      IPINFO_API_KEY:
      GOOGLE_MAPS_API_KEY:
      GOOGLE_MAPS_LOCALE: us
      TWILIO_SID:
      TWILIO_TOKEN:
      TWILIO_FROM:

  socket:
    environment:
      # Development (localhost only, all protocols):
      SOCKETCLUSTER_OPTIONS: '{"origins":"http://localhost:*,https://localhost:*,ws://localhost:*,wss://localhost:*"}'
      # Production (replace with your domain):
      # SOCKETCLUSTER_OPTIONS: '{"origins":"https://yourdomain.com:*,wss://yourdomain.com:*"}'
```

**CORS.** When installing on a server, set `CONSOLE_HOST` on the application container to the URL the console is served from. Add any other frontends as a comma-delimited list in `FRONTEND_HOSTS`.

**Application key.** If you see an error about a missing application key, generate one and set it as `APP_KEY` on the application container, then restart:

```bash
docker compose exec application bash -c "php artisan key:generate --show"
```

**Routing.** Fleetbase uses the public OSRM server at [router.project-osrm.org](https://router.project-osrm.org) by default. Point `OSRM_HOST` at your own OSRM-compatible server to change this.

**WebSocket security.** `SOCKETCLUSTER_OPTIONS` controls which origins may connect to the socket server. Always restrict it to your own domains in production.

More detail is in the [running locally guide](https://www.fleetbase.io/docs/platform/quickstart/running-locally) and the [development setup guide](https://www.fleetbase.io/docs/platform/quickstart/development-setup).

## Fleetbase CLI

The CLI handles installation, extension management, registry authentication, and extension development.

```bash
npm install -g @fleetbase/cli
```

| Command | Description |
|---------|-------------|
| `flb install-fleetbase` | Install Fleetbase with Docker using an interactive setup |
| `flb search [query]` | Search and browse available extensions |
| `flb install <extension>` | Install an extension into your Fleetbase instance |
| `flb uninstall <extension>` | Remove an extension from your instance |
| `flb register` | Register a registry developer account |
| `flb verify` | Verify your developer account email |
| `flb generate-token` | Generate or regenerate your registry authentication token |
| `flb set-auth <token>` | Set your registry token for installing extensions |
| `flb login` | Authenticate with the registry for publishing |
| `flb scaffold` | Scaffold a new extension |
| `flb publish` | Publish an extension to the registry |
| `flb unpublish` | Remove an extension from the registry |

## Extensions

Extensions are modular packages that add features, change existing behavior, or integrate Fleetbase with external systems. Browse them from the CLI:

```bash
flb search              # list all extensions
flb search fleet        # search by keyword
flb search --category logistics
flb search --free
flb search --json       # machine-readable output
```

### Installing extensions

Installing on a self-hosted instance needs a registry token, which is a one-time setup:

```bash
flb register                                              # 1. create an account
flb verify -e your-email@example.com -c verification-code # 2. verify your email
flb generate-token -e your-email@example.com              # 3. generate your token
flb set-auth your-registry-token-here                     # 4. store it locally
flb install fleetbase/pallet                              # 5. install extensions
```

### Developing extensions

You can build and publish your own extensions, free or paid, through the registry. Start with the [extension development quickstart](https://www.fleetbase.io/docs/extension-development/getting-started/quickstart).

```bash
flb scaffold                                                          # scaffold a new extension
flb login -u your-username -p your-password -e your-email@example.com # authenticate for publishing
flb publish                                                           # publish to the registry
```

## Apps

Fleetbase ships open-source mobile apps that you can brand and deploy as your own.

| App | Description | Platform | Repository |
|-----|-------------|----------|------------|
| **Navigator** | Driver app for managing orders with real-time location tracking | iOS & Android | [fleetbase/navigator-app](https://github.com/fleetbase/navigator-app) |
| **Storefront** | E-commerce and on-demand app for launching your own shop or marketplace | iOS & Android | [fleetbase/storefront-app](https://github.com/fleetbase/storefront-app) |

## Repository Layout

This is a monorepo. The two applications live at the top level and every extension is a git submodule under `packages/`.

| Path | What it is |
|------|------------|
| [`api/`](api) | The Fleetbase API. Laravel 10 running on Octane with FrankenPHP. |
| [`console/`](console) | The Fleetbase console. An Ember 5 application. |
| [`packages/`](packages) | Extensions and shared libraries as submodules: `core-api`, `fleetops`, `fleetops-data`, `storefront`, `pallet`, `ledger`, `ai`, `iam-engine`, `dev-engine`, `registry-bridge`, `customer-portal`, `ember-core`, `ember-ui`, and `fleetbase-extensions-indexer`. |
| [`docker/`](docker) | Dockerfiles for the API and HTTP server, plus seed data. |
| [`scripts/`](scripts) | The Docker install script and package-linking tooling. |
| [`docker-compose.yml`](docker-compose.yml) | The default stack: `application`, `console`, `httpd`, `database` (MySQL 8), `cache` (Redis), `socket` (SocketCluster), `queue`, and `scheduler`. |
| [`erd.svg`](erd.svg) | The database entity relationship diagram, regenerated on each release. |

Clone with submodules to get the extensions:

```bash
git clone --recurse-submodules git@github.com:fleetbase/fleetbase.git
```

## Roadmap

| Feature | Status | Expected Release | Description |
|---------|--------|------------------|-------------|
| **Pallet (WMS)** | 🚧 In Development | Q2 2026 | Inventory and Warehouse Management extension |
| **Dynamic Rules** | 📋 Planned | 2027 | Rule builder to trigger events, tasks, and jobs |

Want to influence the roadmap? [Join the discussion](https://github.com/orgs/fleetbase/discussions).

## Deployment Options

| Option | Best For | Setup Time | Maintenance |
|--------|----------|------------|-------------|
| **Docker (Local)** | Development and testing | 5 minutes | Self-managed |
| **On-Premise** | Production on your own infrastructure | 30-60 minutes | Self-managed |
| **Cloud Self-Hosted** | Production on AWS, GCP, or Azure | 30-60 minutes | Self-managed |
| **Fleetbase Cloud** | Quick start, no DevOps | Instant | Fully managed |

[View the cloud deployment guide →](https://www.fleetbase.io/docs/platform/quickstart/deploy-in-cloud)

## Documentation

- **Getting Started**: [Run Fleetbase locally](https://www.fleetbase.io/docs/platform/quickstart/running-locally)
- **API Reference**: [API documentation](https://www.fleetbase.io/docs/api)
- **Developer Console**: [API keys and integration setup](https://www.fleetbase.io/docs/platform/developer-console/api-keys)
- **Extension Development**: [Extension quickstart](https://www.fleetbase.io/docs/extension-development/getting-started/quickstart)
- **Deployment**: [Deploy Fleetbase in the cloud](https://www.fleetbase.io/docs/platform/quickstart/deploy-in-cloud)

## Community & Support

- **Discord**: Chat with maintainers and other users on [Discord](https://discord.gg/V7RVWRQ2Wm).
- **Discussions**: Ask questions and share ideas in [GitHub Discussions](https://github.com/orgs/fleetbase/discussions).
- **Bugs**: Search the [issue tracker](https://github.com/fleetbase/fleetbase/issues) first, then [open a new issue](https://github.com/fleetbase/fleetbase/issues/new).
- **Security**: Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
- **Releases**: Changelogs are on the [Releases](https://github.com/fleetbase/fleetbase/releases) page. Release announcements are on the [Fleetbase blog](https://www.fleetbase.io/blog).
- **X**: Follow [@fleetbase_io](https://x.com/fleetbase_io).

## Contributing

We welcome contributions from the community.

- **Report bugs**: [Open an issue](https://github.com/fleetbase/fleetbase/issues/new)
- **Suggest features**: [Start a discussion](https://github.com/orgs/fleetbase/discussions)
- **Submit pull requests**: Read the [Contributing Guide](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md)
- **Translate**: Add or improve a language by following [TRANSLATING.md](TRANSLATING.md)
- **Write documentation**: Help improve the [docs](https://www.fleetbase.io/docs)
- **Build extensions**: Create and share [extensions](https://www.fleetbase.io/docs/extension-development/getting-started/quickstart)

To set up a local development environment, see the [development setup guide](https://www.fleetbase.io/docs/platform/quickstart/development-setup).

## Creators

<table style="border: none;">
  <tr>
    <td align="center" style="border: none;">
      <img src="https://user-images.githubusercontent.com/58805033/230263021-212f2553-1269-473d-be94-313cb3eecfa5.png" alt="Ronald A. Richardson" width="120" height="120" style="border-radius: 50%;">
      <br>
      <strong>Ronald A. Richardson</strong>
      <br>
      Co-founder & CTO
      <br>
      <a href="https://github.com/roncodes">GitHub</a> | <a href="https://www.linkedin.com/in/ronald-a-richardson/">LinkedIn</a>
    </td>
    <td align="center" style="border: none;">
      <img src="https://user-images.githubusercontent.com/58805033/230262598-1ce6d0cc-fb65-41f9-8384-5cf5cbf369c7.png" alt="Shiv Thakker" width="120" height="120" style="border-radius: 50%;">
      <br>
      <strong>Shiv Thakker</strong>
      <br>
      Co-founder & CEO
      <br>
      <a href="https://github.com/shivthakker">GitHub</a> | <a href="https://www.linkedin.com/in/shivthakker/">LinkedIn</a>
    </td>
  </tr>
</table>

## License

Fleetbase is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE.md). You are free to use, modify, and distribute it, provided that:

- Any modifications or derivative works are also made available under AGPL-3.0
- If you run a modified version as a network service, you make the source code available to its users

Organizations that need to use Fleetbase without AGPL obligations, keep integrations proprietary, or require commercial support and legal assurances can obtain a commercial license. Contact [hello@fleetbase.io](mailto:hello@fleetbase.io) or visit [fleetbase.io](https://fleetbase.io).

---

**Copyright © 2026 Fleetbase Pte. Ltd.** All rights reserved.
