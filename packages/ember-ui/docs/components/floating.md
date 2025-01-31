# Floating Component

This is a reusable Floating component built with Ember.js. It provides a customizable UI element that can be displayed in a floating container.

## Usage

To use the Floating component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<Floating @ariaRole="dialog" @placement="bottom-start" @renderInPlace={{true}}>
    <p>Your content here.</p>
</Floating>

```

You can customize the Floating component by passing in different props:

| Name           | Description                                                                   |
|----------------|-------------------------------------------------------------------------------|
| `@ariaRole`      | The ARIA role for the floating component.                                     |
| `@placement`     | The placement of the floating component relative to its trigger.              |
| `@renderInPlace` | Whether to render the floating component in place or in a separate container. |

## Example

```hbs

<div>
    <button {{on "click" this.toggleFloating}}>Toggle Floating</button>

    {{#if this.showFloating}}
        <div class="floating--parent-finder" {{did-insert this.findParent}} />
        {{#if this.floatingContainer}}
            {{#in-element this.floatingContainer insertBefore=null}}
                <Floating @ariaRole="dialog" @placement="bottom-start" @renderInPlace={{true}}>
                    <p>Your content here.</p>
                </Floating>
            {{/in-element}}
        {{/if}}
    {{/if}}
</div>


```

This will render a button labeled "Toggle Floating". When the user clicks on it, the Floating component will be displayed. 

The content of the floating component can be customized by passing in child elements. 

By default, the Floating component will be rendered in place, but you can also choose to render it in a separate container by setting `@renderInPlace` to false. 

The placement of the floating component can be set using the `@placement prop`, and the ARIA role can be set using the `@ariaRole` prop.
