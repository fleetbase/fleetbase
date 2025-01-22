# Dark Mode Toggle Component

This is a reusable Dark Mode Toggle component built with Ember.js. 

It provides a customizable UI element that allows users to toggle between light and dark mode with a single click.

## Usage

To use the Dark Mode Toggle component, you can simply import it into your Ember component and include it in your template as follows:


```hbs

    <Toggle @isToggled={{this.userPrefersDarkMode}} @onToggle={{this.switchDarkMode}} />
    <span class="ml-1">
        Dark Mode
    </span>

```

You can customize the Dark Mode Toggle component by passing in different props:


| Option     | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| `isToggled` | A boolean value indicating whether the toggle is in dark mode or light mode. |
| `onToggle`  | A function that will be called when the toggle is clicked.            |


## Example

```hbs

  <DarkModeToggle @isToggled={{this.userPrefersDarkMode}} @onToggle={{this.switchDarkMode}} />

```

This will render a clickable element with the text "Dark Mode". 

When the user clicks on it, the toggle will switch between dark mode and light mode. 

Additionally, if `@isToggled` is set to true, the toggle will be in dark mode by default.
