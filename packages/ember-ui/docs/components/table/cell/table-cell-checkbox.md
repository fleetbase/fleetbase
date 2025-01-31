# Checkbox Component

This is a reusable Checkbox component built with Ember.js. It provides a customizable UI element that allows users to toggle a boolean value with a checkbox.

## Usage

To use the Checkbox component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<Checkbox @id={{this.id}} @onToggle={{this.onToggle}} @value={{@value}} />

```

You can customize the Checkbox component by passing in different props:

| Parameter | Description                                                           |
|-----------|-----------------------------------------------------------------------|
| `id`        | The id attribute of the checkbox input element.                       |
| `onToggle`  | A callback function that will be called when the checkbox is toggled. |
| `value`     | The boolean value that the checkbox represents.                       |

## Example

```hbs

<div class="flex items-center">
  <Checkbox @id="my-checkbox" @onToggle={{this.toggleValue}} @value={{this.checkboxValue}} />
  <label for="my-checkbox">My Checkbox Label</label>
</div>

```

This will render a checkbox input element with the label "My Checkbox Label". When the user clicks on the checkbox, the toggleValue function will be called with the new value of the checkbox. The value of the checkbox is determined by the checkboxValue property on the component.


