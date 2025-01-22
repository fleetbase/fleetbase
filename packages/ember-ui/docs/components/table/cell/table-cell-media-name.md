# Click-to-Reveal Component

This is a reusable Click-to-Reveal component built with Ember.js. It provides a customizable UI element that allows users to reveal hidden content with a single click, and optionally copy the content to their clipboard.

## Usage

To use the Click-to-Reveal component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<ClickToReveal @value="Value to be revealed" />

```

You can customize the Click-to-Reveal component by passing in different props:

| Property Name       | Description                                                |
|---------------------|------------------------------------------------------------|
| `value`               | The value to be revealed.                                  |
| `mediaUrl`            | The URL of an image to display next to the revealed value. |
| `altText`             | The alt text for the image.                                |
| `onClick`             | A function to be called when the reveal button is clicked. |
| `showOnlineIndicator` | Whether or not to show an indicator of online status.      |
| `hasOnline`           | Whether or not the component has an online status.         |
| `row`                 | The current row of data.                                   |
| `column`              | The current column of data.                                |

## Example

```hbs


<div class="flex items-center">
    <ClickToReveal @value="Some value to be revealed" @mediaUrl="https://example.com/image.jpg" @altText="Image Alt Text" @onClick={{fn this.someFunction}} @showOnlineIndicator={{true}} @hasOnline={{false}} @row={{this.rowData}} @column={{this.columnData}} />
</div>


```

This will render a clickable element with an image displayed to the left of the value. When the user clicks on it, the value "Some value to be revealed" will be revealed, and a button will appear allowing them to hide the revealed value. If @showOnlineIndicator is set to true, an online status indicator will also be displayed. The onClick function will be called when the reveal button is clicked.
