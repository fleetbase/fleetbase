# Button Component

The Button Component is a customizable button that can display text and/or icons.

## Usage

The Button Component can be used in any Ember.js application by importing it and passing in the required properties:

| Parameter    | Description                                                                                                                      |
|--------------|----------------------------------------------------------------------------------------------------------------------------------|
| `text`         | The text to display inside the button.                                                                                           |
| `type`         | The color scheme of the button. Can be "primary", "secondary", "success", "warning", "danger", or "info". Defaults to "default". |
| `size`         | The size of the button. Can be "xs", "sm", "md", or "lg". Defaults to "md".                                                      |
| `isLoading`    | Whether to display a loading spinner inside the button. Defaults to false.                                                       |
| `outline`      | Whether to use an outlined button style. Defaults to false.                                                                      |
| `icon`         | The FontAwesome icon to display inside the button. Can be any valid FontAwesome icon name. Defaults to null.                     |
| `iconSize`     | The size of the FontAwesome icon. Can be "xs", "sm", "lg", or "2x". Defaults to "sm".                                            |
| `iconRotation` | The rotation of the FontAwesome icon. Can be 0, 90, 180, or 270. Defaults to 0.                                                  |
| `iconFlip`     | The flip direction of the FontAwesome icon. Can be "horizontal", "vertical", or "both". Defaults to null.                        |
| `iconSpin`     | Whether to spin the FontAwesome icon. Defaults to false.                                                                         |
| `buttonType`   | The HTML type attribute of the button element. Can be "button", "submit", or "reset". Defaults to "button".                      |
| `isDisabled`   | Whether the button is disabled. Defaults to false.                                                                               |
| `wrapperClass` | Additional classes to add to the button wrapper element.                                                                         |
| `textClass`    | Additional classes to add to the button text element.                                                                            |
| `iconClass`    | Additional classes to add to the button icon element.                                                                            |
| `responsive`   | Whether to hide the button text on small screens. Defaults to false.                                                             |


The `status` parameter is required, while the other parameters are optional.

## Example

An example of using the `status-badge` component in an Ember application:

```hbs

{{#button-component
    @isLoading=false
    @isNotSecondary=true
    @wrapperClass="my-custom-wrapper-class"
    @outline=false
    @type="primary"
    @size="md"
    @isDisabled=false
    @buttonType="button"
    @icon="check"
    @iconPrefix="fas"
    @iconClass="text-green-500"
    @iconSize="2x"
    @iconRotation="0"
    @iconFlip="horizontal"
    @iconSpin=false
    @showIcon=true
    @text="Click me!"
    @textClass="text-white"
    @responsive=false
    onClick={{action "handleClick"}}
    as |button|
}}
    {{button}}
{{/button-component}}

```

This would render a primary button with medium size and a custom wrapper class. It displays the text "Click me!" and an icon of a check mark flipped horizontally. When clicked, it triggers the 'handleClick' action.


