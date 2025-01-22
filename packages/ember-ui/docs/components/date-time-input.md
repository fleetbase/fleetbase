# UI Date-Time Input Component

This is a reusable UI Date-Time Input component built with Ember.js. It provides a customizable UI element that allows users to select a date and time.

## Usage

To use the UI Date-Time Input component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<div class="ui-date-time-input-container">
  <UiDateTimeInput 
    @date={{this.date}} 
    @time={{this.time}} 
    @minDate={{this.minDate}} 
    @maxDate={{this.maxDate}} 
    @minTime={{this.minTime}} 
    @maxTime={{this.maxTime}} 
    {{on "update" this.handleUpdate}} 
  />
</div>

```

You can customize the UI Date-Time Input component by passing in different props:

| Parameter | Description                                  |
|-----------|----------------------------------------------|
| `date`      | The initial date value to be displayed.      |
| `time`      | The initial time value to be displayed.      |
| `minDate`   | The minimum date value that can be selected. |
| `maxDate`   | The maximum date value that can be selected. |
| `minTime`   | The minimum time value that can be selected. |
| `maxTime`   | The maximum time value that can be selected. |

You can also add an on "update" action to be notified when the user selects a new date or time value.


## Example

```hbs

<div class="ui-date-time-input-container">
  <UiDateTimeInput 
    @date={{this.date}} 
    @time={{this.time}} 
    @minDate={{this.minDate}} 
    @maxDate={{this.maxDate}} 
    @minTime={{this.minTime}} 
    @maxTime={{this.maxTime}} 
    {{on "update" this.handleUpdate}} 
  />
</div>

```

This will render a UI element with a date and time input. The user can select a date and time by clicking on the input field and selecting a value from the dropdown. The selected value will be displayed in the input field. Additionally, the on "update" action will be called whenever the user selects a new date or time value.

