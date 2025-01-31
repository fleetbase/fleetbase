# Click-to-Reveal Component

This is a reusable Click-to-Reveal component built with Ember.js. It provides a customizable UI element that allows users to reveal hidden content with a single click, and optionally copy the content to their clipboard.

## Usage

To use the Modal component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<ClickToReveal @value="Value to be revealed" />

```

You can customize the Click-to-Reveal component by passing in different props:


| Parameter      | Description                                                                                             |
|----------------|---------------------------------------------------------------------------------------------------------|
| `value`          | The value to be revealed.                                                                               |
| `buttonText`     | The text to be displayed on the reveal button.                                                          |
| `canClickToCopy` | Whether or not the user can click to copy the revealed value. Defaults to false.                        |
| `n-a`            | A function that will be called if there is no value to reveal (e.g. if the value is undefined or null). |

## Example

```hbs

<div class="flex items-center">
  <ClickToReveal @value="Some value to be revealed" @buttonText="Reveal" @canClickToCopy={{true}} />
</div>

```

This will render a clickable element with the text "Click to reveal". When the user clicks on it, the value "Some value to be revealed" will be revealed, and a button with the text "Reveal" will appear. The user can click on the "Reveal" button to hide the revealed value. Additionally, if @canClickToCopy is set to true, a tooltip with the text "Click to copy" will appear. When the user clicks on the tooltip, the revealed value will be copied to their clipboard, and the tooltip text will change to "Copied!".




