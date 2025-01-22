# ModelSelect Component

This is a reusable ModelSelect component built with Ember.js. 

It provides a customizable UI element that allows users to select a model from a dropdown menu and perform various actions with it.

## Usage

To use the ModelSelect component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<ModelSelect 
  @modelName="my-model"
  @selectedModel={{this.selectedModel}}
  @optionLabel="name"
  @searchProperty="name"
  @loadDefaultOptions={{true}}
  @infiniteScroll={{false}}
  @pageSize={{10}}
  @query={{this.query}}
  @withCreate={{false}}
  @buildSuggestion={{this.buildSuggestion}}
  @perPageParam="page[size]"
  @pageParam="page[number]"
  @totalPagesParam="meta.total-pages"
  @onCreate={{this.onCreate}}
>
  {{get model "name"}}
</ModelSelect>

```

You can customize the ModelSelect component by passing in different props:

| Parameters               | Description                                                                |
|--------------------|----------------------------------------------------------------------------|
| `modelName`          | The name of the model to be selected.                                      |
| `selectedModel`      | The currently selected model.                                              |
| `labelProperty`     | The property to be displayed as the label for each option in the dropdown. |
| `searchProperty`     | The property to be used for searching options.                             |
| `loadDefaultOptions` | Whether or not to load default options.                                    |
| `infiniteScroll`     | Whether or not to enable infinite scroll.                                  |
| `pageSize`           | The number of items to be displayed per page.                              |
| `query`              | The query to be used for fetching options.                                 |
| `withCreate`         | Whether or not to enable the creation of new options.                      |
| `buildSuggestion`    | A function that returns an option suggestion.                              |
| `perPageParam`       | The name of the parameter to be used for pagination.                       |
| `pageParam`          | The name of the parameter to be used for pagination.                       |
| `totalPagesParam`    | The name of the parameter to be used for pagination.                       |
| `onCreate`           | A function to be called when a new option is created.                      |

## Example

```hbs

<div class="flex items-center">
  <ModelSelect 
    @modelName="user"
    @selectedModel={{this.selectedUser}}
    @optionLabel="name"
    @searchProperty="name"
    @loadDefaultOptions={{true}}
    @infiniteScroll={{false}}
    @pageSize={{10}}
    @query={{this.query}}
    @withCreate={{false}}
    @buildSuggestion={{this.buildSuggestion}}
    @perPageParam="page[size]"
    @pageParam="page[number]"
    @totalPagesParam="meta.total-pages"
    @onCreate={{this.onCreate}}
  >
    {{get model "name"}}
  </ModelSelect>
</div>


```

This will render a dropdown menu with a list of options for selecting a user. 

When an option is selected, it will be displayed as the currently selected user. 

The user can search for options by typing into the search field, and can create a new option if the withCreate prop is set to true. 

Additionally, if the `loadDefaultOptions` prop is set to true, default options will be loaded on component mount.

