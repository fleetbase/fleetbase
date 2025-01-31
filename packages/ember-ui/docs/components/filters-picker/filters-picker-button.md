# Button Component

The Button component is a reusable UI element that displays a clickable button with text and/or an icon.

## Usage

You can customize the Button component by passing in different props:

```hbs

  <Button @type="secondary" @text="Filters" @icon="filter" @size="sm" @wrapperClass="mr-2" @onClick={{this.toggleFilters}} />
  
```

You can customize the Button component by passing in different props:


| Option              | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `type` (optional)   | The type of button to display. Possible values include "primary", "secondary", "danger", and "success". Default is "primary". |
| `text` (optional)   | The text to display on the button.                                       |
| `icon` (optional)   | The name of the icon to display on the button (using FontAwesome icons). See https://fontawesome.com/icons for a list of available icons. |
| `size` (optional)   | The size of the button. Possible values include "xs", "sm", "md", and "lg". Default is "md". |
| `wrapperClass` (optional) | A CSS class to apply to the button's outer wrapper.                       |
| `...attributes` (optional) | Any additional attributes to apply to the button element.                  |


## Example

```hbs

  <Button @type="secondary" @text="Filters" @icon="filter" @size="sm" @wrapperClass="mr-2" @onClick={{this.toggleFilters}} />
  {{#if @buttonComponentArgs}}
    <ButtonWithBadge @type="primary" @text="Save" @icon="save" @size="sm" @wrapperClass="mr-2" @buttonComponentArgs={{@buttonComponentArgs}} />
  {{/if}}
  <Button @type="danger" @text="Delete" @icon="trash" @size="sm" @onClick={{this.delete}} />

```

This will render three buttons side by side: a secondary button with the text "Filters" and a filter icon, a primary button with the text "Save", and a danger button with the text "Delete" and a trash icon. 

If there are active filters (passed in via `@buttonComponentArgs.activeFilters`), a badge will be displayed on the "Save" button indicating the number of active filters.
