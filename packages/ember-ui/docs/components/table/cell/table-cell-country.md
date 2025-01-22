# CountryName Component

This is a reusable CountryName component that takes in a country name as a prop and displays the name along with its corresponding flag emoji.

## Usage

To use the CountryName component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<CountryName @country="United States" />

```

You can customize the CountryName component by passing in a different @country prop with the desired country name.

| Parameter      | Description                                                                                             |
|----------------|---------------------------------------------------------------------------------------------------------|
| `value`          | The value to be revealed.                                                                               |
| `buttonText`     | The text to be displayed on the reveal button.                                                          |
| `canClickToCopy` | Whether or not the user can click to copy the revealed value.                                           |
| `n-a`           | A function that will be called if there is no value to reveal (e.g. if the value is undefined or null). |

## Example

```hbs

{{#each @countries as |country|}}
  <tr>
    <td>
      <CountryName @country={{country.name}} />
    </td>
    <td>
      {{country.population}}
    </td>
  </tr>
{{/each}}


```

This will render a table of countries with their corresponding population and flag emoji. The CountryName component will be used to display the country name and its flag emoji. The @countries prop is expected to be an array of objects with a name property representing the country name.


