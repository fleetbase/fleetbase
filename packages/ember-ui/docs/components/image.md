# Image Component

This is a reusable Image component built with Ember.js. It provides an easy-to-use way to display images with optional error handling.

## Usage

To use the Image component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<Image src="/path/to/image.jpg" alt="Image description" />

```

You can customize the Image component by passing in different props:

| Property | Description                                                         |
|----------|---------------------------------------------------------------------|
| `src`      | The path to the image file.                                         |
| `alt`      | The alternative text to be displayed if the image cannot be loaded. |
| `onError`  | A function to be called if the image fails to load.                 |


## Example

```hbs

<div class="image-wrapper">
  <Image src="/path/to/image.jpg" alt="Image description" {{on "error" this.onImageError}} />
</div>

```

This will render an image element with the specified source and alternative text. 

If the image fails to load, the `onError` function will be called. 

You can use this function to handle errors, such as displaying a placeholder image or showing an error message.


