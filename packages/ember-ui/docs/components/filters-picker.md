# DropdownButton Component

This is a reusable DropdownButton component built with Ember.js. 

It provides a customizable UI element that allows users to select and apply filters.

## Usage

To use the DropdownButton component, you can simply import it into your Ember component and include it in your template as follows:

```hbs


<DropdownButton @filters={{this.filters}} @buttonComponent="filters-picker/button" />

```

You can customize the DropdownButton component by passing in different props:


| Name                | Description                                                                    |
|---------------------|--------------------------------------------------------------------------------|
| `filters`             | An array of filters to be displayed in the dropdown.                           |
| `buttonComponent`     | The component used to render the button.                                       |
| `buttonComponentArgs`| Arguments to be passed to the button component.                                |
| `text`                | The text to be displayed on the button.                                        |
| `icon`                | The icon to be displayed on the button.                                        |
| `type`                | The type of the button.                                                        |
| `size`                | The size of the button.                                                        |
| `buttonClass`         | A class to be applied to the button.                                           |
| `buttonWrapperClass`  | A class to be applied to the button wrapper.                                   |
| `triggerClass`        | A class to be applied to the dropdown trigger.                                 |
| `wrapperClass`        | A class to be applied to the dropdown wrapper.                                 |
| `renderInPlace`       | Whether or not to render the dropdown in place.                                |
| `registerAPI`         | A function that is called with the API object of the dropdown.                 |
| `horizontalPosition`  | The horizontal position of the dropdown.                                       |
| `verticalPosition`    | The vertical position of the dropdown.                                         |
| `calculatePosition`   | A function that calculates the position of the dropdown.                       |
| `defaultClass`        | The default class to be applied to the dropdown.                               |
| `matchTriggerWidth`   | Whether or not to match the width of the dropdown to the width of the trigger. |
| `onOpen`             | A function that is called when the dropdown is opened.                         |
| `onClose`             | A function that is called when the dropdown is closed.                         |
| `...attributes`       | Any additional attributes to be passed to the dropdown.                        |

## Example

```hbs

<DropdownButton @filters={{this.filters}} @buttonComponent="filters-picker/button" />


```

This will render a button with the text "Filter" and the icon "filter". When the user clicks on the button, a dropdown will appear with the filters defined in the filters array. The user can select filters and apply them using the "Apply" button, or clear the selected filters using the "Clear" button.
