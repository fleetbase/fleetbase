# NextTable Component

The NextTable component is a customizable table built with Ember.js. 

It provides a fully functional table with sorting, pagination, and row selection, as well as the ability to customize the table's appearance through various props.

## Usage

To use the NextTable component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<NextTable
    @rows={{this.tableData}}
    @columns={{this.tableColumns}}
    @pagination={{true}}
    @onPageChange={{this.handlePageChange}}
    @selectable={{true}}
    @canSelectAll={{true}}
    @wrapperClass="next-table"
    @tfoot={{true}}
    @tfootVerticalOffset={{50}}
    @tfootVerticalOffsetElements="#footer"
>
    {{!-- Table content --}}
</NextTable>

```

You can customize the NextTable component by passing in different props:

| Parameters                        | Description                                                                                                                                                                                                                        |
|-----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `rows`                        | An array of objects that represent the rows of the table.                                                                                                                                                                          |
| `columns`                     | An array of objects that represent the columns of the table. Each object should have a label property that represents the column header and a valuePath property that represents the value to display in each row for that column. |
| `pagination `                 | Whether or not to display pagination controls at the bottom of the table.                                                                                                                                                          |
| `onPageChange`                | A function that will be called when the user changes the current page.                                                                                                                                                             |
| `selectable`                  | Whether or not to enable row selection in the table.                                                                                                                                                                               |
| `canSelectAll`                | Whether or not to enable the ability to select all rows in the table.                                                                                                                                                              |
| `wrapperClass`                | The CSS class to apply to the table wrapper element.                                                                                                                                                                               |
| `tfoot`                       | Whether or not to display a table footer.                                                                                                                                                                                          |
| `tfootVerticalOffset`         | The vertical offset in pixels to apply to the table footer.                                                                                                                                                                        |
| `tfootVerticalOffsetElements` | A CSS selector that identifies the elements that should be taken into account when calculating the vertical offset.                                                                                                                |


## Example

```hbs

<div class="next-table-wrapper {{@wrapperClass}}">
    <table ...attributes {{did-insert this.setupComponent}}>
        {{#if (has-block)}}
            {{yield}}
        {{else}}
            <Table::Head>
                <Table::Row>
                    {{#if @canSelectAll}}
                        <Table::Th @width={{40}} @resizable={{false}}>
                            <Table::Cell::Checkbox @value={{this.allRowsToggled}} @onToggle={{this.selectAllRows}} />
                        </Table::Th>
                    {{/if}}
                    {{#each this.visibleColumns as |column|}}
                        <Table::Th @column={{column}} @resizable={{column.resizable}} @sortable={{column.sortable}}>{{column.label}}</Table::Th>
                    {{/each}}
                </Table::Row>
            </Table::Head>
            <Table::Body>
                {{#each @rows as |row|}}
                    <Table::Row @selected={{get row 'checked'}}>
                        {{#if @selectable}}
                            <Table::Td>
                                <Table::Cell::Checkbox @row={{row}} @value={{get row 'checked'}} />
                            </Table::Td>
                        {{/if}}
                        {{#each this.visibleColumns as |column|}}
                            <Table::Td @column={{column}} @row={{row}} @value={{get row column.valuePath}} />
                        {{/each}}
                    </Table::Row>
                {{/each}}
            </Table::Body>
            {{#if (or @tfoot @pagination)}}
                <Table::Foot @tfootVerticalOffset={{@tfootVerticalOffset}} @tfootVerticalOffsetElements={{@tfootVerticalOffsetElements}}>
                    <tr class="tfoot-row {{if @pagination 'next-pagination-row'}}">
                        <td class="tfoot-column {{if @pagination 'next-pagination-column'}}" colspan={{add this.visibleColumns.length 1}}>
                            <div class="tfoot-wrapper">
                                {{#if @pagination}}
                                    <Pagination @columns={{this.visibleColumns}} @meta={{@paginationMeta}} @currentPage={{@page}} @onPageChange={{@onPageChange}} />
                                {{/if}}
                                {{#if @tfoot}}
                                    <div class="next-table-tfoot">{{yield "tfoot"}}</div>
                                {{/if}}
                            </div>
                        </td>
                    </tr>
                </Table::Foot>
            {{/if}}
        {{/if}}
    </table>
</div>

```

And here's an example usage of the component:

```hbs

<NextTable @rows={{this.rows}} @columns={{this.columns}} @pagination={{true}} @tfoot={{true}} @wrapperClass="my-custom-table-wrapper-class">
    <tfoot>
        <tr>
            <td colspan={{add this.columns.length 1}}>Custom footer content</td>
        </tr>
    </tfoot>
</NextTable>

```

In this example, the component is passed an array of rows and an array of columns as props. 

It also has `pagination` and `tfoot` set to true, which will render a pagination component and a custom footer respectively. 

The `wrapperClass` prop is also set to "my-custom-table-wrapper-class" to add a custom CSS class to the table wrapper. 

The custom footer content is defined inside a `tfoot` block.
