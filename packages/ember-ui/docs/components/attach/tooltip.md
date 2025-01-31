# Popover Component

This is a reusable Popover component built with Ember.js. 

It provides a customizable UI element that allows users to display content in a popover.

## Usage

To use the Popover component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<Attach::Popover @classNames="ember-attacher-tooltip" @ariaRole="tooltip" @renderInPlace={{true}} @placement="bottom" @arrow={{true}} @offset={{10}} @shiftOptions={{hash}} @animation="fade" @hideOn="mouseleave" @showOn="mouseenter" @interactive={{false}} @isShown={{true}} @lazyRender={{true}} @showDelay={{100}} @showDuration={{200}} @transitionDuration={{300}} ...attribute>
  {{yield}}
</Attach::Popover>

```

You can customize the Popover component by passing in different props:


| Option | Description |
| ------ | ----------- |
| `classNames` | Additional class names to apply to the Popover. |
| `ariaRole` | The ARIA role of the Popover. |
| `renderInPlace` | Whether to render the Popover inside the parent element or at the end of the body. |
| `placement` | The placement of the Popover relative to the target element. |
| `arrow` | Whether to display an arrow on the Popover pointing to the target element. |
| `offset` | The offset of the Popover from the target element. |
| `shiftOptions` | Additional options to shift the position of the Popover. |
| `animation` | The animation to use when showing and hiding the Popover. |
| `hideOn` | The event on which to hide the Popover. |
| `showOn` | The event on which to show the Popover. |
| `interactive` | Whether the Popover is interactive or not. |
| `isShown` | Whether the Popover is initially shown or not. |
| `lazyRender` | Whether to render the Popover lazily. |
| `showDelay` | The delay before showing the Popover. |
| `showDuration` | The duration of the show animation. |
| `transitionDuration` | The duration of the transition between show and hide. |


## Example

```hbs

<div class="relative">
  <button {{on "mouseenter"}} {{on "focus"}} {{on "blur"}} {{on "mouseleave"}}>
    Hover over me!
  </button>

  <Attach::Popover @classNames="ember-attacher-tooltip" @ariaRole="tooltip" @renderInPlace={{true}} @placement="bottom" @arrow={{true}} @offset={{10}} @shiftOptions={{hash}} @animation="fade" @hideOn="mouseleave" @showOn="mouseenter" @interactive={{false}} @isShown={{true}} @lazyRender={{true}} @showDelay={{100}} @showDuration={{200}} @transitionDuration={{300}} ...attribute>
    This is some content in a Popover!
  </Attach::Popover>
</div>

```

This will render a button with the text "Hover over me!". 

When the user hovers over the button, a Popover will be displayed with the text "This is some content in a Popover!". 

The Popover will be positioned below the button, with an arrow pointing to it.
