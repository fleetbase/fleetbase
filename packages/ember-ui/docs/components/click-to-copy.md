# Click-to-Copy Component


This is a reusable Click-to-Copy component built with Ember.js. It provides a customizable UI element that allows users to copy a value to their clipboard with a single click.

## Usage

To use the Click-to-Copy component, you can simply import it into your Ember component and include it in your template as follows:

| Parameter | Description                                                                                           |
|-----------|-------------------------------------------------------------------------------------------------------|
| `value`     | The value to be copied to the clipboard.                                                              |
| `n-a`       | A function that will be called if there is no value to copy (e.g. if the value is undefined or null). |

## Example

An example of using the `status-badge` component in an Ember application:

```hbs

<div class="flex items-center">
  <ClickToCopy @value="Some value to be copied" />
</div>

```

This will render a clickable element with the text "Click to copy". When the user clicks on it, the value "Some value to be copied" will be copied to their clipboard, and the tooltip text will change to "Copied!".

