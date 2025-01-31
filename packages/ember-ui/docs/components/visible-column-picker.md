# DropdownButton Component

This is a reusable DropdownButton component built with Ember.js. 

It provides a customizable UI element that allows users to click on a button to reveal a dropdown with selectable options.

## Usage

To use the DropdownButton component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<DropdownButton 
    @text={{or @text "Columns"}} 
    @icon={{or @icon "sliders-h"}} 
    @type={{@type}} 
    @size={{or @size "xs"}} 
    @buttonClass={{@buttonClass}} 
    @buttonWrapperClass={{@buttonWrapperClass}} 
    @triggerClass={{@triggerClass}} 
    @wrapperClass={{@wrapperClass}} 
    @renderInPlace={{@renderInPlace}} 
    @registerAPI={{@registerAPI}} 
    @horizontalPosition={{@horizontalPosition}} 
    @verticalPosition={{@verticalPosition}} 
    @calculatePosition={{@calculatePosition}} 
    @defaultClass={{@defaultClass}} 
    @matchTriggerWidth={{@matchTriggerWidth}} 
    @onOpen={{@onOpen}} 
    @onClose={{@onClose}} 
    ...attributes 
    as |dd|
>
    <div class="customize-columns-dropdown-container">

```

You can customize the DropdownButton component by passing in different props:

| Parameter               | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `text`               | The text to be displayed on the button.                                     |
| `icon`               | The icon to be displayed on the button.                                     |
| `type`               | The type of the button.                                                     |
| `size`               | The size of the button.                                                     |
| `buttonClass`        | The CSS class to apply to the button element.                               |
| `buttonWrapperClass` | The CSS class to apply to the button wrapper element.                       |
| `triggerClass`       | The CSS class to apply to the trigger element.                              |
| `wrapperClass`       | The CSS class to apply to the wrapper element.                              |
| `renderInPlace`      | Whether or not to render the dropdown in place.                             |
| `registerAPI`        | A function to register the DropdownButton API.                              |
| `horizontalPosition` | The horizontal position of the dropdown.                                    |
| `verticalPosition`   | The vertical position of the dropdown.                                      |
| `calculatePosition`  | A function to calculate the position of the dropdown.                       |
| `defaultClass`       | The default CSS class to apply to the component.                            |
| `matchTriggerWidth`  | Whether or not to match the width of the dropdown with the trigger element. |
| `onOpen`             | A function to be called when the dropdown is opened.                        |
| `onClose`            | A function to be called when the dropdown is closed.                        |

## Example

```hbs

<DropdownButton 
    @text="Columns" 
    @icon="sliders-h" 
    @size="lg" 
    @buttonClass="my-custom-button-class" 
    @wrapperClass="my-custom-wrapper-class" 
    @matchTriggerWidth={{true}}
>

```


