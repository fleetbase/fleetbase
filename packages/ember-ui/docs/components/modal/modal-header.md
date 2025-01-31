# Modal Header Component

This is a reusable Modal Header component built with Ember.js. It provides a customizable UI element that allows users to add a title and a close button to the header of a modal.

## Usage

To use the Modal Header component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<Modal::Header @title="Modal Title" @onClose={{this.closeModal}} />

```

You can customize the Modal Header component by passing in different props:

| Parameter      | Description                                             |
|----------------|---------------------------------------------------------|
| `title`          | The title to be displayed in the header.                |
| `closeButton`    | Whether or not to display a close button in the header. |
| `titleComponent` | The component to be used to render the title.           |
| `closeComponent` | The component to be used to render the close button.    |

You can also customize the Title and Close components by passing in different props to them.


## Example

```hbs

{{#let
  (component "h1")
  (component "button" onClick=@onClose)
as |Title Close|
}}
  <Modal::Header @titleComponent={{Title}} @title="Modal Title" @closeComponent={{Close}} @onClose={{this.closeModal}} />
{{/let}}


```

This will render a header with the title "Modal Title" and a close button. The h1 component will be used to render the title, and the button component will be used to render the close button. When the user clicks on the close button, the closeModal action will be triggered.







