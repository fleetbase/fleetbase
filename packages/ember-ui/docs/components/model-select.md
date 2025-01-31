# PowerSelect Component

This is a reusable PowerSelect component built with Ember.js. 

It provides a customizable dropdown menu that allows users to select from a list of options, with the ability to search and filter through the options.

## Usage

To use the PowerSelect component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<div class="fleetbase-model-select ember-model-select">
    <PowerSelect @options={{this.options}} @selected={{this.selectedOption}} @onChange={{this.onChange}} />
</div>

```

You can customize the PowerSelect component by passing in different props:

| Parameter | Description                                                |
|-----------|------------------------------------------------------------|
| `options`   | An array of options to display in the dropdown.            |
| `selected`  | The currently selected option.                             |
| `onChange`  | A function that will be called when an option is selected. |

## Example

```hbs

<div class="flex items-center">
  <PowerSelect @options={{this.options}} @selected={{this.selectedOption}} @onChange={{this.onChange}} />
</div>

```

This will render a dropdown menu with the options passed in as options. 

When the user selects an option, the `onChange` function will be called with the selected option as an argument.

