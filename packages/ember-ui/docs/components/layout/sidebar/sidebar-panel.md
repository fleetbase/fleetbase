# ContentPanel Component

This is a reusable Content Panel component that provides a collapsible panel with a header that can be clicked to toggle the panel's visibility. 

It is built with Ember.js and includes customizable classes to allow for easy styling.

## Usage

To use the ContentPanel component, you can import it into your Ember component and include it in your template as follows:

```hbs

<ContentPanel @title={{@title}} @open={{@open}} @wrapperClass="next-sidebar-panel-container" @containerClass="next-sidebar-panel" @panelHeaderClass="next-sidebar-panel-toggle">
    {{yield}}
</ContentPanel>

```

You can customize the Content Panel component by passing in different props:

| Property           | Description                                                     |
|--------------------|-----------------------------------------------------------------|
| `title`            | The title of the panel.                                         |
| `open`             | Whether or not the panel should be open by default.             |
| `wrapperClass`     | The class name for the container element that wraps the panel.  |
| `containerClass`   | The class name for the element that contains the panel content. |
| `panelHeaderClass` | The class name for the panel header element.                    |

## Example

```hbs

<ContentPanel @title={{@title}} @open={{@open}} @wrapperClass="next-sidebar-panel-container" @containerClass="next-sidebar-panel" @panelHeaderClass="next-sidebar-panel-toggle">
    <p>This is the content of the panel.</p>
</ContentPanel>

```

This will render a collapsible panel with the title "title". 

The panel will be open if `@open` is set to true, otherwise it will be closed. 

The content of the panel should be placed within the component's block. 

You can customize the appearance of the panel by setting the different class names.


