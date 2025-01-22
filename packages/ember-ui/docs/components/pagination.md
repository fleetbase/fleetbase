# FleetbasePagination Component

## Usage

To use the Fleetbase Pagination component, you can import it into your Ember component and include it in your template as follows:

```hbs

<FleetbasePagination @currentPage={{this.currentPage}} @totalPages={{this.totalPages}} @onPageChange={{this.handlePageChange}} />

```

You can customize the Fleetbase Pagination component by passing in different props:


| Parameter    | Description                                                           |
|--------------|-----------------------------------------------------------------------|
| `currentPage`  | The current page number.                                              |
| `totalPages`   | The total number of pages.                                            |
| `onPageChange` | A function that will be called when the user clicks on a page number. |

## Example

```hbs

<div class="flex justify-center mt-5">
  <FleetbasePagination @currentPage={{this.currentPage}} @totalPages={{this.totalPages}} @onPageChange={{this.handlePageChange}} />
</div>

```

This will render a pagination component with page numbers based on the `totalPages` prop. 

The `currentPage` prop determines the initially selected page. 

When the user clicks on a page number, the `onPageChange` function will be called with the new page number as an argument. 

You can then use this information to update your data or fetch new data based on the selected page.
