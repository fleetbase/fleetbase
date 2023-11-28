<div id="hero">
  <p align="center" dir="auto">
      <a href="https://fleetbase.io" rel="nofollow">
        <img src="https://user-images.githubusercontent.com/58805033/191936702-fed04b0f-7966-4041-96d0-95e27bf98248.png" alt="Fleetbase logo" width="600" height="140" style="max-width: 100%;">
      </a>
    </p>
    <p align="center" dir="auto">
      Open Source Modular Logistics Platform
      <br>
      <a href="https://fleetbase.github.io/guides" rel="nofollow">Fleetbase Documentation →</a>
      <br>
      <br>
      <a href="https://meetings.hubspot.com/shiv-thakker" rel="nofollow">Book a Demo</a>
      <br>
      <br>
      <a href="https://github.com/fleetbase/fleetbase/issues">Report an Issue</a>
      ·
      <a href="https://fleetbase.github.io/api-reference">API Reference</a>
      ·
      <a href="https://fleetbase.github.io/guides">Guides</a>
      ·
      <a href="https://github.com/fleetbase/fleetbase/issues">Request a Feature</a>
      ·
      <a href="https://www.fleetbase.io/blog-2" rel="nofollow">Blog</a>
      ·
      <a href="https://fleetbase.apichecker.com" target="_api_status" rel="nofollow">API Status</a>
      ·
      <a href="https://discord.gg/V7RVWRQ2Wm" target="discord" rel="nofollow">Discord</a>
    </p>
    <hr />
</div>

# ⭐️ Overview

Fleetbase is an open-source modular platform designed for the efficient management and orchestration of logistics operations. It serves as both a powerful operational tool for businesses and a flexible foundation for developers. The platform's core is built around a collection of "extensions," which create a customizable framework capable of meeting a wide range of supply chain and logistics requirements.

Each extension in Fleetbase is purposefully engineered to fulfill specific roles within the logistics ecosystem. Users have the freedom to create their own extensions, expanding the platform's ecosystem and ensuring its adaptability to various use cases. This extensible nature keeps Fleetbase at the forefront of addressing diverse logistical and supply chain needs now and in the future.

<p align="center" dir="auto">
  <img src="https://github.com/fleetbase/fleetbase/assets/816371/deef79fa-e30c-4ce9-8a04-0dee990ffd9d" alt="Fleetbase Console" width="600" style="max-width: 100%;" />
</p>

<div align="center">
  <a href="https://www.producthunt.com/posts/fleetbase-alpha" target="_producthunt">🚀 We've just announced our Alpha release on Product Hunt! 🚀</a>
  <p>Check Fleetbase out on ProductHunt, and support with a Upvote!</p>
  <a href="https://www.producthunt.com/posts/fleetbase-alpha?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-fleetbase&#0045;alpha" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=399731&theme=light" alt="Fleetbase&#0032;&#0040;Alpha&#0041; - The&#0032;open&#0032;source&#0032;OnFleet&#0032;alternative | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
</div>
  

# 📖 Table of contents

  - [What's Included](#-whats-included)
  - [Getting Started](#-getting-started)
  - [Use Cases](#-use-cases)
  - [Installation](#-installation)
  - [Extensions](#-extensions)
  - [Apps](#-apps)
  - [Roadmap](#-roadmap)
  - [Bugs and Feature Requests](#-bugs-and--feature-requests)
  - [Documentation](#-documentation)
  - [Contributing](#-contributing)
  - [Community](#-community)
  - [Creators](#-creators)
  - [License & Copyright](#-license-and-copyright)

# 📦 What's Included

Fleetbase is more than just a platform; it's a versatile ecosystem carefully architected to empower developers and businesses alike. Fleetbase comes pre-installed with a few extensions that provide base functionality to get users and businesses started:

<ul>
  <li>
    <strong>Console</strong>: Fleetbase's frontend console is built with Ember.js and Ember Engines, offering a modular and extensible design. This design allows the system to easily adapt and scale according to your evolving needs while simplifying the integration of new extensions. By leveraging the console's design, extensions can be seamlessly installed using their respective package managers, reducing complexity and integration time.
  </li>
  <li>
    <strong>Fleetbase API</strong>: Fleetbase's backend API and framework are built with Laravel, providing a robust and flexible infrastructure for extension development and integration. The system efficiently manages complex data structures and transactions while seamlessly incorporating new extensions through package managers. We offer additional packages for developers to create custom extensions, enhancing the flexibility and extensibility of the Fleetbase ecosystem.
  </li>
  <li>
    <strong>Extensions</strong>: Fleetbase is designed to provide immediate utility out-of-the-box. It comes pre-installed with several key extensions
    <ul>
      <li><strong>FleetOps</strong>: FleetOps, our comprehensive fleet management extension, caters to all aspects of last-mile operations. Some of it's features include:
        <ul>
          <li>
            Real-time tracking for vehicles and assets, ensuring optimal operational efficiency.
          </li>
          <li>
            Order creation and management, facilitating seamless transaction processing.
            Service rates management, helping maintain financial transparency and profitability.
          </li>
          <li>
            Fleet management, providing a holistic view and control of your fleet.
          </li>
          <li>
            Third-party vendor integrations, allowing you to consolidate your resources.
          </li>
          <li>
            API & Webhooks that not only offer increased interconnectivity but also serve to facilitate integrations with other services and applications, making FleetOps a truly versatile solution.
          </li>
        </ul>
      </li>
      <li>
        <strong>Storefront</strong>: Storefront is an extension that delivers headless commerce functionality, ideal for businesses aspiring to develop on-demand stores or marketplaces. It aims to facilitate seamless transactions while focusing on providing an excellent user experience.
      </li>
      <li><strong>Dev Console</strong>: The Dev Console extension is a developer's toolbox, providing resources such as:
        <ul>
          <li>
            API keys management, ensuring secure interactions with the application programming interface.
          </li>
          <li>
            Webhooks management, enabling real-time data exchanges.
          </li>
          <li>
            Sockets management, facilitating bi-directional client-server communication.
          </li>
          <li>
            Logs management, crucial for system monitoring and troubleshooting.
          </li>
          <li>
            API events management, keeping a pulse on system communications.
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>

# 🏁 Getting Started

Before you can get started with Fleetbase, you'll need to make sure you have the following prerequisites:

<ol>
  <li>
    A computer running either Linux, Mac OS, or Windows
  </li>
  <li>Docker installed</li>
  <li>Git installed</li>
  <li>If you want to try now, the <a href="https://console.fleetbase.io/" target="_fleetbase" alt="Fleetbase">cloud hosted version of Fleetbase available here.</a></li>
</ol>

# 🚦 Use Cases

Fleetbase's comprehensive suite of features and the modular design make it highly versatile, catering to a broad array of applications across different industries. Here are a few use cases:
<ul>
  <li><strong>Logistics and Supply Chain Management</strong>: Fleetbase could be employed by a logistics company to streamline its operations. Real-time tracking provided by FleetOps would help maintain visibility of fleet vehicles and assets at all times. This would ensure timely delivery, reduce operational inefficiencies, and enable proactive management of any logistical issues. Additionally, the order creation and management feature could be used to manage deliveries, pickups, and routing.</li>
  
  <li><strong>On-demand Delivery Services</strong>: On-demand services like food delivery or courier companies could utilize Fleetbase to manage their fleet of delivery agents. The real-time tracking functionality would help to optimize routes and ensure prompt deliveries, while the order creation and management system would efficiently handle incoming orders.</li>
  
  <li><strong>E-Commerce Platforms</strong>: E-commerce businesses could leverage Fleetbase to manage their backend logistics. The Storefront extension would enable seamless online transactions, while FleetOps could manage all aspects of the delivery process, ensuring a smooth shopping experience for the customers.</li>
  
  <li><strong>Ride-Hailing Services</strong>: Fleetbase could be a perfect fit for ride-hailing or car rental services. FleetOps would manage real-time tracking of vehicles, maintaining optimal vehicle utilization, while the API and Webhooks would facilitate integration with mobile apps to provide real-time updates to customers.</li>
  
  <li><strong>Third-party Logistics (3PL) Provider</strong>: A 3PL provider could use Fleetbase for comprehensive management of its services. From real-time tracking of cargo to managing service rates and integration with other vendors in the supply chain, Fleetbase could provide an all-in-one solution.</li>
  
  <li><strong>Developer Resource Management</strong>: Developers building complex, resource-intensive applications could benefit from Fleetbase's Dev Console. API keys and webhook management could streamline the secure interaction between different software components. At the same time, sockets, logs, and API events management tools would assist in maintaining, troubleshooting, and improving the system.</li>

  <li><strong>Public Transportation Systems</strong>: City transportation services could use Fleetbase to optimize their bus or subway operations. With FleetOps, they could have real-time tracking of their vehicles, ensuring that schedules are met promptly and delays are handled effectively. Moreover, service rates management could assist in setting and adjusting fares, while the API and Webhooks functionality could integrate with public apps to provide real-time updates to commuters about arrivals, delays, and route changes.</li>

  <li><strong>Fleet Leasing Companies</strong>: Fleet leasing companies could employ Fleetbase to manage their vehicle assets and track their status in real time. From managing service rates to ensuring the best utilization of assets, FleetOps could provide a holistic solution. Moreover, the Storefront extension could be used to list available vehicles and manage online reservations seamlessly.</li>

  <li><strong>Emergency Services</strong>: Emergency services like ambulance or firefighting departments could use Fleetbase to manage their operations. FleetOps would provide real-time tracking, ensuring that emergency vehicles are dispatched quickly and the fastest routes are chosen. In addition, the API and Webhooks functionality could allow integration with emergency call centers, ensuring a seamless flow of information and a swift response to emergencies.</li>
</ul>

Remember, these are just a few examples. Given the modular and extensible nature of Fleetbase, it can be customized and scaled to fit many other use cases across different industries.

# 💾 Installation

Getting Fleetbase up and running on your system using Docker and Docker-compose is straightforward. Please follow the steps below:

### Prerequisites

<ul>
  <li>Ensure that you have Docker and Docker-compose installed on your system. If not, you can download and install them from their respective official websites:
    <ul>
      <li><a href="https://docs.docker.com/get-docker/" target="_docker">Docker</a></li>
      <li><a href="https://docs.docker.com/compose/install/" target="_docker_compose">Docker Compose</a></li>
    </ul>
  </li>
  <li>
    Clone the Fleetbase repository to your local machine:
    <pre>git clone git@github.com:fleetbase/fleetbase.git</pre>
  </li>
  <li>
    Navigate to the cloned repository:
    <pre>cd fleetbase</pre>
  </li>
  <li>
    Initialize and pull submodules:
    <pre>git submodule update --init --recursive</pre>
  </li>
</ul>

### Build and Run Fleetbase

<ol>
  <li>
    <strong>Start the Docker daemon:</strong>
    Ensure the Docker daemon is running on your machine. You can either start Docker Desktop or either executed by running:
    <pre>service docker start</pre>
  </li>
  <li>
    <strong>Build the Docker containers:</strong>
Use Docker Compose to build and run the necessary containers. In the root directory of the Fleetbase repository, run:
  <pre>docker-compose up -d</pre>
  </li>
</ol>

### Additional Steps

<ol>
   <li>Fleetbase will try to find the current hostname or public IP address to whitelist in for CORS, but if this fails you will need to manually add your hostname or instance URL to <code>api/config/cors.php</code> in the <code>allowed_origins</code> array. This will whitelist the console for CORS access to your instance backend.
  </li>
  <li>🛣 Routing! By default Fleetbase currently will use it's own routing engine which is hosted at <a href="https://routing.fleetbase.io" target="_fleetbase_routing_machine">https://routing.fleetbase.io</a>, this routing engine only works for a few enabled countries which include USA, Canada, Belgium, Spain, Serbia, Taiwan, Malaysia, Singapore, Brunei, Mongolia, India, Ghana. We can enable more regions and countries upon request. There is a Roadmap item to allow users to easily change to any routing engine provider such as Mapbox, Google Maps, and other 3rd Party Routing services. Optionally, you can switch out Fleetase Routing engine with any OSRM compatible service such as OpenStreetMap by changing the console environment variable <code>OSRM_HOST</code> which can be found in <code>console/environments/*.env</code>.
  </li>
  <li>If you find any bugs or unexpected issues please <a href="https://github.com/fleetbase/fleetbase/issues/new/choose">post an issue</a> to the repo or join our <a href="https://discord.gg/V7RVWRQ2Wm" target="_discord" alt="Fleetbase Discord">Discord</a>.
  </li>
</ol>

### Troubleshoot

Have an issue with the installation, try a few of these workarounds.

<ul>
  <li><strong>Installer not working?</strong> <br>If you encounter issues with the web based installer use this workaround to get going.
  <ol>
    <li>Login to the application container. 
      <pre class="bash">docker exec -ti fleetbase-application-1 bash</pre>
    </li>
    <li>Manually run the database setup and migrations.
      <pre class="bash">php artisan mysql:createdb
php artisan migrate:refresh --seed</pre>
      </li>
    <li>After completing these steps you should be able to proceed with account creation.</li>
  </ol>
  </li>
</ul>

### Access Fleetbase

Now that Fleetbase is up and running via Docker you can find the console and the API accessible:

<ul>
  <li>Fleetbase Console: <code>http://localhost:4200</code></li>
  <li>Fleetbase API: <code>http://localhost:8000</code></li>
</ul>

# 🧩 Extensions

Fleetbase extensions provide a powerful way to enhance and customize the functionality of Fleetbase to suit your specific needs. They are standalone modules that seamlessly integrate with Fleetbase's frontend and backend, allowing you to extend its capabilities.

### What are Fleetbase Extensions?
Fleetbase Extensions are built using both a backend PHP package and a frontend Ember Engine Addon. They are designed to blend seamlessly into the Fleetbase ecosystem, utilizing shared services, utilities, stylesheets, components, and template helpers.

### How do Extensions Work?
<ul>
  <li><strong>Backend</strong>: The backend of an extension is developed as a PHP package. This package should utilize the composer package <code>fleetbase/core-api</code>, which provides core API functionalities, making it easier to integrate your extension with Fleetbase's backend.</li>
  
  <li><strong>Engine</strong>: The frontend of an extension is built as an Ember Engine Addon. The Addon must require the packages <code>@fleetbase/ember-core</code> and <code>@fleetbase/ember-ui</code>. The <code>@fleetbase/ember-core</code> package provides core services and utilities that help to align your extension with Fleetbase's frontend. The <code>@fleetbase/ember-ui</code> package, on the other hand, supplies all the stylesheets, components, and template helpers needed to design a Fleetbase extension that seamlessly matches the look and feel of the Fleetbase UI.</li>
</ul>

### Building a Fleetbase Extension
To create a Fleetbase extension, follow these steps:

<ul>
  <li><strong>Backend PHP Package Creation</strong>: Begin by creating a backend PHP package. Make sure to use the composer package <code>fleetbase/core-api</code> to ensure smooth integration with Fleetbase's backend.</li>
  
  <li><strong>Frontend Ember Engine Addon</strong>: Next, you need to create the frontend of the extension using Ember Engine. Be sure to include the <code>@fleetbase/ember-core</code> and <code>@fleetbase/ember-ui</code> packages. These packages provide necessary services, utilities, and design components for aligning your extension with Fleetbase's UI.</li>

  <li><strong>Integrate Your Extension</strong>: Once you have the backend and frontend ready, you can integrate your extension into Fleetbase by installing it via the respective package managers. In the future you will be able to publish your extension to the Fleetbase extensions repository making it available to all instances of Fleetbase with the ability to even sell your extension.</li>
</ul>

With Fleetbase's modular architecture, you can develop your extensions to solve unique problems, enhance existing functionality, or add entirely new capabilities to your Fleetbase instance. This extensibility allows Fleetbase to adapt and evolve with your growing business needs.

# 📱 Apps

Fleetbase offers a few open sourced apps which are built on Fleetbase which can be cloned and customized. Every app is built so that the Fleetbase instance can be switched out whether on-premise install or cloud hosted.

<ul>
  <li><a href="https://github.com/fleetbase/storefront-app">Storefront App</a>: Fleetbase based ecommerce/on-demand app for launching your very own shop or marketplace to Apple or Android playstore.</li>
  <li><a href="https://github.com/fleetbase/navigator-app">Navigator App</a>: Fleetbase based driver app which can be used for drivers to manage and update order, additionally provides real time driver location which can be viewed in the Fleetbase Console.</li>
</ul>

# 🛣 Roadmap

<ol>
  <li>Open Source Extension Repository</li>
  <li>🌎 Internationalize</li>
  <li>Multiple and Custom Routing Engine's in FleetOps</li>
  <li>Identity & Access Management (IAM) Extension</li>
  <li>Inventory and Warehouse Management Extension</li>
  <li>Freight Forwarder Quote Parser/ System Extension</li>
</ol>

# 🪲 Bugs and 💡 Feature Requests

Have a bug or a feature request? Please check the <a href="https://github.com/fleetbase/fleetbase/issues">issue tracker</a> and search for existing and closed issues. If your problem or idea is not addressed yet, please <a href="https://github.com/fleetbase/fleetbase/issues/new">open a new issue</a>.

# 📚 Documentation

View and contribute to our <a href="https://github.com/fleetbase/guides">Fleetbase Guide's</a> and <a href="https://github.com/fleetbase/api-reference">API Reference</a>

# 👨‍💻 Contributing

Please read through our <a href="https://github.com/fleetbase/fleetbase/blob/main/CONTRIBUTING.md">contributing guidelines</a>. Included are directions for opening issues, coding standards, and notes on development.

# 👥 Community

Get updates on Fleetbase's development and chat with the project maintainers and community members by joining our <a href="https://discord.gg/V7RVWRQ2Wm">Discord</a>.

<ul>
  <li>Follow <a href="https://twitter.com/fleetbase_io">@fleetbase_io on Twitter</a>.</li>
  <li>Read and subscribe to <a href="https://www.fleetbase.io/blog-2">The Official Fleetbase Blog</a>.</li>
  <li>Ask and explore <a href="https://github.com/orgs/fleetbase/discussions">our GitHub Discussions</a>.</li>
</ul>
<p dir="auto">See the <a href="https://github.com/fleetbase/fleetbase/releases">Releases</a> section of our GitHub project for changelogs for each release version of Fleetbase.</p>
<p>Release announcement posts on <a href="https://www.fleetbase.io/blog-2" rel="nofollow">the official Fleetbase blog</a> contain summaries of the most noteworthy changes made in each release.</p>

# Creators

<p dir="auto"><strong>Ronald A. Richardson</strong>- Co-founder &amp; CTO</p>
<img src="https://user-images.githubusercontent.com/58805033/230263021-212f2553-1269-473d-be94-313cb3eecfa5.png" alt="Ron Image" width="75" height="75" style="max-width: 100%;">          
<p><a href="https://github.com/orgs/fleetbase/people/roncodes">Github</a> | <a href="https://www.linkedin.com/in/ronald-a-richardson/">LinkedIn</a></p>
                   
<p dir="auto"><strong>Shiv Thakker</strong> - Co-founder &amp; CEO</p>
<img src="https://user-images.githubusercontent.com/58805033/230262598-1ce6d0cc-fb65-41f9-8384-5cf5cbf369c7.png" alt="Shiv Image" width="75" height="75" style="max-width: 100%;">  
<p><a href="https://github.com/orgs/fleetbase/people/shivthakker">Github</a> | <a href="https://www.linkedin.com/in/shivthakker/">LinkedIn</a></p>


# License & Copyright

Code and documentation copyright 2018–2023 the <a href="https://github.com/fleetbase/fleetbase/graphs/contributors">Fleetbase Authors</a>. Code released under the <a href="https://github.com/fleetbase/storefront-app/blob/main/LICENSE.md">MIT License</a>.
