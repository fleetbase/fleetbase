# Modal Component


This is a reusable Modal component built with Ember.js. It provides a customizable UI element that allows users to display a modal dialog with hidden content.

## Usage

To use the Modal component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<Modal @titleId={{this.titleId}} @fade={{true}} @showModal={{true}} @inDom={{true}} @paddingLeft={{10}} @paddingRight={{20}} @centered={{true}} @scrollable={{false}} @fullscreen={{false}}>
  <h2>{{this.title}}</h2>
  <p>{{this.content}}</p>
</Modal>

```

You can customize the Modal component by passing in different props:

| Property     | Description                                                            |
|--------------|------------------------------------------------------------------------|
| titleId      | The id for the title of the modal dialog.                              |
| fade         | Whether or not the modal should fade in and out.                       |
| showModal    | Whether or not the modal is visible.                                   |
| inDom        | Whether or not the modal is in the DOM.                                |
| paddingLeft  | The amount of padding to apply to the left side of the modal content.  |
| paddingRight | The amount of padding to apply to the right side of the modal content. |
| centered     | Whether or not the modal should be centered in the viewport.           |
| scrollable   | Whether or not the modal should be scrollable.                         |
| fullscreen   | Whether or not the modal should be full screen.                        |

## Example

```hbs

<div class="flex items-center">
  <Modal @titleId={{this.titleId}} @fade={{true}} @showModal={{true}} @inDom={{true}} @paddingLeft={{10}} @paddingRight={{20}} @centered={{true}} @scrollable={{false}} @fullscreen={{false}}>
    <h2>{{this.title}}</h2>
    <p>{{this.content}}</p>
  </Modal>
</div>


```

This will render a modal dialog with a title and content. The modal will fade in and out when shown or hidden, and will be centered in the viewport. The amount of padding on the left and right sides of the modal content can be customized, and the modal can be made scrollable or full screen if desired.



