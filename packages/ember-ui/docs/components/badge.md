# Badge Component

This code defines a component in Ember.js that renders a status badge. The component is called status-badge and can be customized with various parameters to display different statuses and behaviors.

## Usage

To use the status-badge component, include it in your Ember application and pass in the necessary parameters as follows:

| Parameter       | Description                                                                                                     |
|-----------------|-----------------------------------------------------------------------------------------------------------------|
| `status`          | A string representing the status of the badge.                                                                  |
| `spanClass`       | A string representing additional class names for the span element inside the badge.                             |
| `hideStatusDot`   | A boolean indicating whether the dot inside the badge should be hidden.                                         |
| `disableHumanize` | A boolean indicating whether the status string should be humanized (converted from camel case to spaced words). |
| `helpText`        | A string representing the help text to be displayed in a tooltip.                                               |
| `exampleText`     | A string representing example text to be displayed in the tooltip.                                              |

The `status` parameter is required, while the other parameters are optional.

## Example

An example of using the `status-badge` component in an Ember application:

```Javascript

<StatusBadge @status="IN_PROGRESS" @spanClass="bg-blue-100 text-blue-800" @hideStatusDot={{true}} @disableHumanize={{true}} @helpText="This task is currently in progress." @exampleText="Please wait."></StatusBadge>

```

In this example, the status-badge component is used to display a status badge for a task in progress. 

The badge has a blue background with blue text, and the dot inside the badge is hidden. 

The status string is not humanized and is displayed as "IN_PROGRESS". 

A tooltip is displayed when hovering over the badge with the text "This task is currently in progress. Please wait."
