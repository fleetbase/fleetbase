<div id="readme" class="Box-body readme blob js-code-block-container p-5 p-xl-6 gist-border-0">
    <article class="markdown-body entry-content container-lg" itemprop="text"><p align="center" dir="auto">
  <a href="https://fleetbase.io" rel="nofollow">
    <img src="https://user-images.githubusercontent.com/58805033/191936702-fed04b0f-7966-4041-96d0-95e27bf98248.png" alt="Fleetbase logo" width="600" height="165" style="max-width: 100%;">
  </a>
</p>
<p align="center" dir="auto">
  Open source logistics infrastructure for developers
  <br>
  <a href="https://docs.fleetbase.dev/api" rel="nofollow"><strong>Explore Fleetbase docs »</strong></a>
  <br>
  <br>
  <a href="https://github.com/fleetbase/fleetbase/issues">Report bug</a>
  ·
  <a href="https://github.com/fleetbase/fleetbase/issues">Request feature</a>
  ·
  <a href="https://www.fleetbase.io/blog-2" rel="nofollow">Blog</a>
</p>
        
<h2 dir="auto"><a id="user-content-bootstrap-5" class="anchor" aria-hidden="true" href="#bootstrap-5"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd""></path></svg></a>⭐ Overview</h2>
<p dir="auto">Open-source logistics infrastructure, Fleetbase was built for logistics companies and developers to help implement end to end logistics systems whilst preventing long development time and high costs. Build and scale your logistics technology stack without having to start from scratch. Fleetbase allows you to have full control with an end to end logistics platform straight out of the box.</p>
    
<h2 dir="auto"><a id="user-content-table-of-contents" class="anchor" aria-hidden="true" href="#table-of-contents"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd"></path></svg></a>📖 Table of contents</h2>
<ul dir="auto">
    <li><a href="#whats-included">What's included</a></li>
    <li><a href="#getting-started">Getting started</a></li>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#status">Status</a></li>
    <li><a href="#bugs-and-feature-requests">Bugs and feature requests</a></li>
    <li><a href="#documentation">Documentation</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#community">Community</a></li>
    <li><a href="#need-help">Need Help?</a></li>
    <li><a href="#copyright-and-license">Copyright and license</a></li>
</ul>
    
<h2 dir="auto"><a id="user-content-whats-included" class="anchor" aria-hidden="true" href="#whats-included"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd"></path></svg></a>🤩 What's included</h2>      
<ul>
  <li>🚚 <strong>FleetOps</strong> (Open Source TMS) - End to end transport management system for logistics operations management and overview.</li>
  <li>🏪 Storefront (Open Source App) - Customer  app, multi vendor, multi location. Ideal for any last mile delivery or on demand service.</li>
  <li>💻 Operations (Open Source Console) - Full console to manage all of your packages and custom systems.</li>
  <li>👩‍💻 Developer API & Console - Developer console which provides API usage metrics, event and request logs</li>
  <li>📱 Driver App (Open Source Integrated Driver App - Integrated to TMS. Drivers can manage jobs, tracking and electronic POD.</li>
  <li>⚙️ Extensions - Build additional features and extensions right into the console. Offer extensions back to the community. </li>
</ul>     
      
<h2 dir="auto"><a id="user-content-getting-started" class="anchor" aria-hidden="true" href="#getting-started"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" ></path></svg></a>💨 Getting Started</h2>
<p dir="auto">Before you can get started with Fleetbase, you'll need to make sure you have the following prerequisites:</p>
<ul dir="auto">
<li>A computer running Linux or macOS</li>
<li>A Docker installed</li>
<li>Git installed </li>
<li>Want to try our <a href="https://console.fleetbase.io/onboard">cloud hosted version of Fleetbase?</a?</li>
</ul>
    
<h2 dir="auto"><a id="installation" class="anchor" aria-hidden="true" href="#installation"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" ></path></svg></a>💻 Installation</h2>
<p dir="auto">To install Fleetbase on your computer, follow these steps:</p>
<ol dir="auto">
    <li>Clone the Fleetbase repository using Git:<pre><code>git clone https://github.com/fleetbase/fleetbase.git</code></pre></li>
    <li>Navigate to the Fleetbase directory:<pre><code>cd fleetbase</code></pre></li>
    <li>Install the necessary dependencies using either npm or Yarn:
        <ol dir="auto">
             <li>If you're using npm, run the following command:<pre><code>npm install</code></pre></li>
             <li>If you're using Yarn, run the following command:<pre><code>yarn install</code></pre></li>
        </ol>
    </li>
    <li>Start the Fleetbase Docker containers:<pre><code>docker-compose up -d</code></pre></li>
    <li>Launch the Fleetbase Console
        <ol dir="auto">
             <li>Navigate to the console directory:<pre><code>cd console</code></pre></li>
             <li>Launch the console <pre><code>yarn start</code></pre></li>
        </ol>
    </li>
</ol>
      
      
<h2 dir="auto"><a id="user-content-status" class="anchor" aria-hidden="true" href="#status"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" ></path></svg></a>📈 Status</h2>
<p dir="auto"><a href="https://github.com/twbs/bootstrap/actions?query=workflow%3AJS+Tests+branch%3Amain"><img src="https://camo.githubusercontent.com/ff56eb05c4a67223422b1919742a73257486ace608094af52f83cf4f7549bc03/68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f616374696f6e732f776f726b666c6f772f7374617475732f747762732f626f6f7473747261702f6a732e796d6c3f6272616e63683d6d61696e266c6162656c3d4a532532305465737473266c6f676f3d676974687562" alt="Build Status" data-canonical-src="https://img.shields.io/github/actions/workflow/status/twbs/bootstrap/js.yml?branch=main&amp;label=JS%20Tests&amp;logo=github" style="max-width: 100%;"></a>
<a href="https://www.npmjs.com/package/bootstrap" rel="nofollow"><img src="https://camo.githubusercontent.com/d3a5a8943d3de2344e708346ef67736d10597fe292b63d679080939407597d05/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f762f626f6f7473747261703f6c6f676f3d6e706d266c6f676f436f6c6f723d666666" alt="npm version" data-canonical-src="https://img.shields.io/npm/v/bootstrap?logo=npm&amp;logoColor=fff" style="max-width: 100%;"></a>
  
<h2 dir="auto"><a id="user-content-bugs-and-feature-requests" class="anchor" aria-hidden="true" href="#bugs-and-feature-requests"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd"></path></svg></a>🙋‍♂️ Bugs and feature requests</h2>
<p dir="auto">Have a bug or a feature request? Please check the <a href="https://github.com/fleetbase/fleetbase/issues">issue tracker</a> and search for existing and closed issues. If your problem or idea is not addressed yet, <a href="https://github.com/fleetbase/fleetbase/issues/new">please open a new issue</a>.
</p>      
      
<h2 dir="auto"><a id="user-content-documentation" class="anchor" aria-hidden="true" href="#documentation"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" ></path></svg></a>📚 Documentation</h2>
<p dir="auto">View and contribue to our <a href="https://github.com/fleetbase/guides">System Guides</a> and <a href="https://github.com/fleetbase/api-reference">API Reference</a>.

<h2 dir="auto"><a id="user-content-contributing" class="anchor" aria-hidden="true" href="#contributing"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" ></path></svg></a>👨‍💻 Contributing</h2>
<p dir="auto">Please read through our <a href="https://github.com/twbs/bootstrap/blob/main/.github/CONTRIBUTING.md">contributing guidelines</a>. Included are directions for opening issues, coding standards, and notes on development.</p>

<h2 dir="auto"><a id="user-content-community" class="anchor" aria-hidden="true" href="#community"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" "></path></svg></a>👥 Community</h2>
<p dir="auto">Get updates on Fleetbase's development and chat with the project maintainers and community members.</p>
<ul dir="auto">
<li>Follow <a href="https://twitter.com/fleetbase_io" rel="nofollow">@fleetbase_io on Twitter</a>.</li>
<li>Read and subscribe to <a href="https://www.fleetbase.io/blog-2" rel="nofollow">The Official Fleetbase Blog</a>.</li>
<li>Ask and explore <a href="https://github.com/orgs/fleetbase/discussions">our GitHub Discussions</a>.</li>
</ul>
      
<p dir="auto">See <a href="https://github.com/fleetbase/fleetbase/releases">the Releases section of our GitHub project</a> for changelogs for each release version of Fleetbase. Release announcement posts on <a href="https://www.fleetbase.io/blog-2" rel="nofollow">the official Fleetbase blog</a> contain summaries of the most noteworthy changes made in each release.</p>
      
<h2 dir="auto"><a id="user-content-creators" class="anchor" aria-hidden="true" href="#creators"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd"></path></svg></a>Creators</h2>
        
<img src="https://user-images.githubusercontent.com/58805033/230263021-212f2553-1269-473d-be94-313cb3eecfa5.png" alt="Ron Image" width="75" height="75" style="max-width: 100%;">         
<p dir="auto"><strong>Ronald A. Richardson - Co-founder & CTO</strong></p>
<ul dir="auto">
    <li><a href="https://github.com/orgs/fleetbase/people/roncodes">Github</a></li>
    <li><a href="https://www.linkedin.com/in/ronald-a-richardson/">LinkedIn</a></li>
</ul>
             
<img src="https://user-images.githubusercontent.com/58805033/230262598-1ce6d0cc-fb65-41f9-8384-5cf5cbf369c7.png" alt="Shiv Image" width="75" height="75" style="max-width: 100%;">        
<p dir="auto"><strong>Shiv Thakker - Co-founder & CEO</strong></p>
<ul dir="auto">
    <li><a href="https://github.com/orgs/fleetbase/people/shivthakker">Github</a></li>
    <li><a href="https://www.linkedin.com/in/shivthakker/">LinkedIn</a></li>
</ul>

<h2 dir="auto"><a id="user-content-community" class="anchor" aria-hidden="true" href="#need-help"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" ></path></svg></a>Need help?</h2>
<p dir="auto">Did we miss something? Not to worry! Just email our support team at hello@fleetbase.io or join our <a href="https://discord.gg/V39d5X9z">Discord server.</a></p>
<ul dir="auto">
</ul>
      
 <h2 dir="auto"><a id="user-content-copyright-and-license" class="anchor" aria-hidden="true" href="#copyright-and-license"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd""></path></svg></a>Copyright and license</h2>
<p dir="auto">Code and documentation copyright 2018–2023 the <a href="https://github.com/fleetbase/fleetbase/graphs/contributors">Fleetbase Authors</a>. Code released under the <a href="https://github.com/fleetbase/storefront-app/blob/main/LICENSE.md">MIT License</a>.</p>

</div>
  
  
