# FormSelect Component

This is a reusable Form Select component built with Ember.js. 

It provides a customizable UI element that allows users to select an option from a dropdown menu.

## Usage

To use the FormSelect component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<FormSelect @options={{array "Option 1" "Option 2" "Option 3"}} />

```

You can customize the Form Select component by passing in different props:

| Parameter   | Description                                                     |
|-------------|-----------------------------------------------------------------|
| `options`     | An array of options to be displayed in the dropdown menu.       |
| `optionValue` | The key used to retrieve the value of the option object.        |
| `optionLabel` | The key used to retrieve the label of the option object.        |
| `placeholder` | The text to be displayed as a placeholder in the dropdown menu. |
| `humanize`    | Whether or not to apply humanization to the option labels.      |

## Example

```hbs

<div class="flex items-center">
  <FormSelect @options={{array "Option 1" "Option 2" "Option 3"}} @placeholder="Select an option" @optionLabel="label" @optionValue="value" @humanize={{true}} />
</div>

```

This will render a dropdown menu with the placeholder text "Select an option" and three options: "Option 1", "Option 2", and "Option 3". 

If `@humanize` is set to true, the options will be humanized (e.g. "Option 1" becomes "Option one"). 

If `@optionValue` and `@optionLabel` are provided, the options will be objects with keys corresponding to the values provided. 

For example, the first option could be { value: "option_1", label: "Option 1" }.
