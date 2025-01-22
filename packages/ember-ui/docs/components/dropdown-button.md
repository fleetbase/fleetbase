# Basic Dropdown Component

This is a customizable Basic Dropdown component built with Ember.js. It provides a UI element that allows users to select an item from a dropdown list. The dropdown can be triggered by clicking on a button or by hovering over an area.

## Usage

To use the Basic Dropdown component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<BasicDropdown class={{@wrapperClass}} @renderInPlace={{@renderInPlace}} @registerAPI={{@registerAPI}} @horizontalPosition={{@horizontalPosition}} @verticalPosition={{@verticalPosition}} @calculatePosition={{@calculatePosition}} @defaultClass={{@defaultClass}} @matchTriggerWidth={{@matchTriggerWidth}} @onOpen={{@onOpen}} @onClose={{@onClose}} as |dd|>
    <dd.Trigger class={{@triggerClass}}>
        {{#if @buttonComponent}}
            {{component @buttonComponent buttonComponentArgs=this.buttonComponentArgs text=@text class=(concat @buttonClass (if dd.isOpen ' dd-is-open')) wrapperClass=@buttonWrapperClass type=this.type active=@active size=this.buttonSize isLoading=@isLoading disabled=@disabled textClass=@textClass helpText=@helpText tooltipPlacement=@tooltipPlacement img=@img imgClass=@imgClass alt=@alt}}
        {{else}}
            <Button title={{@text}} class="{{@buttonClass}} {{if dd.isOpen 'dd-is-open'}}" @wrapperClass={{@buttonWrapperClass}} @type={{this.type}} @active={{@active}} @size={{this.buttonSize}} @isLoading={{@isLoading}} disabled={{@disabled}} ...attributes>
                {{#if @icon}}
                    <FaIcon @icon={{@icon}} @prefix={{@iconPrefix}} @size={{@iconSize}} class="{{@iconClass}} {{if @text 'mr-2'}}" />
                {{/if}}
                {{#if @img}}
                    <img src={{@img}} class={{@imgClass}} alt={{or @alt "image"}} />
                {{/if}}
                {{#if @helpText}}
                    <Attach::Tooltip @class="clean" @animation="scale" @placement={{or @tooltipPlacement "top" }}>
                        <InputInfo @text={{@helpText}} />
                    </Attach::Tooltip>
                {{/if}}
                <div class="{{@textClass}} truncate">
                    {{@text}}
                </div>
            </Button>
        {{/if}}
    </dd.Trigger>
    <dd.Content class={{@contentClass}} @overlay={{@overlay}}>
        {{yield dd}}
    </dd.Content>
</BasicDropdown>

```

You can customize the Basic Dropdown component by passing in different props:

| Parameter          | Description                                                                     |
|--------------------|---------------------------------------------------------------------------------|
| `wrapperClass`       | The class to be applied to the wrapper element of the dropdown.                 |
| `renderInPlace`      | Whether to render the dropdown in place or append it to the document body.      |
| `registerAPI`        | A callback function that will receive the API object of the dropdown.           |
| `horizontalPosition` | The horizontal position of the dropdown relative to the trigger element.        |
| `verticalPosition`   | The vertical position of the dropdown relative to the trigger element.          |
| `calculatePosition`  | A function that calculates the position of the dropdown.                        |
| `defaultClass`       | The default class to be applied to the dropdown.                                |
| `matchTriggerWidth`  | Whether to match the width of the dropdown to the width of the trigger element. |
| `onOpen`             | A callback function that will be called when the dropdown is opened.            |
| `onClose`            | A callback function that will be called when the dropdown is closed.            |



## Example

```hbs

<BasicDropdown @text="Dropdown" @buttonClass="btn


```


