# BasicDropdown Component

The BasicDropdown component is a reusable dropdown UI element built with Ember.js.

## Usage

To use the BasicDropdown component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<BasicDropdown
    @defaultClass={{@wrapperClass}}
    @onOpen={{@onOpen}}
    @onClose={{@onClose}}
    @verticalPosition={{@verticalPosition}}
    @horizontalPosition={{@horizontalPosition}}
    @renderInPlace={{or @renderInPlace true}}
    @initiallyOpened={{@initiallyOpened}}
    as |dd|
>
    <dd.Trigger class={{@triggerClass}}>
        {{yield dd}}
    </dd.Trigger>
    <dd.Content class={{@contentClass}}>
        <div class="next-dd-menu {{@dropdownMenuClass}} {{if dd.isOpen 'is-open'}}">
            {{#each @items as |item|}}
                <Layout::Header::Dropdown::Item @item={{item}} @onAction={{fn this.onAction dd}} />
            {{/each}}
        </div>
    </dd.Content>
</BasicDropdown>

```

You can customize the Click-to-Reveal component by passing in different props:


| Option             | Description                                                                                                   |
|--------------------|---------------------------------------------------------------------------------------------------------------|
| `defaultClass`       | A CSS class to add to the component wrapper element                                                           |
| `onOpen`             | A function that will be called when the dropdown is opened                                                    |
| `onClose`            | A function that will be called when the dropdown is closed                                                    |
| `verticalPosition`   | The vertical position of the dropdown relative to its trigger (e.g. "above", "below")                         |
| `horizontalPosition` | The horizontal position of the dropdown relative to its trigger (e.g. "left", "right")                        |
| `renderInPlace`      | Whether to render the dropdown's content in place, or append it to the end of the document (defaults to true) |
| `initiallyOpened`    | Whether the dropdown should be open by default                                                                |
| `triggerClass`       | A CSS class to add to the trigger element                                                                     |
| `contentClass`       | A CSS class to add to the dropdown content element                                                            |
| `dropdownMenuClass`  | A CSS class to add to the dropdown menu element                                                               |
| `items`              | An array of items to display in the dropdown menu                                                             |
| `onAction`           | A function that will be called when an item is selected in the dropdown menu                                  |

## Example

```hbs

<BasicDropdown
    @defaultClass="my-dropdown"
    @onOpen={{this.onOpen}}
    @onClose={{this.onClose}}
    @verticalPosition="above"
    @horizontalPosition="left"
    @initiallyOpened={{false}}
    @triggerClass="dropdown-trigger"
    @contentClass="dropdown-content"
    @dropdownMenuClass="dropdown-menu"
    @items={{this.items}}
    @onAction={{this.handleAction}}
    as |dd|
>
    <dd.Trigger>
        Click me!
    </dd.Trigger>
</BasicDropdown>


```

This will render a clickable trigger element with the text "Click me!".

When the user clicks on it, the dropdown menu will open above and to the left of the trigger element.

The menu will contain a list of items from the items array, and when the user clicks on an item, the `handleAction` function will be called with the selected item as an argument.



