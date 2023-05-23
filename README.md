<div id="hero">
  <p align="center" dir="auto">
      <a href="https://fleetbase.io" rel="nofollow">
        <img src="https://user-images.githubusercontent.com/58805033/191936702-fed04b0f-7966-4041-96d0-95e27bf98248.png" alt="Fleetbase logo" width="600" height="140" style="max-width: 100%;">
      </a>
    </p>
    <p align="center" dir="auto">
      Open Source Logistics & Supply Chain Platform and Infrastructure
      <br>
      <a href="https://docs.fleetbase.dev/api" rel="nofollow">Fleetbase Documentation →</a>
      <br>
      <br>
      <a href="https://github.com/fleetbase/fleetbase/issues">Report an Issue</a>
      ·
      <a href="https://fleetbase.dev/api">API Reference</a>
      ·
      <a href="https://github.com/fleetbase/guides">Guides</a>
      ·
      <a href="https://github.com/fleetbase/fleetbase/issues">Request a Feature</a>
      ·
      <a href="https://www.fleetbase.io/blog-2" rel="nofollow">Blog</a>
    </p>
    <hr />
</div>

# ⭐️ Overview

Fleetbase is a comprehensive, open-source platform for the management and orchestration of logistics and supply chain operations. This dual-natured platform serves not only as an efficient operational tool for companies within these industries but also as a robust foundational layer for developers. Its versatility emanates from its core, which is skillfully constructed around a series of "extensions," creating a flexible and customizable framework that accommodates a wide spectrum of supply chain and logistics requirements.

Every individual extension within Fleetbase is purposefully engineered to fulfill specific roles within the expansive ecosystem of supply chain and logistics. With inherent extensibility users have the freedom to craft their own extensions, thereby expanding the ecosystem and ensuring the platform's adaptability across a multitude of use cases. This extensible nature ensures that Fleetbase remains at the forefront of meeting diverse logistical and supply chain needs now and into the future.

<p align="center" dir="auto">
      <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/github/dark-light-layered-screenshots.png" alt="Fleetbase Console" width="600" style="max-width: 100%;" />
    </p>

# 📖 Table of contents

  - [What's Included](#-whats-included)
  - [Getting Started](#-getting-started)
  - [Use Cases](#-use-cases)
  - [Installation](#-installation)
  - [Extensions](#-extensions)
  - [Apps](#-apps)
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
    <strong>Console</strong>: Fleetbase's frontend console is constructed using Ember.js and Ember Engines, providing a highly modular and extensible design. This not only enables the system to adapt and scale to your growing requirements but also simplifies the process of integrating new extensions. With the console's design, extensions can be easily installed using their respective package managers, thereby reducing complexity and time spent on integration.
  </li>
  <li>
    <strong>Fleetbase API</strong>: Fleetbase's backend API and framework, developed using the reliable Laravel framework, is thoughtfully designed with extension development and integration in mind. This robust and flexible infrastructure not only manages intricate data structures and transactions with grace but also facilitates the easy incorporation of new extensions via package managers. We provide additional packages that allow developers to craft their unique extensions, further enhancing the flexibility and extensibility of the Fleetbase ecosystem.
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
    <pre>bash git clone https://github.com/fleetbase/fleetbase.git</pre>
  </li>
  <li>
    Navigate to the cloned repository:
    <pre>cd fleetbase</pre>
  </li>
</ul>

### Build and Run Fleetbase

<ol>
  <li>
    <strong>Start the Docker daemon:</strong>
    Ensure the Docker daemon is running on your machine. You can either start Docker Desktop or either executed by running:
    <pre>sudo systemctl start docker</pre>
  </li>
  <li>
    <strong>Build the Docker containers:</strong>
Use Docker Compose to build and run the necessary containers. In the root directory of the Fleetbase repository, run:
  <pre>docker-compose up -d</pre>
  </li>
</ol>

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
  <li><strong>Backend</strong>: The backend of an extension is developed as a PHP package. This package should utilize the composer package `fleetbase/core-api`, which provides core API functionalities, making it easier to integrate your extension with Fleetbase's backend.</li>
  
  <li><strong>Engine</strong>: The frontend of an extension is built as an Ember Engine Addon. The Addon must require the packages `@fleetbase/ember-core` and `@fleetbase/ember-ui`. The `@fleetbase/ember-core` package provides core services and utilities that help to align your extension with Fleetbase's frontend. The `@fleetbase/ember-ui` package, on the other hand, supplies all the stylesheets, components, and template helpers needed to design a Fleetbase extension that seamlessly matches the look and feel of the Fleetbase UI.</li>
</ul>

### Building a Fleetbase Extension
To create a Fleetbase extension, follow these steps:

<ul>
  <li><strong>Backend PHP Package Creation</strong>: Begin by creating a backend PHP package. Make sure to use the composer package `fleetbase/core-api` to ensure smooth integration with Fleetbase's backend.</li>
  
  <li><strong>Frontend Ember Engine Addon</strong>: Next, you need to create the frontend of the extension using Ember Engine. Be sure to include the `@fleetbase/ember-core` and `@fleetbase/ember-ui` packages. These packages provide necessary services, utilities, and design components for aligning your extension with Fleetbase's UI.</li>

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
  <li>Install Flow & System Configuration from Console</li>
  <li>Open Source Extension Repository</li>
  <li>Inventory and Warehouse Management Extension</li>
  <li>Freight Forwarder Quote Parser/ System Extension</li>
</ol>

# 🪲 Bugs and 💡 Feature Requests

Have a bug or a feature request? Please check the <a href="https://github.com/fleetbase/fleetbase/issues">issue tracker</a> and search for existing and closed issues. If your problem or idea is not addressed yet, please <a href="https://github.com/fleetbase/fleetbase/issues/new">open a new issue</a>.

# 📚 Documentation

View and contribute to our <a href="https://github.com/fleetbase/guides">Fleetbase Guide's</a> and <a href="https://github.com/fleetbase/api-reference">API Reference</a>

# 👨‍💻 Contributing

Please read through our <a href="https://github.com/fleetbase/fleetbase/blob/main/.github/CONTRIBUTING.md">contributing guidelines</a>. Included are directions for opening issues, coding standards, and notes on development.

# 👥 Community

Get updates on Fleetbase's development and chat with the project maintainers and community members.

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
