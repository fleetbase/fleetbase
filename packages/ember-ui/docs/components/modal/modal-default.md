# Modal Component

This is a reusable Modal component built with Ember.js. 

It provides a customizable UI element that allows users to display content in a popup modal.

## Usage

To use the Modal component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<Modal @modalIsOpened={{this.isModalOpen}} @onClose={{this.decline}} @onSubmit={{this.confirm}}>
  <Modal::Header @onClose={{modal.close}}>
    <Modal::Header::Title>
      Your Modal Title
    </Modal::Header::Title>
  </Modal::Header>
  <Modal::Body>
    Your Modal Content
  </Modal::Body>
  <Modal::Footer>
    <Button @text="Cancel" @onClick={{modal.close}} />
    <Button @text="Confirm" @onClick={{modal.submit}} />
  </Modal::Footer>
</Modal>

```

You can customize the Modal component by passing in different options:


| Property                | Description                                                                                      |
|-------------------------|--------------------------------------------------------------------------------------------------|
| `modalClass`              | The CSS class to apply to the modal element.                                                     |
| `modalHeaderClass`        | The CSS class to apply to the modal header element.                                              |
| `title`                   | The title text to display in the modal header.                                                   |
| `titleComponent`          | The component to use for the modal header title (overrides title).                               |
| `modalHeaderTitleClass`   | The CSS class to apply to the modal header title element.                                        |
| `modalBodyClass`          | The CSS class to apply to the modal body element.                                                |
| `bodyComponent`           | The component to use for the modal body content.                                                 |
| `modalFooterClass`        | The CSS class to apply to the modal footer element.                                              |
| `footerComponent`         | The component to use for the modal footer content.                                               |
| `declineButtonScheme`     | The color scheme to use for the decline button (e.g. default, primary, secondary, danger, etc.). |
| `declineButtonIcon`       | The icon to display on the decline button (e.g. close).                                          |
| `declineButtonIconPrefix` | The icon prefix to use for the decline button icon (e.g. fas, far, fal, etc.).                   |
| `declineButtonText`       | The text to display on the decline button.                                                       |
| `declineButtonDisabled`   | Whether or not the decline button is disabled.                                                   |
| `acceptButtonScheme`      | The color scheme to use for the accept button (e.g. default, primary, secondary, danger, etc.).  |
| `acceptButtonIcon`        | The icon to display on the accept button (e.g. check).                                           |
| `acceptButtonIconPrefix`  | The icon prefix to use for the accept button icon (e.g. fas, far, fal, etc.).                    |
| `acceptButtonText`        | The text to display on the accept button.                                                        |
| `acceptButtonDisabled`    | Whether or not the accept button is disabled.                                                    |
| `buttonSize`              | The size of the buttons (e.g. sm, md, lg).                                                       |
| `isLoading`               | Whether or not the buttons are in a loading state.                                               |
| `hideDeclineButton`       | Whether or not to hide the decline button.                                                       |
| `hideAcceptButton`        | Whether or not to hide the accept button.                                                        |

## Example

```hbs

<Modal @modalIsOpened={{this.isModalOpen}} @onClose={{this.decline}} @onSubmit={{this.confirm}} @options={{hash
  title="Your Modal Title"
  bodyComponent="YourModalBodyComponent"
  footerComponent="YourModalFooterComponent"
  declineButtonText="Cancel"
  acceptButtonText="Confirm"
  isLoading=this.isLoading
}}>
</Modal>

```


