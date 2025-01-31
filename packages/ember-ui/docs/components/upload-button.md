# FileUpload Component


This is a reusable FileUpload component built with Ember.js. 

It provides a customizable UI element that allows users to select and upload files, with an optional upload progress indicator.

## Usage

To use the Click-to-Reveal component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<FileUpload @name={{@name}} @accept={{@accept}} @onFileAdded={{@onFileAdded}} as |queue|>
    <a tabindex={{0}} class="flex items-center px-0 mt-2 text-xs no-underline truncate cursor-pointer btn {{if @outline 'btn-outline'}} btn-{{or @type 'default'}} btn-{{or @size 'sm'}}" ...attributes>
        {{#if queue.files.length}}
            <Spinner class="mr-1" />
            <span>
                Uploading...
            </span>
        {{else}}
            <FaIcon @icon={{or @uploadIcon "image"}} class="mr-1" />
            <span>
                {{or @buttonText "Upload new"}}
            </span>
        {{/if}}
    </a>
</FileUpload>

```

You can customize the FileUpload component by passing in different props:

| Prop          | Description                                                                                                         |
|---------------|---------------------------------------------------------------------------------------------------------------------|
| `name`          | The name attribute of the file input element.                                                                       |
| `accept`        | The accepted file types, specified as a comma-separated list of MIME types or file extensions.                      |
| `onFileAdded`   | A callback function that will be called when a file is added to the upload queue.                                   |
| `buttonText`    | The text to be displayed on the upload button.                                                                      |
| `uploadIcon`    | The icon to be displayed on the upload button.                                                                      |
| `outline`       | Whether or not to display an outline around the upload button.                                                      |
| `type`          | The type of button to be used, e.g. "primary" or "danger".                                                          |
| `size`         | The size of the upload button, e.g. "sm" or "lg".                                                                   |
| `...attributes` | Any additional HTML attributes to be passed to the component. These attributes will be added to the button element. |

## Example

```hbs

<FileUpload @name="file" @accept="image/*" @onFileAdded={{this.handleFileAdded}} as |queue|>
    <a tabindex={{0}} class="flex items-center px-0 mt-2 text-xs no-underline truncate cursor-pointer btn btn-outline-primary btn-sm" ...attributes>
        {{#if queue.files.length}}
            <Spinner class="mr-1" />
            <span>
                Uploading...
            </span>
        {{else}}
            <FaIcon @icon="cloud-upload-alt" class="mr-1" />
            <span>
                Upload new image
            </span>
        {{/if}}
    </a>
</FileUpload>

```

This will render a clickable element with the text "Upload new image" and a cloud upload icon. 

When the user clicks on it, a file dialog will be displayed allowing them to select a file. 

After selecting a file, the text on the upload button will change to "Uploading..." and a spinner icon will be displayed until the file is successfully uploaded. If the upload fails, an error message will be displayed and the user can try again. 

The accepted file types are limited to image files only, and when a file is added to the queue, the handleFileAdded function will be called.
