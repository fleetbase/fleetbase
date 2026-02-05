<div id="hero">
  <p align="center" dir="auto">
      <a href="https://fleetbase.io" rel="nofollow">
        <img src="https://user-images.githubusercontent.com/58805033/191936702-fed04b0f-7966-4041-96d0-95e27bf98248.png" alt="Fleetbase logo" width="500" height="120" style="max-width: 100%;">
      </a>
    </p>
    <p align="center" dir="auto">
      <a href="https://github.com/fleetbase/fleetbase/blob/main/LICENSE"><img src="https://img.shields.io/github/license/fleetbase/fleetbase" alt="License"></a>
      <a href="https://github.com/fleetbase/fleetbase/releases"><img src="https://img.shields.io/github/v/release/fleetbase/fleetbase" alt="Latest Release"></a>
      <a href="https://github.com/fleetbase/fleetbase/stargazers"><img src="https://img.shields.io/github/stars/fleetbase/fleetbase?style=social" alt="GitHub Stars"></a>
      <a href="https://discord.gg/V7RVWRQ2Wm"><img src="https://img.shields.io/discord/927592923834372136?logo=discord&label=Discord" alt="Discord"></a>
      <a href="https://github.com/fleetbase/fleetbase/issues"><img src="https://img.shields.io/github/issues/fleetbase/fleetbase" alt="GitHub Issues"></a>
    </p>
    <p align="center" dir="auto">
      Modular logistics and supply chain operating system
      <br>
      <a href="https://docs.fleetbase.io/" rel="nofollow" target="_fleetbase_docs">Documentation</a>
      ·
      <a href="https://console.fleetbase.io" rel="nofollow" target="_fleetbase_console">Cloud Version</a>
      ·
      <a href="https://tally.so/r/3NBpAW" rel="nofollow">Book a Demo</a>
      ·
      <a href="https://discord.gg/V7RVWRQ2Wm" target="discord" rel="nofollow">Discord</a>
    </p>
    <hr />
</div>

## What is Fleetbase?

Fleetbase is a modular logistics and supply chain operating system designed to streamline management, planning, optimization, and operational control across various sectors of the supply chain industry.

<p align="center" dir="auto">
  <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/fleetbase_overview.png" alt="Fleetbase Console" width="1200" style="max-width: 100%;" />
</p>

## Visual Feature Showcase

| Feature | Screenshot | Description |
|---------|------------|-------------|
| **Order Board** | <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/order-board-kanban.png" alt="Fleetbase Order Board" width="600" /> | Visualize and manage your orders with a dynamic Kanban board. |
| **Workflow Builder** | <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/order-workflow-config.png" alt="Fleetbase Order Workflow Configuration" width="600" /> | Create custom order flows and automation with the intuitive workflow builder. |
| **Order Tracking** | <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/order-map-view.png" alt="Fleetbase Order Map View" width="600" /> | Track individual orders in real-time on an interactive map. |
| **Live Fleet Map** | <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/live-map-tracking.png" alt="Fleetbase Live Map Tracking" width="600" /> | Get a complete overview of your fleet and active orders on a live map. |
| **Service Zones** | <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/fleet-map-zones.png" alt="Fleetbase Fleet Map with Zones" width="600" /> | Define and manage service areas and zones for your fleet. |

**Quickstart**

```bash
git clone git@github.com:fleetbase/fleetbase.git  
cd fleetbase && ./scripts/docker-install.sh
```

## 📖 Table of contents

  - [Features](#-features)
  - [Install](#-install)
  - [Extensions](#-extensions)
  - [Apps](#-apps)
  - [Roadmap](#-roadmap)
  - [Bugs and Feature Requests](#-bugs-and--feature-requests)
  - [Documentation](#-documentation)
  - [Community](#-community)
  - [Creators](#creators)
  - [License & Copyright](#license--copyright)

## 📦 Features

| Feature | Description |
|---------|-------------|
| 🔌 **Extensible** | Build installable extensions and additional functionality directly into the OS via modular architecture. |
| 👨‍💻 **Developer Friendly** | RESTful API, socket, and webhooks to seamlessly integrate with external systems or develop custom applications. |
| 📱 **Native Apps** | Collection of open-source and native apps designed for operations and customer facing. |
| 🤝 **Collaboration** | Dedicated chat and comments system for collaboration across your organization. |
| 🔒 **Security** | Secure data encryption, adherence to industry-standard security practices, and a comprehensive dynamic Identity and Access Management (IAM) system. |
| 📡 **Telematics** | Integrate and connect to hardware devices and sensors to provide more feedback and visibility into operations. |
| 🌐 **Internationalized** | Translate into multiple languages to accommodate diverse user bases and global operations. |
| ⚙️ **Framework** | PHP core built around logistics and supply chain abstractions to streamline extension development. |
| 🔄 **Dynamic** | Configurable rules, flows and logic to enable automation and customization. |
| 🎨 **UI/UX** | Clean, responsive user-friendly interface for efficient management and operations from desktop or mobile. |
| 📊 **Dashboards** | Create custom dashboards and widgets to get full visibility into operations. |
| 📈 **Scalability** | Uninterrupted growth with scalable infrastructure and design, capable of handling increasing data volume and user demand as your business expands. |
| 🔄 **Continuous Improvements** | Commitment to continuous improvement, providing regular updates that seamlessly introduce optimizations, new features, and overall enhancements to the OS. |
| 🌍 **Open Source** | Deploy it either on-premise or in the cloud according to your organization's needs and preferences. |

## 💾 Install
Getting up and running with Fleetbase via Docker is the quickest and most straightforward way. If you'd like to use Fleetbase without docker read the [full install guide in the Fleetbase documentation](https://docs.fleetbase.io/getting-started/install).  
  
Make sure you have both the latest versions of docker and docker-compose installed on your system.

```bash
git clone git@github.com:fleetbase/fleetbase.git  
cd fleetbase && ./scripts/docker-install.sh
```

### Accessing Fleetbase
Once successfully installed and running you can then access the Fleetbase console on port 4200 and the API will be accessible from port 8000.  
  
Fleetbase Console: http://localhost:4200
Fleetbase API: http://localhost:8000

### Additional Configurations

**CORS:** If you're installing directly on a server you will need to configure the environment variables to the application container:
```
CONSOLE_HOST=http://{yourhost}:4200
```
If you have additional applications or frontends you can use the environment variable `FRONTEND_HOSTS` to add a comma delimited list of additioal frontend hosts.

**Application Key** If you get an issue about a missing application key just run:
```bash
docker compose exec application bash -c "php artisan key:generate --show"
```
Next copy this value to the `APP_KEY` environment variable in the application container and restart.
  
**Routing:** Fleetbase ships with a default OSRM server hosted by [router.project-osrm.org](https://router.project-osrm.org) but you're able to use your own or any other OSRM compatible server. You can modify this in the `console/environments` directory by modifying the .env file of the environment you're deploying and setting the `OSRM_HOST` to the OSRM server for Fleetbase to use.  
  
**Services:** There are a few environment variables which need to be set for Fleetbase to function with full features. If you're deploying with docker then it's easiest to just create a `docker-compose.override.yml` and supply the environment variables in this file.

```yaml
version: "3.8"
services:  
  application:  
    environment:  
      CONSOLE_HOST: http://localhost:4200
      MAIL_MAILER: (ses, smtp, mailgun, postmark, sendgrid)
      OSRM_HOST: https://router.project-osrm.org
      IPINFO_API_KEY:
      GOOGLE_MAPS_API_KEY:  
      GOOGLE_MAPS_LOCALE: us
      TWILIO_SID:  
      TWILIO_TOKEN:
      TWILIO_FROM:

  socket:
    environment:
      # IMPORTANT: Configure WebSocket origins for security
      # Development (localhost only - include WebSocket protocols):
      SOCKETCLUSTER_OPTIONS: '{"origins":"http://localhost:*,https://localhost:*,ws://localhost:*,wss://localhost:*"}'
      # Production (replace with your actual domain):
      # SOCKETCLUSTER_OPTIONS: '{"origins":"https://yourdomain.com:*,wss://yourdomain.com:*"}'
```

**WebSocket Security:** The `SOCKETCLUSTER_OPTIONS` environment variable controls which domains can connect to the WebSocket server. Always restrict origins to your specific domains in production to prevent security vulnerabilities.

You can learn more about full installation, and configuration in the [official documentation](https://docs.fleetbase.io/getting-started/install).

# 🧩 Extensions 

Extensions are modular components that enhance the functionality of your Fleetbase instance. They allow you to add new features, customize existing behavior, or integrate with external systems.

You can find extensions available from the official [Fleetbase Console](https://console.fleetbase.io), here you will also be able get your registry token to install extensions to a self-hosted Fleetbase instance. 

Additionally you're able to develop and publish your own extensions as well which you can read more about developing extensions via the [extension building guide](https://docs.fleetbase.io/developers/building-an-extension).

## ⌨️ Fleetbase CLI 

The Fleetbase CLI is a powerful tool designed to simplify the management of extensions for your Fleetbase instance. With the CLI, you can effortlessly handle authentication, install and uninstall extensions, and scaffold new extensions if you are developing your own.

Get started with the CLI with npm:

```bash
npm i -g @fleetbase/cli
```

Once installed, you can access a variety of commands to manage your Fleetbase extensions.

# 📱 Apps

Fleetbase offers a few open sourced apps which are built on Fleetbase which can be cloned and customized. Every app is built so that the Fleetbase instance can be switched out whether on-premise install or cloud hosted.

<ul>
  <li><a href="https://github.com/fleetbase/storefront-app">Storefront App</a>: Fleetbase based ecommerce/on-demand app for launching your very own shop or marketplace to Apple or Android playstore.</li>
  <li><a href="https://github.com/fleetbase/navigator-app">Navigator App</a>: Fleetbase based driver app which can be used for drivers to manage and update order, additionally provides real time driver location which can be viewed in the Fleetbase Console.</li>
</ul>

## 🛣️ Roadmap
1.  **Inventory and Warehouse Management** ~ Pallet will be Fleetbase's first official extension for WMS & Inventory.
2.  **Accounting and Invoicing** ~ Ledger will be Fleetbase's first official extension accounting and invoicing.
3.  **AI** ~ AI Agent intrgation for system and workflows.
4. **Dynamic Rules System** ~ Trigger events, tasks jobs from a rule builder on resources.

## 🪲 Bugs and 💡 Feature Requests

Have a bug or a feature request? Please check the <a href="https://github.com/fleetbase/fleetbase/issues">issue tracker</a> and search for existing and closed issues. If your problem or idea is not addressed yet, please <a href="https://github.com/fleetbase/fleetbase/issues/new">open a new issue</a>.

## 📄 Documentation

Please read through our <a href="https://github.com/fleetbase/fleetbase/blob/main/CONTRIBUTING.md">contributing guidelines</a>. Included are directions for opening issues, coding standards, and notes on development.

## 👥 Community

Get updates on Fleetbase's development and chat with the project maintainers and community members by joining our <a href="https://discord.gg/V7RVWRQ2Wm">Discord</a>.

<ul>
  <li>Follow <a href="https://x.com/fleetbase_io">@fleetbase_io on X</a>.</li>
  <li>Read and subscribe to <a href="https://www.fleetbase.io/blog-2">The Official Fleetbase Blog</a>.</li>
  <li>Ask and explore <a href="https://github.com/orgs/fleetbase/discussions">our GitHub Discussions</a>.</li>
</ul>
<p dir="auto">See the <a href="https://github.com/fleetbase/fleetbase/releases">Releases</a> section of our GitHub project for changelogs for each release version of Fleetbase.</p>
<p>Release announcement posts on <a href="https://www.fleetbase.io/blog-2" rel="nofollow">the official Fleetbase blog</a> contain summaries of the most noteworthy changes made in each release.</p>

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
      <a href="https://github.com/orgs/fleetbase/people/roncodes">GitHub</a> | <a href="https://www.linkedin.com/in/ronald-a-richardson/">LinkedIn</a>
    </td>
    <td align="center" style="border: none;">
      <img src="https://user-images.githubusercontent.com/58805033/230262598-1ce6d0cc-fb65-41f9-8384-5cf5cbf369c7.png" alt="Shiv Thakker" width="120" height="120" style="border-radius: 50%;">
      <br>
      <strong>Shiv Thakker</strong>
      <br>
      Co-founder & CEO
      <br>
      <a href="https://github.com/orgs/fleetbase/people/shivthakker">GitHub</a> | <a href="https://www.linkedin.com/in/shivthakker/">LinkedIn</a>
    </td>
  </tr>
</table>


# License & Copyright

Fleetbase is available under a **dual-licensing model** to accommodate both open-source community users and commercial enterprises:

## Open Source License (AGPL-3.0)

By default, Fleetbase is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html). This license allows you to use, modify, and distribute Fleetbase freely, provided that:

- Any modifications or derivative works are also made available under AGPL-3.0
- If you run a modified version as a network service, you must make the source code available to users

The AGPL-3.0 is ideal for open-source projects, academic research, and organizations committed to sharing their improvements with the community.

## Commercial License (FCL)

For organizations that require more flexibility, Fleetbase offers a **Fleetbase Commercial License (FCL)** that provides:

- **Freedom from AGPL obligations** – Deploy and modify Fleetbase without source code disclosure requirements
- **Proprietary integrations** – Build closed-source extensions and integrations
- **Commercial protections** – Warranties, indemnities, and legal assurances not provided under AGPL
- **Derivative work ownership** – Retain full ownership of your modifications and customizations
- **Flexible licensing options** – Choose from annual, monthly, or perpetual license models

### Commercial License Options

| License Type | Price | Support & Updates | Best For |
|--------------|-------|-------------------|----------|
| **Annual License** | $25,000/year | ✅ All upgrades & Business Support included | Organizations requiring continuous updates and support |
| **Monthly License** | $2,500/month | ✅ All upgrades & Business Support included | Pilot projects and short-term deployments |
| **Major Version License** | $25,000 (one-time) | ❌ No ongoing support | Stable deployments on a single major version |
| **Minor Version License** | $15,000 (one-time) | ❌ No ongoing support | Locked version deployments |

### When You Need a Commercial License

You should consider a commercial license if you:

- Want to build proprietary extensions or integrations without open-sourcing them
- Need to embed Fleetbase in a commercial product without AGPL obligations
- Require enterprise-grade support, SLAs, and legal protections
- Plan to modify Fleetbase without sharing your changes publicly

### Get a Commercial License

For more information about commercial licensing options, please contact us:

- **Email:** [hello@fleetbase.io](mailto:hello@fleetbase.io)
- **Website:** [fleetbase.io](https://fleetbase.io)

---

**Copyright © 2026 Fleetbase Pte. Ltd.** All rights reserved.

