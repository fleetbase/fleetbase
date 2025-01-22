# Mobile Navbar Component

The Mobile Navbar Component is a responsive component designed to provide a mobile-friendly navigation interface for your Ember.js web application. 

The component is optimized for mobile devices and features a customizable design that can be tailored to meet your specific needs.

## Usage

To use the Mobile Navbar Component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<MobileNavbar @extensions={{@extensions}} @onAction={{@onAction}} @toggleSidebar={{this.toggleSidebar}} />

```

You can customize the Mobile Navbar Component by passing in different props:

| Property      | Description                                                             |
|---------------|-------------------------------------------------------------------------|
| `extensions`    | An array of extension items to display in the navbar.                   |
| `onAction`   | A function to be called when an extension item is clicked.              |
| `toggleSidebar` | A function to be called when the sidebar menu toggle button is clicked. |

## Example

```hbs

{{#if (media 'isMobile')}}
  <MobileNavbar @extensions={{@extensions}} @onAction={{@onAction}} @toggleSidebar={{this.toggleSidebar}} />
{{/if}}

```

This will render a mobile navbar with extension items and a sidebar menu toggle button. 

The`@extensions` prop should be an array of extension items to display in the navbar. 

The `@onActio`n prop should be a function to be called when an extension item is clicked. 

The `@toggleSidebar` prop should be a function to be called when the sidebar menu toggle button is clicked.


