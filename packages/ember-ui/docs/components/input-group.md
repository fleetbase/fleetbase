# Input Group Component

This is a reusable Input Group component built with Ember.js. It provides a customizable UI element that groups a label and an input element together.

## Usage

To use the Input Group component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<InputGroup @name="Example" @placeholder="Enter something" />

```

You can customize the Input Group component by passing in different props:


| Parameter         | Description                                                    |
|-------------------|----------------------------------------------------------------|
| `name`              | The label text for the input element.                          |
| `placeholder`       | The placeholder text for the input element.                    |
| `required`          | Whether the input element is required or not.                  |
| `disabled`          | Whether the input element is disabled or not.                  |
| `autocomplete`      | The value for the autocomplete attribute of the input element. |
| `autofill`          | Whether to enable autofill or not.                             |
| `wrapperClass`      | The CSS class for the input group wrapper element.             |
| `labelWrapperClass` | The CSS class for the label wrapper element.                   |
| `inputClass`        | The CSS class for the input element.                           |

You can also pass a block to the Input Group component to customize the input element.


## Example

```hbs

<div class="max-w-md">
    <InputGroup @name="Email" @required={{true}} @wrapperClass="mb-3" @inputClass="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md shadow-sm" />
</div>


```

This will render an input group with a label "Email" and a required input element with a placeholder "Enter something". 

Additionally, the wrapper element has a CSS class "mb-3", and the input element has a CSS class for styling the border and focus.

