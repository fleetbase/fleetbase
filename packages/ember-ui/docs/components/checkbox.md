# Checkbox Component

The Checkbox Component provides a customizable checkbox input that can be used in any Ember application.

## Usage

It provides a customizable checkbox input that can be used in any Ember application

| Parameter | Description                                                                                  |
|-----------|----------------------------------------------------------------------------------------------|
| `label`     | The label text to be displayed next to the checkbox.                                         |
| `value`     | The value of the checkbox.                                                                   |
| `checked`   | Whether the checkbox is checked or not.                                                      |
| `disabled`  | Whether the checkbox is disabled or not.                                                     |
| `color`     | The color of the checkbox. Currently, the available colors are blue, green, red, and yellow. |


## Example

An example of using the `status-badge` component in an Ember application:

```hbs

<div class="flex items-center">
  <Checkbox @label="Option 1" @value="option1" @checked={{this.option1Checked}} />
</div>
    {{button}}
{{/button-component}}

```

This will render a checkbox with the label "Option 1". When the checkbox is checked, the this.option1Checked property will be set to true.

