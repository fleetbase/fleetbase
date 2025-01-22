# UI Input Info Component

This is a reusable UI Input Info component built with Tailwind CSS. It provides an information block that can be used to display helpful information or examples related to a form input.

## Usage

To use the UI Input Info component, you can simply import it into your Tailwind CSS HTML and include it in your code as follows:

```hbs

<div class="ui-input-info bg-opacity-{{or @opacity 100}} dark:text-blue-100" ...attributes>
    <FaIcon @icon={{or @icon "info-circle"}} class="mr-1 {{@iconClass}}" />
    <span class="text-left {{@spanClass}}">
        {{#if (has-block)}}
            {{yield}}
        {{else}}
            {{@text}}
            {{#if @exampleText}}
                <pre class="break-text subpixel-antialiased">{{@exampleText}}</pre>
            {{/if}}
        {{/if}}
    </span>
</div>

```

You can customize the UI Input Info component by passing in different props:

| Name        | Description                                                                           |
|-------------|---------------------------------------------------------------------------------------|
| `opacity`     | The opacity of the information block background. By default, it is set to 100.        |
| `icon`        | The icon to display in the information block. By default, it is set to "info-circle". |
| `iconClass`   | Any additional classes to apply to the icon element.                                  |
| `spanClass`   | Any additional classes to apply to the span element.                                  |
| `text`        | The text to display in the information block.                                         |
| `exampleText` | Any example text to display in the information block.                                 |

## Example

```hbs

<div class="ui-input-info bg-opacity-50">
    <FaIcon @icon="exclamation-triangle" class="mr-1 text-red-600" />
    <span class="text-left text-red-600">
        The password must be at least 8 characters long and contain a mix of uppercase and lowercase letters, numbers, and symbols.
    </span>
</div>


```

This will render an information block with a yellow background and an exclamation-triangle icon. 

The text "The password must be at least 8 characters long and contain a mix of uppercase and lowercase letters, numbers, and symbols." will be displayed in red text.
