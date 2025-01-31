# Modal Footer Component

This is a reusable Modal Footer component built with Ember.js. It provides a customizable UI element that allows users to add buttons to the footer of a modal.

## Usage

To use the Modal Footer component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<ModalFooter @onClose={{this.closeModal}} @submitTitle="Save" @submitButtonType="success" />

```

You can customize the Modal Footer component by passing in different props:

| Parameter        | Description                                                                  |
|------------------|------------------------------------------------------------------------------|
| onClose          | A function that will be called when the close button is clicked.             |
| submitTitle      | The text to be displayed on the submit button.                               |
| submitButtonType | The type of the submit button (e.g. "primary", "success", "danger").         |
| submitDisabled   | Whether or not the submit button should be disabled.                         |
| closeTitle       | The text to be displayed on the close button.                                |
| buttonComponent  | The name of the component to be used for the buttons (defaults to "button"). |

## Example

```hbs

<ModalFooter @onClose={{this.closeModal}} @submitTitle="Save" @submitButtonType="success">
  <p>Some additional content can be added here.</p>
</ModalFooter>


```

This will render a footer with two buttons: a "Save" button with the "success" type, and an "Ok" button with the "primary" type. When the "Save" button is clicked, the @onSubmit action will be called. The user can also click the "Ok" button to close the modal. Additionally, any additional content that is included between the opening and closing {{#ModalFooter}} tags will be rendered within the footer.







