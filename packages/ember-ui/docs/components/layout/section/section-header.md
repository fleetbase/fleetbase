# Next View Section Subheader Component

This is a reusable Next View Section Subheader component that allows you to display a header with a title, subtitle, icon and an optional search bar. 

You can also provide actions to be displayed on the right side of the header.

## Example

```hbs

<Layout::Section::Body>
    <Table @rows={{@model}} @columns={{this.columns}} @selectable={{true}} @canSelectAll={{true}} @onSetup={{fn (mut this.table)}} @pagination={{true}} @paginationMeta={{@model.meta}} @page={{this.page}} @onPageChange={{fn (mut this.page)}} @tfootVerticalOffset="53" @tfootVerticalOffsetElements=".next-view-section-subheader" />
</Layout::Section::Body>


```


