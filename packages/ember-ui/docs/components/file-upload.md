# File Upload Component

This is a reusable File Upload component built with Ember.js. It provides a customizable UI element that allows users to select and upload files.

## Usage

To use the File Upload component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

{{#let (file-queue name=@name onFileAdded=@onFileAdded) as |queue|}}
    <label class="file-upload">
        <input type="file" accept={{@accept}} hidden={{or @hidden true}} {{queue.selectFile}}>
        {{yield queue}}
    </label>
{{/let}}

```

You can customize the File Upload component by passing in different props:

| Parameter   | Description                                                                                              |
|-------------|----------------------------------------------------------------------------------------------------------|
| `name`        | The name of the file queue.                                                                              |
| `accept`      | The file types that are allowed to be uploaded.                                                          |
| `hidden`      | Whether or not to hide the file input element.                                                           |
| `onFileAdded` | A function that will be called when a file is added to the queue. This function receives the added file. |

## Example

```hbs


{{#let (file-queue name=@name onFileAdded=@onFileAdded) as |queue|}}
    <label class="file-upload">
        <input type="file" accept={{@accept}} hidden={{or @hidden true}} {{queue.selectFile}}>
        {{#if queue.files.length}}
            <ul>
                {{#each queue.files as |file|}}
                    <li>{{file.name}}</li>
                {{/each}}
            </ul>
        {{else}}
            <p>No files selected</p>
        {{/if}}
    </label>
{{/let}}



```

This will render a file input element that allows users to select files for upload. When a file is selected, the onFileAdded function will be called with the selected file as a parameter. The selected files will also be displayed in an unordered list below the file input element. If no files have been selected, a message will be displayed indicating that no files have been selected.
