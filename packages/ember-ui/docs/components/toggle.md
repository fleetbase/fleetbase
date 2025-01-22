# ToggleSwitch Component

This is a reusable ToggleSwitch component built with Ember.js. 

It provides a customizable UI element that allows users to toggle a switch on and off with a single click.

## Usage

To use the ToggleSwitch component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<ToggleSwitch @isToggled={{this.isToggled}} />

```

You can customize the ToggleSwitch component by passing in different props:

| Prop             | Description                                                                                                        |
|------------------|--------------------------------------------------------------------------------------------------------------------|
| `isToggled`        | A boolean indicating whether the toggle switch is toggled on or off.                                               |
| `disabled`         | A boolean indicating whether the toggle switch is disabled.                                                        |
| `wrapperClass`     | A string containing additional CSS classes to apply to the toggle switch wrapper element.                          |
| `activeColorClass` | A string containing the CSS class to apply to the toggle switch when it is toggled on.                             |
| `label`            | A string containing the label text to display next to the toggle switch.                                           |
| `labelClass`       | A string containing additional CSS classes to apply to the label element.                                          |
| `helpText`         | A string containing additional information to display next to the toggle switch, such as a tooltip or explanation. |
| `exampleText`      | A string containing example text to display in the help text.                                                      |

## Example

```hbs

<div class="flex items-center">
  <ToggleSwitch @isToggled={{this.isToggled}} @label="Enable notifications" @helpText="Turn on to receive notifications when new content is available." />
</div>

```

This will render a toggle switch element with the label "Enable notifications" next to it. 

When the user clicks on the toggle switch, the `isToggled` property will be updated accordingly. 

Additionally, if `helpText` is provided, a tooltip with the text "Turn on to receive notifications when new content is available." will appear when the user hovers over the toggle switch.
