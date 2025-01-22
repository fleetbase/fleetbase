# Modals Component

This is a reusable Modals component built with Ember.js. 

It provides a customizable UI element that allows users to display modals with different contents, such as confirmation dialogs or forms, by passing in different component templates.

## Usage

To use the Modals component, you can import it into your Ember component and include it in your template as follows:

```hbs

{{#if this.modalsManager.modalIsOpened}}
  {{component
    (component this.modalsManager.componentToRender)
    modalIsOpened=this.modalsManager.modalIsOpened
    options=this.modalsManager.options
    onConfirm=this.confirm
    onDecline=this.decline
  }}
{{/if}}

```

You can customize the Modals component by passing in different props:


| Parameter         |                                                   Description                                                  |
|-------------------|:--------------------------------------------------------------------------------------------------------------:|
| `modalsManager`     |                 An instance of the ModalsManager service which handles the state of the modals.                |
| `componentToRender` |  The component that will be rendered inside the modal. This should be a string with the name of the component. |
| `options `          | An object containing any data or options that the component passed in via the componentToRender prop may need. |
| `onConfirm `        |                  A function that will be called when the user confirms an action in the modal.                 |
| `onDecline`         |                  A function that will be called when the user declines an action in the modal.                 |

## Example

```hbs

{{#if this.modalsManager.modalIsOpened}}
  {{component
    (component this.modalsManager.componentToRender)
    modalIsOpened=this.modalsManager.modalIsOpened
    options=this.modalsManager.options
    onConfirm=this.confirm
    onDecline=this.decline
  }}
{{/if}}


```

This will render a modal component that will display the component passed in via the `componentToRender` prop when `this.modalsManager.modalIsOpened` is true. 

The component will receive `options`, `onConfirm`, and `onDecline` as props.

