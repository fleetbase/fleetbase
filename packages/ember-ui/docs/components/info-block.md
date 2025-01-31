# UI Input Info Block Component

This is a reusable UI Input Info Block component built with Ember.js. It provides a customizable UI element that allows users to display additional information related to an input field or form.

## Usage

To use the UI Input Info Block component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<UiInputInfoBlock 
  @icon="info-circle" 
  @text="Additional information goes here" 
  @exampleText="Example text goes here"
/>

```

You can customize the UI Input Info Block component by passing in different props:

| Parameter        | Description                                                            |
|-------------|------------------------------------------------------------------------|
| `icon`        | The icon to be displayed in the UI Input Info Block component.         |
| `text`        | The text to be displayed in the UI Input Info Block component.         |
| `exampleText` | The example text to be displayed in the UI Input Info Block component. |
| `blockClass`  | The class to be added to the UI Input Info Block container element.    |
| `textClass`   | The class to be added to the UI Input Info Block text element.         |

You can also use block syntax to include more complex content in the UI Input Info Block component:

```hbs

<UiInputInfoBlock>
  <h3>Additional Information</h3>
  <p>This is some additional information about the input field or form.</p>
</UiInputInfoBlock>

```


## Example

```hbs

<div class="my-form-container">
  <label for="email">Email</label>
  <input type="email" id="email" name="email" />

  <UiInputInfoBlock 
    @icon="info-circle" 
    @text="Please enter a valid email address" 
    @blockClass="mt-1" 
    @textClass="text-red-600" 
  />
</div>

```

This will render an input field with a UI Input Info Block component below it. 

The UI Input Info Block component will display an information icon, the text "Please enter a valid email address", and an example email address in a monospace font. 

The UI Input Info Block component will have a margin-top of 1 and a text color of red.


