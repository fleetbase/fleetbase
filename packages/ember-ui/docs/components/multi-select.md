# PowerSelectMultiple Component


The PowerSelectMultiple component allows users to select multiple options from a list of options. 

To use this component, you can simply include it in your template as follows:


## Usage

To use the PowerSelectMultiple component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<PowerSelectMultiple
  class="form-select form-input {{@selectClass}}"
  @registerAPI={{@registerAPI}}
  @searchEnabled={{@searchEnabled}}
  @search={{@search}}
  @options={{@options}}
  @selected={{@selected}}
  @placeholder={{@placeholder}}
  @onChange={{@onChange}}
  @allowClear={{@allowClear}}
  @placeholderComponent={{@placeholderComponent}}
  @preventScroll={{@preventScroll}}
  @renderInPlace={{@renderInPlace}}
  @scrollTo={{@scrollTo}}
  as |option|
>
  {{yield option}}
</PowerSelectMultiple>

```

You can customize the PowerSelectMultiple component by passing in different props:

| Parameter            | Description                                                                                       |
|----------------------|---------------------------------------------------------------------------------------------------|
| `class`                | CSS classes to apply to the select element.                                                       |
| `registerAPI`          | An action that will be called with an object containing select, search, and trigger elements.     |
| `searchEnabled`        | A boolean that determines whether or not to enable search functionality.                          |
| `search`               | A function that will be called with the search term when the user enters a search term.           |
| `options`              | An array of options to display in the select.                                                     |
| `selected`             | An array of selected options.                                                                     |
| `placeholder`          | Text to display when no options are selected.                                                     |
| `onChange`             | An action that will be called with the selected options.                                          |
| `allowClear`           | A boolean that determines whether or not to display a clear button to clear the selected options. |
| `placeholderComponent` | A component to display as the placeholder instead of text.                                        |
| `preventScroll`        | A boolean that determines whether or not to prevent the select from scrolling.                    |
| `renderInPlace`        | A boolean that determines whether or not to render the select in place.                           |
| `scrollTo`            | A function that will be called with the option to scroll to.                                      |

## Example

```hbs

<PowerSelectMultiple
  @options={{this.options}}
  @selected={{this.selected}}
  @onChange={{this.onChange}}
>
  {{#each this.options as |option|}}
    <div class="px-2 py-1">{{option}}</div>
  {{/each}}
</PowerSelectMultiple>

```

This will render a select element with the options specified in `@options`. 

When the user selects options, the `@onChange` action will be called with the selected options. 

You can customize the options by yielding content for each option. 

In this example, we're displaying a simple div element with the text of each option.

