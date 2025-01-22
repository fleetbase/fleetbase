# Customizable Cell Component

This is a customizable cell component that can be used in tables or any other data display. It provides a customizable UI element that allows users to display data with various formatting options.

## Usage

To use the Customizable Cell component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<CustomizableCell @value={{myValue}} />

```

You can customize the Customizable Cell component by passing in different props:

| Parameter | Description                                                                                              |
|-----------|----------------------------------------------------------------------------------------------------------|
| `value`     | The value to be displayed.                                                                               |
| `column`    | An object that describes the column and its formatting options.                                          |
| `n-a`       | A function that will be called if there is no value to display (e.g. if the value is undefined or null). |

## Example

```hbs

<div aria-label={{n-a @value}}>
    <span class={{@column.cellClassNames}}>
        {{#if (has-block)}}
            {{yield}}
        {{else}}
            {{n-a @value}}
        {{/if}}
    </span>
</div>


```

This will render a customizable cell component with the value myValue. If the value is undefined or null, the n-a function will be called to handle the display. The column object can be used to specify different formatting options for the cell. If a block is provided, it will be used to render the content of the cell. Otherwise, the default n-a function will be used to display the value.


