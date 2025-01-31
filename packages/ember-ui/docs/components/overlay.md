# Overlay Component

## Usage

To use the Overlay component, you can include it in your template as follows:

```hbs

<Overlay @position="right" @noBackdrop={{true}} @outView={{true}} @fullHeight={{false}} @overlayClass="my-overlay-class" @containerClass="my-container-class" @width="600px" @isResizable={{true}}>
  {{!-- Your overlay content --}}
</Overlay>

```

You can customize the Overlay component by passing in different props:


| Property       | Description                                                             |
|----------------|-------------------------------------------------------------------------|
| `noBackdrop`     | Whether or not to show a backdrop behind the overlay panel.             |
| `outView`        | Whether or not to move the overlay panel out of view when it is closed. |
| `fullHeight`     | Whether or not to make the overlay panel full height.                   |
| `overlayClass`   | The CSS class name to be applied to the outer overlay element.          |
| `containerClass` | The CSS class name to be applied to the container element.              |
| `width`          | The width of the overlay panel.                                         |
| `isResizable`    | Whether or not the overlay panel can be resized.                        |

## Example

```hbs

{{!-- Your template --}}
<button {{on "click" (fn this.toggleOverlay true)}}>Open Overlay</button>

{{#if this.showOverlay}}
  <Overlay @position="right" @noBackdrop={{true}} @isResizable={{true}} @isMaximizable={{true}} @isMinimizable={{true}} @fullHeight={{true}} as |overlay|>
    <Overlay::Header @title="Hello" @onPressCancel={{this.transitionBack}} />
    <Overlay::Body>
        <h3>Hello World</h3>
    </Overlay::Body>
  </Overlay>
{{/if}}

{{!-- Your template --}}

```

This will render a button that will toggle the overlay panel when clicked. 

The overlay panel will have a position of "right", a backdrop behind it, a width of 600px, and will be resizable. 

The content of the overlay panel will be the div element provided as a yield block.
