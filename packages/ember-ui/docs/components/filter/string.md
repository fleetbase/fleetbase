# String Filter Component

This is a reusable String Filter component built with Ember.js. It provides a customizable UI element that allows users to input a string filter and clear the input with a single click.

## Usage

To use the String Filter component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<StringFilter @value={{this.filterValue}} @placeholder="Enter filter text" @onChange={{this.handleFilterChange}} />

```

You can customize the String Filter component by passing in different props:


| Option        | Description                                                              |
| ------------- | ------------------------------------------------------------------------ |
| `value`       | The current value of the string filter input.                            |
| `placeholder` | The placeholder text to be displayed in the input field.                 |
| `onChange`    | A function that will be called when the user changes the value of the input field. |


## Example

```hbs

<div class="flex items-center">
  <StringFilter @value={{this.filterValue}} @placeholder="Enter filter text" @onChange={{this.handleFilterChange}} />
</div>

```

This will render an input field with the placeholder text "Enter filter text". When the user inputs text into the field, the handleFilterChange function will be called and passed the new value of the input. Additionally, a clear button will be displayed next to the input field. If the input field is empty, the clear button will be disabled. When the user clicks on the clear button, the input field will be cleared.
