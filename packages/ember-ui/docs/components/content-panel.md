# Next Content Panel Component

The `next-content-panel` component is a UI element that can be used to display content that can be toggled open or closed. It is built with Ember.js and utilizes the FontAwesome library for icons.

## Usage

```hbs

{{next-content-panel
  title="Example Panel"
  isOpen=true
  isLoading=false
  actionButtons=(array
    (hash
      type="primary"
      text="Action Button 1"
      icon="plus-circle"
      iconPrefix="fas"
      onClick=(action "actionButton1Clicked")
    )
    (hash
      type="secondary"
      text="Action Button 2"
      icon="edit"
      iconPrefix="fas"
      onClick=(action "actionButton2Clicked")
    )
  )
}}
  {{!-- Content to display in panel body goes here --}}
{{/next-content-panel}}


```

The `next-content-panel` component has several configurable options that can be passed as parameters. These include:

| Prop                            | Type     | Description                                                                                                        |
|---------------------------------|----------|--------------------------------------------------------------------------------------------------------------------|
| wrapperClass                    | string   | CSS class to apply to the wrapper element of the component.                                                        |
| isLoading                       | boolean  | Flag that indicates whether the component is currently loading or not.                                             |
| containerClass                  | string   | CSS class to apply to the container element of the component.                                                      |
| isOpen                          | boolean  | Flag that indicates whether the component is currently open or not.                                                |
| panelClass                      | string   | CSS class to apply to the panel element of the component.                                                          |
| panelHeaderClass                | string   | CSS class to apply to the header of the panel element.                                                             |
| panelHeaderLeftClass            | string   | CSS class to apply to the left part of the header of the panel element.                                            |
| toggle                          | function | Function to toggle the component between open and closed states.                                                   |
| title                           | string   | Title to display in the panel header.                                                                              |
| prefixTitle                     | string   | Optional prefix to display before the title in the panel header.                                                   |
| prefixTitleContainerClass       | string   | CSS class to apply to the container element of the prefix title in the panel header.                               |
| titleContainerClass             | string   | CSS class to apply to the container element of the title in the panel header.                                      |
| titleStatus                     | string   | Optional status to display next to the title in the panel header.                                                  |
| hideStatusDot                   | boolean  | Flag that indicates whether to hide the dot next to the title status in the panel header.                          |
| titleStatusContainerClass       | string   | CSS class to apply to the container element of the title status in the panel header.                               |
| panelTitleClass                 | string   | CSS class to apply to the title element in the panel header.                                                       |
| panelHeaderRightClass           | string   | CSS class to apply to the right part of the header of the panel element.                                           |
| prefixTitleRight                | string   | Optional prefix to display on the right side of the panel header.                                                  |
| prefixTitleRightContainerClass  | string   | CSS class to apply to the container element of the prefix title on the right side of the panel header.             |
| titleStatusRight                | string   | Optional status to display on the right side of the panel header.                                                  |
| titleStatusRightContainerClass  | string   | CSS class to apply to the container element of the title status on the right side of the panel header.             |
| disableTitleStatusRightHumanize | boolean  | Flag that indicates whether to disable the humanization of the title status on the right side of the panel header. |
| titleStatusRightClass           | string   | CSS class to apply to the title status on the right side of the panel header.                                      |
| actionButtons                   | array    | Array of objects representing action buttons to display on the right side of the panel header.                     |
| type                            | string   | Type of the action button (e.g. "primary", "secondary").                                                           |
| text                            | string   | Text to display on the action button.                                                                              |
| icon                            | string   | Name of the icon to display on the action button (e.g. "edit", "delete").                                          |
| iconPrefix                      | string   | Optional prefix for the icon on the action button (e.g. "fas", "far").                                             |
| onClick                         | function | Function to call when the action button is clicked.                                                                |
| panelBodyClass                  | string   | CSS class to apply                                                                                                 |



## Example

```hbs

{{!-- Example usage of the Next Content Panel component --}}
{{#next-content-panel
    @title="Example Panel"
    @panelClass="bg-white shadow-lg"
    @panelHeaderClass="bg-gray-100"
    @panelBodyClass="p-4"
}}
    {{!-- Content goes here --}}
    <p>This is an example of the Next Content Panel component.</p>
    <p>You can put any content you want inside the body of the panel.</p>
{{/next-content-panel}}


```

This code will generate a panel with a gray header, a white background, and a shadow. The title of the panel is "Example Panel", and the body contains two paragraphs of text. You can customize the appearance of the panel using the various classes and properties available in the component.







