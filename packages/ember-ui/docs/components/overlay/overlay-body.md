# Next-Content-Overlay-Panel-Body Component

This is a reusable Next-Content-Overlay-Panel-Body component built with Ember.js. It provides a customizable UI element that wraps its children, and increases its height based on the specified @increaseInnerBodyHeightBy value.

## Usage

To use the Next-Content-Overlay-Panel-Body component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<div class="next-content-overlay-panel-body" {{attributes}}>
    <div class="next-content-overlay-panel-body-inner-wrapper {{wrapperClass}}" {{increase-height-by increaseInnerBodyHeightBy}}>{{yield}}</div>
</div>

```

You can customize the Next-Content-Overlay-Panel-Body component by passing in different props:

| Parameter                 | Description                                                   |
|---------------------------|---------------------------------------------------------------|
| `wrapperClass`              | Adds a class to the div wrapping the yielded content.         |
| `increaseInnerBodyHeightBy` | Increases the height of the component by the specified value. |

## Example

```hbs

<div class="next-content-overlay-panel-body" data-test-id="panel-body">
    <div class="next-content-overlay-panel-body-inner-wrapper {{wrapperClass}}" {{increase-height-by increaseInnerBodyHeightBy}}>
        {{yield}}
    </div>
</div>


```

This will render a div with the class next-content-overlay-panel-body, and a child div with the class next-content-overlay-panel-body-inner-wrapper. You can pass in the wrapperClass prop to add additional classes to the inner wrapper. The increaseInnerBodyHeightBy prop will increase the height of the component by the specified value. The children of the Next-Content-Overlay-Panel-Body component can be added within the yield block.


