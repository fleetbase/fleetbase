# Dropdown Cell Component

This is a reusable Dropdown Cell component built with Ember.js. It provides a customizable UI element that allows users to display a dropdown button in a table cell, and perform actions on the corresponding row.

## Usage

To use the Dropdown Cell component, you can simply import it into your Ember component and include it in your table column template as follows:

```hbs

{{#each @tableColumns as |column|}}
  {{#if column.dropdown}}
    <td class="table-cell {{column.cellClass}}" data-test-{{column.dropdown.testId}}>
      <DropdownCell
        @row={{this}}
        @column={{column}}
        @buttonText={{column.dropdown.buttonText}}
      />
    </td>
  {{else}}
    <td class="table-cell {{column.cellClass}}" data-test-{{column.testId}}>
      {{#if (has-block)}}
        {{yield}}
      {{else}}
        {{get this column.valuePath}}
      {{/if}}
    </td>
  {{/if}}
{{/each}}

```

You can customize the Dropdown Cell component by passing in different props:

| Parameter  | Description                                      |
|------------|--------------------------------------------------|
| `row`        | The corresponding row object.                    |
| `column`     | The corresponding column object.                 |
| `buttonText` | The text to be displayed on the dropdown button. |

## Example

```hbs

<div class="cell-dropdown-button overflow-visible {{@column.wrapperClass}}" {{did-insert this.setupComponent}} ...attributes>
    <DropdownButton @icon={{@column.ddButtonIcon}} @iconPrefix={{@column.ddButtonIconPrefix}} @text={{this.buttonText}} @size="xs" @horizontalPosition="left" @calculatePosition={{this.calculatePosition}} @renderInPlace={{true}} as |dd|>
        <div class="next-dd-menu mt-0i" aria-orientation="vertical" aria-labelledby="user-menu">
            {{#if @column.ddMenuLabel}}
                <div class="px-1">
                    <div class="text-sm flex flex-row items-center px-3 py-1 rounded-md my-1 text-gray-800 dark:text-gray-300">
                        {{@column.ddMenuLabel}}
                    </div>
                </div>
                <div class="next-dd-menu-seperator"></div>
            {{/if}}
            {{#each @column.actions as |action|}}
                {{#if action.separator}}
                    <div class="next-dd-menu-seperator"></div>
                {{else}}
                    <div class="px-1">
                        <a href="javascript:;" role="menuitem" class="next-dd-item {{action.class}}" {{on "click" (fn this.onDropdownItemClick action @row dd)}}>
                            {{#if action.icon}}
                                <span class="mr-1">
                                    <FaIcon class={{action.iconClass}} @icon={{action.icon}} @prefix={{action.iconPrefix}} />
                                </span>
                            {{/if}}
                            {{action.label}}
                        </a>
                    </div>
                {{/if}}
            {{/each}}
        </div>
    </DropdownButton>
</div>


```

This will render a table cell with a dropdown button. When the user clicks on the button, a dropdown menu will appear with a list of actions that can be performed on the corresponding row. The actions can be customized by passing in an array of action objects to the @column.actions prop.






