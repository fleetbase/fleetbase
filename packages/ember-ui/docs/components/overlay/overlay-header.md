# Next Content Overlay Panel Component

This is a reusable Next Content Overlay Panel component built with Ember.js. It provides a customizable UI element that allows users to display a panel over the content with various functionalities.

## Usage

To use the Next Content Overlay Panel component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<NextContentOverlayPanel 
    @title="Panel Title"
    @status="Panel Status"
    @createdAt="Panel Creation Time"
    @headerLeftClass="Custom Header Left Class"
    @actionsWrapperClass="Custom Actions Wrapper Class"
    @maximizeButtonClass="Custom Maximize Button Class"
    @minimizeButtonClass="Custom Minimize Button Class"
    @cancelButtonClass="Custom Cancel Button Class"
    @iconClass="Custom Icon Class"
    @iconSize="Custom Icon Size"
    @iconPrefix="Custom Icon Prefix"
    @maximizeButtonHeight="Custom Maximize Button Height"
    @maximizeButtonWidth="Custom Maximize Button Width"
    @minimizeButtonHeight="Custom Minimize Button Height"
    @minimizeButtonWidth="Custom Minimize Button Width"
    @cancelButtonHeight="Custom Cancel Button Height"
    @cancelButtonWidth="Custom Cancel Button Width"
    @dispatched={{true}}
    @overlay={{hash isMinimized=true onMaximize=(action "onMaximize") onMinimize=(action "onMinimize")}}
    @onPressCancel={{action "onPressCancel"}}
>
    Panel Body Content
</NextContentOverlayPanel>

```

You can customize the Next Content Overlay Panel component by passing in different props:

| Property             | Description                                                                               |
|----------------------|-------------------------------------------------------------------------------------------|
| `title`                | The title of the panel.                                                                   |
| `status`               | The status of the panel.                                                                  |
| `createdAt`            | The creation time of the panel.                                                           |
| `headerLeftClass`      | Custom class for the left section of the panel header.                                    |
| `actionsWrapperClass`  | Custom class for the right section of the panel header.                                   |
| `maximizeButtonClass`  | Custom class for the maximize button.                                                     |
| `minimizeButtonClass`  | Custom class for the minimize button.                                                     |
| `cancelButtonClass`    | Custom class for the cancel button.                                                       |
| `iconClass`            | Custom class for the icons used in the buttons.                                           |
| `iconSize`             | Custom size for the icons used in the buttons.                                            |
| `iconPrefix`           | Custom prefix for the icons used in the buttons.                                          |
| `maximizeButtonHeight` | Custom height for the maximize button.                                                    |
| `maximizeButtonWidth`  | Custom width for the maximize button.                                                     |
| `minimizeButtonHeight` | Custom height for the minimize button.                                                    |
| `minimizeButtonWidth`  | Custom width for the minimize button.                                                     |
| `cancelButtonHeight`   | Custom height for the cancel button.                                                      |
| `cancelButtonWidth`    | Custom width for the cancel button.                                                       |
| `dispatched`           | Whether or not the panel has been dispatched.                                             |
| `overlay`              | An object containing the state of the overlay (e.g. isMinimized, onMaximize, onMinimize). |
| `onPressCancel`        | A function that will be called when the cancel button is pressed.                         |

## Example

```hbs

<NextContentOverlayPanel @title="My Panel Title" @status="created">
  <button type="button" class="next-content-overlay-panel-close-button" {{on "click" this.cancel}}>
    <FaIcon @icon="times" @size="lg" @prefix="fas" />
  </button>
  <div class="p-6">
    <p>This is the content of my panel.</p>
  </div>
</NextContentOverlayPanel>


```

This will render a content overlay panel with the title "My Panel Title" and a status badge with the text "Created". It will also display a close button on the top right corner, and the content of the panel will be a paragraph with the text "This is the content of my panel."


