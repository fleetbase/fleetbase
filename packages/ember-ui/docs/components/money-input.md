# Money Input Component

The UI Money Input component provides a user interface for entering monetary values, with the option to select the currency.

## Usage

To use this component, you can include it in your template as follows:

```hbs

<UI-Money-Input @value={{this.amount}} />

```

You can customize the UI Money Input component by passing in different props:


| Parameter                 | Description                                                                                                                     |
|----------------------|---------------------------------------------------------------------------------------------------------------------------------|
| `value`                | The initial value of the input field.                                                                                           
| `wrapperClass`         | Additional CSS class(es) to apply to the wrapper div of the component.                                                          
| `canSelectCurrency`    | Whether or not the user can select a currency. If set to true, a dropdown menu will appear with a list of available currencies. 
| `searchEnabled`        | Whether or not to enable the search feature when selecting a currency.                                                          
| `search`              | The search query string when searching for a currency.                                                                          |
| `options`              | An array of currency options to display in the dropdown menu.                                                                   
| `selected`             | The selected currency option.                                                                                                   
| `placeholder`          | The placeholder text to display in the input field.                                                                             
| `onChange`             | A function that will be called when the value of the input field changes.                                                       
| `allowClear`           | Whether or not to display a clear button in the input field.                                                                    
| `placeholderComponent` | A component to render as the placeholder.                                                                                       
| `preventScroll`        | Whether or not to prevent scrolling when the dropdown menu is open.                                                             
| `renderInPlace`        | Whether or not to render the dropdown menu within the component.                                                                
| `scrollTo`             | The position to scroll to in the dropdown menu.                                                                                 |

## Example

Here's an example of how to use the UI Money Input component with the canSelectCurrency prop set to true:


```hbs

<div class="my-4">
    <UI-Money-Input @value={{this.amount}} @canSelectCurrency={{true}} />
</div>

```

This will render a money input field with a dropdown currency selector. 

The selected currency will be displayed on the left side of the input field.
