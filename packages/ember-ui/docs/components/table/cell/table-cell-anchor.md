# Clickable Anchor Component

This is a reusable Clickable Anchor component built with Ember.js. It provides a customizable UI element that allows users to click on a link and trigger an action, while optionally disabling the link and providing a default value for the link text.


## Usage

To use the Clickable Anchor component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<ClickableAnchor 
    @onClick={{this.myOnClick}} 
    @disabled={{this.isDisabled}} 
    @value={{this.linkText}} 
    @anchorSpanClassnames={{this.spanClass}} 
/>

```

You can customize the Clickable Anchor component by passing in different props:

| Property Name        | Description                                                                                                 |
|----------------------|-------------------------------------------------------------------------------------------------------------|
| `onClick`              | The action to be triggered when the link is clicked.                                                        |
| `disabled`             | Whether or not the link should be disabled.                                                                 |
| `value`                | The text to be displayed in the link. If a value is not provided, a default value of "-" will be displayed. |
| `anchorSpanClassnames` | A list of CSS class names to be applied to the link text span.                                              |

If a block is provided, its contents will be used as the link text.


## Example

```hbs

{{#let (hash 
  myOnClick=(action "doSomething") 
  isDisabled=true 
  linkText="My Link" 
  spanClass="my-span-class"
) as |ctx|}}

  <ClickableAnchor 
    @onClick={{ctx.myOnClick}} 
    @disabled={{ctx.isDisabled}} 
    @value={{ctx.linkText}} 
    @anchorSpanClassnames={{ctx.spanClass}} 
  />

{{/let}}

```

This will render a clickable anchor with the text "My Link". If isDisabled is true, the link will be disabled. If onClick is provided, the action "doSomething" will be triggered when the link is clicked. Additionally, the span containing the link text will have the class "my-span-class". If a block is provided, its contents will be used as the link text instead of the value prop.


