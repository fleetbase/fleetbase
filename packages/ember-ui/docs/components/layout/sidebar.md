# Next Sidebar Component

This is a reusable Next Sidebar component built with Ember.js. It provides a customizable UI element that allows users to display additional content in a sidebar.

## Usage

To use the Next Sidebar component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<nav class="next-sidebar" {{did-insert (fn this.setupNode "sidebar")}}>
    <div class="next-sidebar-content">
        {{yield}}
    </div>
    <div class="gutter" {{did-insert (fn this.setupNode "gutter")}} {{on "mousedown" this.startResize}}></div>
</nav>

```

You can customize the Next Sidebar component by passing in different props:

| Property | Description                                 |
|----------|---------------------------------------------|
| `yield`    | The content to be displayed in the sidebar. |

## Example

```hbs

<div>
  {{#next-sidebar}}
    <p>Content to display in the sidebar</p>
  {{/next-sidebar}}
</div>


```

This will render a sidebar element with the provided content inside. The user can resize the sidebar by dragging the gutter element.


