# Navigation Item Component

This is a reusable Navigation Item component built with Ember.js. It provides a customizable UI element that represents a single item in a navigation bar, with an optional icon and click handler.

## Usage

To use the Navigation Item component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<NavigationItem @icon="home" @onClick={{this.navigateToHome}}>Home</NavigationItem>

```

You can customize the Navigation Item component by passing in different props:


| Property  | Description                                                    |
|-----------|----------------------------------------------------------------|
| `icon`    | The icon to be displayed next to the navigation item title.    |
| `onClick` | The function to be called when the navigation item is clicked. |

## Example

```hbs

<div class="flex items-center">
  <NavigationItem @icon="home" @onClick={{this.navigateToHome}}>Home</NavigationItem>
  <NavigationItem @icon="search" @onClick={{this.navigateToSearch}}>Search</NavigationItem>
  <NavigationItem @icon="profile" @onClick={{this.navigateToProfile}}>Profile</NavigationItem>
</div>

```

This will render three navigation items side-by-side with the icons "home", "search", and "profile", respectively. When the user clicks on a navigation item, the corresponding onClick function will be called.


