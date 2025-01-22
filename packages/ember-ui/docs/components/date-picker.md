# Date Picker Component

This is a reusable Date Picker component built with Ember.js. It provides a customizable UI element that allows users to select a date from a calendar.

## Usage

To use the Date Picker component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<DatePicker @value={{this.date}} @placeholder="Select a date" />

```

You can customize the Date Picker component by passing in different props:


| Parameter   | Description                                              |
|-------------|----------------------------------------------------------|
| `value`       | The value of the selected date.                          |
| `placeholder` | The placeholder text to be displayed in the input field. |

## Example

```hbs

<div class="flex items-center">
  <DatePicker @value={{this.date}} @placeholder="Select a date" />
</div>

```

This will render an input field with the placeholder text "Select a date". When the user clicks on the input field, a calendar will appear, allowing them to select a date. The selected date will be displayed in the input field.
