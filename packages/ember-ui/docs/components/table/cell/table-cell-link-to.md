# LinkTo Cell Component

This is a reusable LinkTo cell component built with Ember.js. It provides a customizable UI element that allows users to create links to other routes in the application.


## Usage

To use the LinkTo cell component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<LinkTo @route={{@column.route}} @model={{@row}} />

```

You can customize the LinkTo cell component by passing in different props:

| Parameter | Description                                                                   |
|-----------|-------------------------------------------------------------------------------|
| `route`     | The name of the route to link to.                                             |
| `model`     | The model to be passed to the route's dynamic segments.                       |
| `n-a`       | A function that will be called if either route or model is undefined or null. |

## Example

```hbs


{{#each @data as |row|}}
  <tr>
    <td>{{row.id}}</td>
    <td>{{row.name}}</td>
    <td>
      <LinkTo @route="dashboard.user" @model={{row.id}}>
        {{row.username}}
      </LinkTo>
    </td>
    <td>{{row.email}}</td>
  </tr>
{{/each}}



```
This will render a table with a column containing links to the user's dashboard. The row.id property is passed as the model parameter to the dashboard.user route. When the user clicks on the link, they will be taken to the dashboard.user route with the corresponding id parameter in the URL.





