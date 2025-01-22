# Next Catalog Menu Items Component

This is a reusable Next Catalog Menu Items component built with Ember.js. It provides a customizable UI element that displays a list of menu items with icons and links to external routes.

## Usage

To use the Next Catalog Menu Items component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<NextCatalogMenuItems @extensions={{this.extensions}} @itemClass="menu-item" />

```

You can customize the Next Catalog Menu Items component by passing in different props:

| Property   | Description                                                      |
|------------|------------------------------------------------------------------|
| `extensions` | An array of objects representing the extensions to be displayed. |
|            | Each object should have the following properties:                |
| `extension`  | The name of the extension.                                       |
| `icon`       | The name of the icon to be displayed.                            |
| `itemClass`  | The class to be applied to each menu item.                       |

## Example

```hbs


<div class="next-catalog-menu">
  <NextCatalogMenuItems @extensions={{this.extensions}} @itemClass="menu-item" />
</div>

```

This will render a list of menu items with icons and links to external routes. The extensions prop is an array of objects representing the extensions to be displayed. Each object should have the properties extension and icon. The itemClass prop is used to apply a class to each menu item.



