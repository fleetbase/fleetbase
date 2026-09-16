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
  </p>
  <p align="center" dir="auto">
    <strong>Open-source logistics and supply chain operating system</strong>
    <br>
    <a href="https://www.fleetbase.io/docs" rel="nofollow">Documentation</a>
    ·
    <a href="https://www.fleetbase.io/docs/api" rel="nofollow">API Reference</a>
    ·
    <a href="https://console.fleetbase.io/onboard" rel="nofollow">Try Fleetbase Cloud</a>
    ·
    <a href="https://tally.so/r/3NBpAW" rel="nofollow">Book a Demo</a>
    ·
    <a href="https://discord.gg/V7RVWRQ2Wm" rel="nofollow">Discord</a>
  </p>
  <hr />
</div>

## What is Fleetbase?

Fleetbase is an open-source, modular operating system for logistics and supply chain operations. It covers dispatch, fleet management, live tracking, commerce, warehousing, and finance in one platform, with a REST API, webhooks, and an extension system for everything else. Run it on your own infrastructure or use [Fleetbase Cloud](https://console.fleetbase.io/onboard).

<p align="center" dir="auto">
  <img src="https://fleetbase.io/images/screenshots/fleet-ops/fleet-ops-multi-waypoint-order.webp" alt="A multi-waypoint order in Fleet-Ops, showing the route on a map beside the order's activity, driver, and vehicle details" width="1200" style="max-width: 100%;" />
</p>

## Table of Contents

- [Who Uses Fleetbase](#who-uses-fleetbase)
- [Platform](#platform)
- [Features](#features)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [Extensions](#extensions)
- [Roadmap](#roadmap)
- [Documentation](#documentation)
- [Community & Support](#community--support)
- [Contributing](#contributing)
- [Creators](#creators)
- [License](#license)

## Who Uses Fleetbase

Fleetbase is built for teams that move goods, people, or equipment and want to own the software that runs it. Because every workflow, field, and status is configurable, the same platform adapts to very different operations.

| Industry | How Fleetbase is used |
|----------|-----------------------|
| [Trucking & Haulage](https://fleetbase.io/solutions/trucking) | Replace a legacy TMS with real-time tracking, route optimization, and digital proof of delivery. |
| [Courier & Parcel](https://fleetbase.io/solutions/courier-services) | Automate dispatch, raise first-attempt delivery rates, and give customers live parcel tracking. |
| [Food & Grocery Delivery](https://fleetbase.io/solutions/food-delivery) | Run on-demand delivery with instant dispatch, live customer tracking, and automated notifications. |
| [E-commerce & Retail](https://fleetbase.io/solutions/ecommerce) | Power same-day and next-day delivery and returns through a headless API. |
| [Healthcare & Pharmacy](https://fleetbase.io/solutions/healthcare) | Track chain of custody and prioritize urgent deliveries with full audit trails. |
| [Waste & Recycling](https://fleetbase.io/solutions/waste-management) | Optimize collection routes, track containers, and produce compliance reports. |
| [Container Operations](https://fleetbase.io/solutions/container-operations) | Follow containers across multi-modal journeys from port to door. |
| [Government & Defense](https://fleetbase.io/solutions/government) | Self-host with role-based access, full audit trails, and complete data sovereignty. |

Developers use Fleetbase as a foundation too, building custom logistics products on its API and extension framework.

## Platform

Fleetbase is made up of modules that install into the console as extensions. Each one works on its own and integrates with the rest.

| Module | What it does |
|--------|--------------|
| [Fleet-Ops](https://www.fleetbase.io/docs/fleet-ops) | Fleet management and dispatch: orders, drivers, vehicles, live tracking, route optimization, configurable workflows, and maintenance. |
| [Storefront](https://www.fleetbase.io/docs/storefront) | Headless commerce for on-demand businesses, with multi-vendor marketplaces and native Fleet-Ops delivery. |
| [Pallet](https://www.fleetbase.io/docs/pallet) | Warehouse management for inventory, pick lists, cycle counts, and fulfilment. |
| [Ledger](https://www.fleetbase.io/docs/ledger) | Invoicing, payments, wallets, and accounting for logistics operators. |
| [AI](https://fleetbase.io/platform/ai) | Natural-language order creation, operational queries, and order insights powered by OpenAI or Claude. |
| [Navigator App](https://github.com/fleetbase/navigator-app) | Open-source driver app for iOS and Android with real-time dispatch, navigation, and proof of delivery. |
| [Storefront App](https://github.com/fleetbase/storefront-app) | Open-source iOS and Android app for launching your own shop or marketplace. |

## Features

| Feature | Description |
|---------|-------------|
| **Extensible** | Install extensions from the marketplace or build your own to add features directly into the OS. |
| **Developer friendly** | REST API, WebSockets, and webhooks for integrating external systems or building custom apps. |
| **Configurable workflows** | Define order types with their own activity flows, custom fields, and automation. |
| **Real-time operations** | Track drivers, vehicles, and orders live, with geofences and service zones. |
| **Telematics** | Connect GPS devices and sensors for live feedback from the field. |
| **Identity & access** | Organizations, users, roles, policies, and two-factor authentication. |
| **Dashboards** | Build custom dashboards and widgets for visibility into operations. |
| **Collaboration** | Built-in chat, comments, and notifications across your organization. |
| **Internationalized** | Translate the console into any language. |
| **Self-hosted or cloud** | Run it on your own infrastructure with full control of your data, or let us host it. |

## Screenshots

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="https://fleetbase.io/images/screenshots/fleet-ops/fleet-ops-orders-kanban.webp" alt="Fleet-Ops order board" width="100%" />
      <p align="center"><strong>Order Board</strong><br>Move orders through each stage on a Kanban board.</p>
    </td>
    <td width="50%" valign="top">
      <img src="https://fleetbase.io/images/screenshots/fleet-ops/fleet-ops-live-orders-panel.webp" alt="Fleet-Ops live map with active orders" width="100%" />
      <p align="center"><strong>Live Operations</strong><br>See active and unassigned orders beside your fleet on a live map.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="https://fleetbase.io/images/screenshots/fleet-ops/fleet-ops-order-config-activity-flow.webp" alt="Fleet-Ops order configuration activity flow editor" width="100%" />
      <p align="center"><strong>Order Config</strong><br>Design custom activity flows, fields, and entities for each order type.</p>
    </td>
    <td width="50%" valign="top">
      <img src="https://fleetbase.io/images/screenshots/fleet-ops/fleet-ops-orchestrator-1.webp" alt="Fleet-Ops orchestrator workbench" width="100%" />
      <p align="center"><strong>Orchestrator</strong><br>Plan and assign batches of orders across available vehicles and drivers.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="https://fleetbase.io/images/screenshots/fleet-ops/fleet-ops-geofences.webp" alt="Fleet-Ops service areas, zones, and geofence events" width="100%" />
      <p align="center"><strong>Service Zones & Geofences</strong><br>Define service areas and zones, and watch geofence events as they happen.</p>
    </td>
    <td width="50%" valign="top">
      <img src="https://fleetbase.io/images/screenshots/storefront/storefront-products-overview.webp" alt="Storefront product catalog" width="100%" />
      <p align="center"><strong>Storefront</strong><br>Manage products, catalogs, and orders for your shop or marketplace.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="https://fleetbase.io/images/screenshots/ledger/ledger-dashboard.webp" alt="Ledger financial dashboard" width="100%" />
      <p align="center"><strong>Ledger</strong><br>Track revenue, invoices, receivables, and wallet balances.</p>
    </td>
    <td width="50%" valign="top">
      <img src="https://fleetbase.io/images/screenshots/extensions/extensions-browse.webp" alt="Extensions marketplace" width="100%" />
      <p align="center"><strong>Extensions</strong><br>Browse and install free and paid extensions from the marketplace.</p>
    </td>
  </tr>
</table>

## Getting Started

There are three ways to run Fleetbase:

- **[Fleetbase Cloud](https://www.fleetbase.io/docs/platform/quickstart/cloud-quickstart)**: fully managed, with nothing to install. [Start a free trial](https://console.fleetbase.io/onboard).
- **[Run locally](https://www.fleetbase.io/docs/platform/quickstart/running-locally)**: self-host with Docker on your own machine or server.
- **[Deploy in your cloud](https://www.fleetbase.io/docs/platform/quickstart/deploy-in-cloud)**: run production workloads on AWS, GCP, Azure, or any other provider.

### Quickstart

You need Docker with Docker Compose v2, Git, Node.js 18 or newer, and at least 4 GB of RAM allocated to Docker. Then install the Fleetbase CLI and run the interactive installer:

```bash
npm install -g @fleetbase/cli
flb install-fleetbase
```

When setup finishes, open the console at http://localhost:4200 and create your first admin account and organization. The API is served at http://localhost:8000.

The [running locally guide](https://www.fleetbase.io/docs/platform/quickstart/running-locally) also covers installing with Docker Compose or the setup script, configuring services like mail, maps, and SMS, and troubleshooting. To work on Fleetbase itself, follow the [development setup guide](https://www.fleetbase.io/docs/platform/quickstart/development-setup).

## Extensions

Extensions add features, integrate external systems, or change how Fleetbase behaves. Browse and install them from the console or with the [Fleetbase CLI](https://www.fleetbase.io/docs/cli), and publish your own to the marketplace as free or paid extensions.

- [Browse and install extensions](https://www.fleetbase.io/docs/platform/extensions/browsing-and-installing)
- [Build your first extension](https://www.fleetbase.io/docs/extension-development/getting-started/quickstart)
- [Extension architecture](https://www.fleetbase.io/docs/extension-development/architecture/overview)

## Roadmap

| Feature | Status | Expected Release | Description |
|---------|--------|------------------|-------------|
| **Pallet (WMS)** | In development | Q4 2026 | Inventory and warehouse management extension |
| **Dynamic Rules** | Planned | 2027 | Rule builder to trigger events, tasks, and jobs |

Want to influence the roadmap? [Join the discussion](https://github.com/orgs/fleetbase/discussions).

## Documentation

- **[Overview](https://www.fleetbase.io/docs/platform/getting-started/overview)** and **[architecture](https://www.fleetbase.io/docs/platform/getting-started/architecture)**: how the platform fits together
- **[Installation](https://www.fleetbase.io/docs/platform/quickstart/running-locally)**: run Fleetbase locally or [deploy it in the cloud](https://www.fleetbase.io/docs/platform/quickstart/deploy-in-cloud)
- **[System setup](https://www.fleetbase.io/docs/platform/system-setup/services)**: configure mail, maps, SMS, storage, queues, and sockets
- **[API reference](https://www.fleetbase.io/docs/api)**: endpoints, authentication, and [API keys](https://www.fleetbase.io/docs/platform/developer-console/api-keys)
- **[Fleetbase CLI](https://www.fleetbase.io/docs/cli)**: every command for installing, managing, and publishing extensions
- **[Extension development](https://www.fleetbase.io/docs/extension-development/getting-started/quickstart)**: build and publish your own extensions
- **[Database schema](erd.svg)**: an entity relationship diagram of the full database, regenerated with each release ([dark version](erd-dark.svg))

## Community & Support

- **Discord**: Chat with maintainers and other users on [Discord](https://discord.gg/V7RVWRQ2Wm).
- **Discussions**: Ask questions and share ideas in [GitHub Discussions](https://github.com/orgs/fleetbase/discussions).
- **Bugs**: Search the [issue tracker](https://github.com/fleetbase/fleetbase/issues) first, then [open a new issue](https://github.com/fleetbase/fleetbase/issues/new).
- **Security**: Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
- **Support plans**: See [community, cloud, and enterprise support options](https://www.fleetbase.io/docs/community/support-plans).
- **Releases**: Read changelogs on the [Releases](https://github.com/fleetbase/fleetbase/releases) page and announcements on the [Fleetbase blog](https://www.fleetbase.io/blog).
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

Fleetbase is dual-licensed. Choose the license that fits how you use it.

**Open source (AGPL-3.0).** Fleetbase is released under the [GNU Affero General Public License v3.0](LICENSE.md). You can use, modify, and self-host it freely, including to run your own commercial operations. If you modify Fleetbase and make it available to others over a network, you must release those modifications under AGPL-3.0.

**Fleetbase Commercial License (FCL).** The commercial license removes the AGPL-3.0 obligations. It lets you keep modifications proprietary, build SaaS products on Fleetbase, and white-label or distribute it under your own brand. It also includes support options and IP indemnification.

Read the [licensing overview](https://fleetbase.io/licensing) to see which license applies to you, or see the [Commercial License](https://fleetbase.io/licensing/commercial) for details. Questions go to [hello@fleetbase.io](mailto:hello@fleetbase.io).

---

**Copyright © 2026 Fleetbase Pte. Ltd.** All rights reserved.
