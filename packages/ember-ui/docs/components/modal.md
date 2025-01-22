#  Modal Component


This is a reusable modal component built with Ember.js. It provides a customizable UI element that can be used to display content in a modal dialog.

## Usage

To use the modal component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<EmberModal @dialogComponent="modal/dialog" />

```

You can customize the EmberModal component by passing in different props:


| Parameter       | Description                                                       |
|-----------------|-------------------------------------------------------------------|
| `dialogComponent` | The component used to render the modal dialog.                    |
| `headerComponent` | The component used to render the modal header.                    |
| `bodyComponent`   | The component used to render the modal body.                      |
| `footerComponent` | The component used to render the modal footer.                    |
| `onClose`         | A function that will be called when the modal is closed.          |
| `onSubmit`        | A function that will be called when the modal is submitted.       |
| `fade`            | Whether or not to use a fade animation.                           |
| `showModal`       | Whether or not to show the modal.                                 |
| `keyboard`        | Whether or not to close the modal when the escape key is pressed. |
| `size`            | The size of the modal (e.g. small, medium, large).                |
| `backdropClose`   | Whether or not to close the modal when the backdrop is clicked.   |
| `paddingLeft`     | The left padding of the modal.                                    |
| `paddingRight`    | The right padding of the modal.                                   |
| `position`        | The position of the modal (e.g. center, top, bottom).             |
| `scrollable`      | Whether or not the modal is scrollable.                           |
| `fullscreen`      | Whether or not the modal is fullscreen.                           |

## Example

```hbs

{{#if this.showModal}}
  <EmberModal
    @dialogComponent="modal/dialog"
    @headerComponent="modal/header"
    @bodyComponent="modal/body"
    @footerComponent="modal/footer"
    @onClose={{this.closeModal}}
    @onSubmit={{this.submitModal}}
    @fade={{true}}
    @showModal={{true}}
    @keyboard={{true}}
    @size="large"
    @backdropClose={{true}}
    @paddingLeft={{10}}
    @paddingRight={{10}}
    @position="center"
    @scrollable={{true}}
    @fullscreen={{true}}
  >
    {{!-- Modal Content Goes Here --}}
  </EmberModal>
{{/if}}

```


