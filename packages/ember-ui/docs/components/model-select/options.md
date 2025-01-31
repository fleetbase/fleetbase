# PowerSelect Component

This is a customizable PowerSelect component built with Ember.js. It provides a highly configurable and powerful dropdown menu that can be used for selecting one or multiple items from a list of options.

## Usage

To use the PowerSelect component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<ul role="listbox" ...attributes>
    <li>
        <PowerSelect::Options 
            @loadingMessage={{@loadingMessage}} 
            @select={{@select}} 
            @options={{@options}} 
            @groupIndex={{@groupIndex}} 
            @optionsComponent={{@optionsComponent}} 
            @extra={{@extra}} 
            @highlightOnHover={{@highlightOnHover}} 
            @groupComponent={{@groupComponent}} 
            as |option select|
        >
            {{yield option select}}
        </PowerSelect::Options>
    </li>

    {{#if this.showLoader}}
        <li>
            <InfinityLoader 
                @infinityModel={{@infiniteModel}} 
                @hideOnInfinity={{true}} 
                @scrollable={{concat "#ember-basic-dropdown-content-" @select.uniqueId}}
            >
                <ModelSelect::Spinner />
            </InfinityLoader>
        </li>
    {{/if}}
</ul>

```

You can customize the PowerSelect component by passing in different props:

| Parameter        | Description                                                              |
|------------------|--------------------------------------------------------------------------|
| `loadingMessage`   | A message to be displayed when the dropdown is loading data.             |
| `select`           | A function to be called when an option is selected.                      |
| `options`          | An array of options to be displayed in the dropdown.                     |
| `groupIndex`       | The index of the property in the options object to group the options by. |
| `optionsComponent` | The component to use for rendering the options.                          |
| `extra`            | An object with extra properties to be passed to the options component.   |
| `highlightOnHover` | Whether or not to highlight the option when the user hovers over it.     |
| `groupComponent`   | The component to use for rendering the option groups.                    |
| `infiniteModel`    | The model to be used for the InfinityLoader.                             |
| `showLoader`       | Whether or not to show the InfinityLoader.                               |

## Example

```hbs

<ul role="listbox" ...attributes>
    <li>
        <PowerSelect::Options 
            @loadingMessage="Loading options..." 
            @select={{this.selectOption}} 
            @options={{this.options}} 
            @groupIndex="category" 
            @optionsComponent={{this.optionComponent}} 
            @extra={{hash showCount=true}} 
            @highlightOnHover={{true}} 
            @groupComponent={{this.groupComponent}} 
            as |option select|
        >
            {{option.name}}
        </PowerSelect::Options>
    </li>

    {{#if this.showLoader}}
        <li>
            <InfinityLoader 
                @infinityModel={{this.infiniteModel}} 
                @hideOnInfinity={{true}} 
                @scrollable={{concat "#ember-basic-dropdown-content-" this.select.uniqueId}}
            >
                <ModelSelect::Spinner />
            </InfinityLoader>
        </li>
    {{/if}}
</ul>


```

This will render a dropdown menu with the options passed in the options prop. The options will be grouped by the property specified in the groupIndex prop, and the optionsComponent and groupComponent props will be used for rendering the options and option groups, respectively. The select function will be called when an option is selected, and the highlightOnHover prop will determine whether or not to highlight the option on hover. Additionally, if showLoader is set to true, an Infinity
