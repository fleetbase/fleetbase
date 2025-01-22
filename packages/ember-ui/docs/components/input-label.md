# Input Label with Tooltip Component

This is a reusable Input Label with Tooltip component built with Ember.js. It provides a customizable UI element that consists of a label and an optional tooltip, which can contain additional information about the input field.

## Usage

To use the Input Label with Tooltip component, you can simply import it into your Ember component and include it in your template as follows:

```hbs


<InputLabelWithTooltip @labelText="Label text" @helpText="Tooltip text" />


```

You can customize the Input Label with Tooltip component by passing in different props:


| Parameter        | Description                                                       |
|--------------|-------------------------------------------------------------------|
| `labelText`    | The text to be displayed in the label.                            |
| `helpText`     | The text to be displayed in the tooltip.                          |
| `exampleText`  | Optional text to display as an example in the tooltip.            |
| `icon`         | The icon to be displayed in the tooltip (default: "info-circle"). |
| `wrapperClass` | Additional classes to apply to the component wrapper.             |
| `iconClass`    | Additional classes to apply to the tooltip icon.                  |
| `spanClass`    | Additional classes to apply to the tooltip text.                  |

## Example

```hbs


<InputLabelWithTooltip @labelText="First name" @helpText="Enter your first name here" @icon="question-circle" />



```

This will render an input label with the text "First name", and a tooltip icon with the icon "question-circle". 

When the user hovers over the tooltip icon, a tooltip with the text "Enter your first name here" will appear. 

Additionally, you can customize the component by passing in additional props, such as `wrapperClass`, `iconClass`, and `spanClass`.


