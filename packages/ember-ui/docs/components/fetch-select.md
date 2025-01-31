# Fetch-Select Component

This is a reusable Fetch-Select component built with Ember.js. It provides a customizable UI element that allows users to select an option from a dropdown menu, which is populated with data fetched from a specified API endpoint.

## Usage

To use the Fetch-Select component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<FetchSelect 
    @options={{this.options}}
    @placeholder="Select an option"
    @optionLabel={{this.optionLabel}}
    @optionValue={{this.optionValue}}
    @onSelect={{this.handleSelect}}
    @humanize={{true}}
    class="my-wrapper-class"
>
    {{!-- Optional: custom option template --}}
    <option>
        {{optionLabel}} ({{optionValue}})
    </option>
</FetchSelect>

```

You can customize the Fetch-Select component by passing in different props:


| Property    | Description                                                                                                                                                       |
|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `options`     | An array of options to populate the dropdown menu. This can be set directly, or fetched asynchronously from a specified API endpoint.                             |
| `placeholder` | The placeholder text to display in the dropdown menu when no option is selected.                                                                                  |
| `optionLabel` | The property of each option object to use as the display label in the dropdown menu.                                                                              |
| `optionValue` | The property of each option object to use as the value when an option is selected.                                                                                |
| `onSelect`    | A function that will be called when an option is selected from the dropdown menu.                                                                                 |
| `humanize`   | A boolean value indicating whether or not to humanize the option labels. If set to true, option labels will be transformed from camelCase to human-readable form. |

## Example

```hbs

<div class="my-wrapper-class">
  <FetchSelect 
      @options={{this.options}}
      @placeholder="Select an option"
      @optionLabel="name"
      @optionValue="id"
      @onSelect={{this.handleSelect}}
      @humanize={{true}}
  >
    {{!-- Optional: custom option template --}}
    <option>
        {{optionLabel}} ({{optionValue}})
    </option>
  </FetchSelect>
</div>


```

This will render a dropdown menu with the specified placeholder text "Select an option". When an option is selected, the handleSelect function will be called with the selected option value as its argument. The options array can be set directly or fetched asynchronously using the did-insert hook. Option labels will be humanized by default.




