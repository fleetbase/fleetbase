# Console Loading Indicator

This is a reusable Console Loading Indicator component built with Ember.js. 

It provides a customizable UI element that shows a loading spinner while content is being fetched.

## Usage

To use the Console Loading Indicator component, you can simply import it into your Ember component and include it in your template as follows:

```hbs
    <WhileLoading>
        <Spinner @iconClass="text-sky-500 fa-spin-800ms" />
    </WhileLoading>
```

You can customize the Console Loading Indicator component by passing in different props:


| Property   | Description                                                                                    |
|------------|------------------------------------------------------------------------------------------------|
| `@iconClass` | The CSS class to be applied to the Spinner component. Default is "text-sky-500 fa-spin-800ms". |


## Example

```hbs

<WhileLoading @isLoading={{this.isLoading}}>
    <div class="my-content">
        <h2>{{this.title}}</h2>
        <p>{{this.description}}</p>
        <img src={{this.imageUrl}} alt={{this.imageAlt}} />
    </div>
    <Spinner @iconClass="text-sky-500 fa-spin-800ms" />
</WhileLoading>
    
```

In this example, the `WhileLoading` component is used to display a spinner while waiting for the title, description, and imageUrl data to load. 

Once the data is loaded and isLoading becomes false, the my-content div will be displayed with the loaded data.





