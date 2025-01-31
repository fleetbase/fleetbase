# Next View Section Subheader Component

The Next View Section Subheader Component is a reusable component built with Ember.js. It provides a customizable UI element that can be used as a subheader for a view section. It can include a title, subtitle, icon, search input, and actions.

## Usage

To use the Next View Section Subheader Component, you can simply import it into your Ember component and include it in your template as follows:


```hbs

<NextViewSectionSubheader
    @title="My Title"
    @subtitle="My Subtitle"
    @icon="icon-name"
    @onSearch={{this.handleSearch}}
>
    <!-- actions here -->
</NextViewSectionSubheader>

```

You can customize the Next View Section Subheader Component by passing in different props:

| `Property             | Description                                                         |
|-----------------------|---------------------------------------------------------------------|
| `title`                | The main title to display in the subheader.                         |
| `subtitle`            | An optional subtitle to display below the main title.               |
| `icon`                | An optional icon to display to the left of the title.               |
| `onSearch`            | A function to call when the user types into the search input.       |
| `searchQuery`         | The current value of the search input.                              |
| `searchPlaceholder`   | An optional placeholder to display in the search input.             |
| `hideActions`         | Whether or not to hide the actions section of the subheader.        |
| `leftSubheaderClass`  | An optional class to apply to the left section of the subheader.    |
| `searchInputClass`    | An optional class to apply to the search input.                     |
| `actionsWrapperClass` | An optional class to apply to the actions section of the subheader. |

## Example

```hbs

<NextViewSectionSubheader
    @title="My Title"
    @subtitle="My Subtitle"
    @icon="icon-name"
    @onSearch={{this.handleSearch}}
>
    {{#if @showAddButton}}
        <button {{on "click" this.handleAdd}}>Add</button>
    {{/if}}
    <!-- additional actions here -->
</NextViewSectionSubheader>

```

This will render a subheader with a title, subtitle, and optional icon to the left. If the onSearch prop is provided, a search input will be displayed to the right of the title. If the hideActions prop is not provided, any content passed into the component using the block form ({{yield}}) will be displayed in the actions section. In this example, if showAddButton is true, an "Add" button will be displayed in the actions section.


