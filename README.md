<div id="hero">
  <p align="center" dir="auto">
      <a href="https://fleetbase.io" rel="nofollow">
        <img src="https://user-images.githubusercontent.com/58805033/191936702-fed04b0f-7966-4041-96d0-95e27bf98248.png" alt="Fleetbase logo" width="500" height="120" style="max-width: 100%;">
      </a>
    </p>
    <p align="center" dir="auto">
      Modular logistics and supply chain operating system
      <br>
      <a href="https://docs.fleetbase.io/" rel="nofollow">Documentation</a>
      ·
      <a href="https://console.fleetbase.io" rel="nofollow">Cloud Version</a>
      ·
      <a href="https://fleetbase.apichecker.com" target="_api_status" rel="nofollow">API Status</a>
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
  <img src="https://github.com/fleetbase/fleetbase/assets/816371/125348c9-c88a-49fe-b098-9abec9d7dff8" alt="Fleetbase Console" width="1200" style="max-width: 100%;" />
</p>

**Quickstart**

```bash
git clone git@github.com:fleetbase/fleetbase.git  
cd fleetbase  
docker-compose up -d  
docker exec -ti fleetbase-application-1 bash  
sh deploy.sh
```

## 📖 Table of contents

  - [Features](#-features)
  - [Install](#-install)
  - [Extensions](#-extensions)
  - [Apps](#-apps)
  - [Roadmap](#-roadmap)
  - [Bugs and Feature Requests](#-bugs-and--feature-requests)
  - [Documentation](#-documentation)
  - [Contributing](#-contributing)
  - [Community](#-community)
  - [Creators](#-creators)
  - [License & Copyright](#-license-and-copyright)

## 📦 Features
- **Extensible:** Build installable extensions and additional functionality directly into the OS via modular architecture.
- **Developer Friendly:** RESTful API, socket, and webhooks to seamlessly integrate with external systems or develop custom applications.
- **Native Apps:** Collection of open-source and native apps designed for operations and customer facing.
- **Collaboration:** Dedicated chat and comments system for collaboration across your organization.
- **Security:** Secure data encryption, adherence to industry-standard security practices, and a comprehensive dynamic Identity and Access Management (IAM) system.  
- **Telematics:** Integrate and connect to hardware devices and sensors to provide more feedback and visibility into operations.
- **Internationalized:** Translate into multiple languages to accommodate diverse user bases and global operations.
- **Framework:** PHP core built around logistics and supply chain abstractions to streamline extension development.
- **Dynamic:** Configurable rules, flows and logic to enable automation and customization.
- **UI/UX:** Clean, responsive user-friendly interface for efficient management and operations from desktop or mobile.
- **Dashboards:** Create custom dashboards and widgets to get full visibility into operations.  
- **Scalability:** Uninterrupted growth with scalable infrastructure and design, capable of handling increasing data volume and user demand as your business expands.
- **Continuous Improvements:** Commitment to continuous improvement, providing regular updates that seamlessly introduce optimizations, new features, and overall enhancements to the OS.
- **Open Source:** Deploy it either on-premise or in the cloud according to your organization's needs and preferences.

## 💾 Install
Getting up and running with Fleetbase via Docker is the quickest and most straightforward way. If you’d like to use Fleetbase without docker read the [full install guide in the Fleetbase documentation](https://docs.fleetbase.io/getting-started/install).  
  
Make sure you have both the latest versions of docker and docker-compose installed on your system.

```bash
git clone git@github.com:fleetbase/fleetbase.git  
cd fleetbase  
docker-compose up -d  
docker exec -ti fleetbase-application-1 bash  
sh deploy.sh
```

### Accessing Fleetbase
Once successfully installed and running you can then access the Fleetbase console on port 4200 and the API will be accessible from port 8000.  
  
Fleetbase Console: http://localhost:4200
Fleetbase API: http://localhost:8000

### Additional Configurations

**CORS:** If you’re installing directly on a server you may need to add your IP address or domain to the `api/config/cors.php` file in the `allowed_hosts` array.  
  
**Routing:** Fleetbase ships with a default OSRM server hosted by `[router.project-osrm.org](https://router.project-osrm.org)` but you’re able to use your own or any other OSRM compatible server. You can modify this in the `console/environments` directory by modifying the .env file of the environment you’re deploying and setting the `OSRM_HOST` to the OSRM server for Fleetbase to use.  
  
**Services:** There are a few environment variables which need to be set for Fleetbase to function with full features. If you’re deploying with docker then it’s easiest to just create a `docker-compose.override.yml` and supply the environment variables in this file.

```yaml
version: “3.8”
services:  
  application:  
    environment:  
      MAIL_MAILER: (ses, smtp, mailgun, postmark, sendgrid)
      OSRM_HOST: https://router.project-osrm.org
      IPINFO_API_KEY:
      GOOGLE_MAPS_API_KEY:  
      GOOGLE_MAPS_LOCALE: us
      TWILIO_SID:  
      TWILIO_TOKEN:
      TWILIO_FROM:
      CONSOLE_HOST: http://localhost:4200
```

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
1.  **Inventory and Warehouse Management** ~ Pallet will be Fleetbase’s first official extension for WMS & Inventory.
2.  **Accounting and Invoicing** ~ Ledger will be Fleetbase’s first official extension accounting and invoicing.
3.  **Binary Builds** ~ Run Fleetbase from a single binary.
4.  **Fleetbase for Desktop** ~ Desktop builds for OSX and Windows.
5. **Custom Maps and Routing Engines** ~ Feature to enable easy integrations with custom maps and routing engines like Google Maps or Mapbox etc…

## 🪲 Bugs and 💡 Feature Requests

Have a bug or a feature request? Please check the <a href="https://github.com/fleetbase/fleetbase/issues">issue tracker</a> and search for existing and closed issues. If your problem or idea is not addressed yet, please <a href="https://github.com/fleetbase/fleetbase/issues/new">open a new issue</a>.

## 👨‍💻 Contributing

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

<p dir="auto"><strong>Ronald A. Richardson</strong>- Co-founder &amp; CTO</p>
<img src="https://user-images.githubusercontent.com/58805033/230263021-212f2553-1269-473d-be94-313cb3eecfa5.png" alt="Ron Image" width="75" height="75" style="max-width: 100%;">          
<p><a href="https://github.com/orgs/fleetbase/people/roncodes">Github</a> | <a href="https://www.linkedin.com/in/ronald-a-richardson/">LinkedIn</a></p>
                   
<p dir="auto"><strong>Shiv Thakker</strong> - Co-founder &amp; CEO</p>
<img src="https://user-images.githubusercontent.com/58805033/230262598-1ce6d0cc-fb65-41f9-8384-5cf5cbf369c7.png" alt="Shiv Image" width="75" height="75" style="max-width: 100%;">  
<p><a href="https://github.com/orgs/fleetbase/people/shivthakker">Github</a> | <a href="https://www.linkedin.com/in/shivthakker/">LinkedIn</a></p>


# License & Copyright

Fleetbase is made available under the terms of the <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank">GNU Affero General Public License 3.0 (AGPL 3.0)</a>. For other licenses <a href="mailto:hello@fleetbase.io" target="_blank">contact us</a>.
