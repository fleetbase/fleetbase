# ModelSelect Component

This is a reusable ModelSelect component built with Ember.js. It provides a customizable UI element that allows users to select a model from a list and apply filters.


## Usage

To use the ModelSelect component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

  <ModelSelect @modelName={{@filter.model}} @optionLabel={{or @filter.modelNamePath "name"}} @selectedModel={{this.selectedModel}} @placeholder={{@placeholder}} @triggerClass="form-select form-input form-input-sm flex-1" @infiniteScroll={{false}} @renderInPlace={{true}} @onChange={{this.onChange}} @allowClear={{true}} @onClear={{this.clear}} />

```

You can customize the ModelSelect component by passing in different props:

| Option           | Description                                                                  |
| ---------------- | ---------------------------------------------------------------------------- |
| `modelName`      | The name of the model to select from.                                         |
| `labelProperty`  | The property to display for each option.                                     |
| `selectedModel`  | The currently selected model.                                                |
| `placeholder`    | The text to display as a placeholder.                                        |
| `triggerClass`   | The CSS class to apply to the trigger element.                               |
| `infiniteScroll` | Whether to use infinite scrolling or pagination.                             |
| `renderInPlace`  | Whether to render the dropdown in place or as a separate element.            |
| `onChange`       | A function to call when the selection changes.                               |
| `allowClear`     | Whether to allow clearing the selection.                                     |
| `onClear`        | A function to call when the selection is cleared.                            |


## Example

```hbs

  <ModelSelect @modelName={{@filter.model}} @optionLabel={{or @filter.modelNamePath "name"}} @selectedModel={{this.selectedModel}} @placeholder={{@placeholder}} @triggerClass="form-select form-input form-input-sm flex-1" @infiniteScroll={{false}} @renderInPlace={{true}} @onChange={{this.onChange}} @allowClear={{true}} @onClear={{this.clear}} />

```

This will render a select element with options based on the provided model name and label property. The selected value will be stored in the selectedModel property, and the onChange function will be called whenever the selection changes. The user can also clear the selection by clicking on the clear button, which will call the onClear function.
