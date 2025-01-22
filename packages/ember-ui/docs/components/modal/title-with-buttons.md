# Modal Header Component

This is a reusable Modal Header component built with Ember.js. It provides a customizable UI element that displays the header of a modal dialog.

## Usage

To use the Modal Header component, you can include it in your template as follows:


```hbs

<ModalHeader @options={{hash 
  title="Modal Title"
  headerStatus="success"
  headerButtons=(array 
    (hash 
      title="Dropdown Button" 
      icon="caret-down" 
      iconPrefix="fas" 
      ddMenuLabel="Menu Options" 
      options=(array 
        (hash 
          title="Option 1" 
          icon="fa-folder" 
          iconClass="text-gray-400" 
          iconPrefix="far"
          classNames="hover:bg-gray-200"
        ) 
        (hash 
          separator=true
        ) 
        (hash 
          title="Option 2" 
          icon="fa-folder-open" 
          iconClass="text-gray-400" 
          iconPrefix="far"
          classNames="hover:bg-gray-200"
          action=(action "onOptionClicked")
        )
      )
    )
    (hash 
      title="Button" 
      type="primary" 
      size="xs" 
      action=(action "onButtonClicked")
    )
  )
}}>
  <!-- Modal content here -->
</ModalHeader>

```

You can customize the Modal Header component by passing in different options:

| Parameter     | Description                                                                                                                          |
|---------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `title`         | The title of the modal.                                                                                                              |
| `headerStatus`  | The status of the header. Can be "success", "warning", "danger" or "info".                                                           |
| `headerButtons` | An array of objects representing the buttons to be displayed in the header. Each object should have the following properties:        |
| `title`         | The text to be displayed on the button.                                                                                              |
| `type`          | The type of the button. Can be "default", "primary", "secondary", "success", "warning" or "danger".                                  |
| `size`          | The size of the button. Can be "xs", "sm", "md" or "lg".                                                                             |
| `icon`          | The name of the icon to be displayed on the button.                                                                                  |
| `iconPrefix`    | The icon prefix to be used. Can be "fas", "far" or "fal".                                                                            |
| `action`        | The action to be performed when the button is clicked.                                                                               |
| `ddMenuLabel`   | The label to be displayed for the dropdown menu.                                                                                     |
| `options`       | An array of objects representing the options to be displayed in the dropdown menu. Each object should have the following properties: |
| `title`         | The text to be displayed for the option.                                                                                             |
| `classNames`    | The class names to be applied to the option.                                                                                         |
| `icon`          | The name of the icon to be displayed for the option.                                                                                 |
| `iconClass`     | The class to be applied to the icon.                                                                                                 |
| `iconPrefix`    | The icon prefix to be used. Can be "fas", "far" or "fal".                                                                            |
| `action`        | The action to be performed when the option is clicked.                                                                               |
| `separator`     | Whether or not to display a separator above the option.                                                                              |

You can also include content within the Modal Header component by using the yield statement. This content will be displayed below the header buttons.



## Example

```hbs

<Modal @options={{hash
    title="Example Modal"
    headerStatus="success"
    headerButtons=(array
        (hash
            title="Dropdown"
            icon="chevron-down"
            options=(array
                (hash title="Option 1" classNames="text-red-500" action=(fn (print "Clicked option 1!")))
                (hash separator=true)
                (hash title="Option 2" icon="envelope" iconPrefix="fas" action=(fn (print "Clicked option 2!")))
            ))
        )
        (hash
            title="Button"
            type="primary"
            size="sm"
            action=(fn (print "Clicked button!"))
        )
    )
>
    <p class="p-4">
        This is an example modal!
    </p>
</Modal>


```

This will render a modal with the title "Example Modal", a success status, and two header buttons: a dropdown button with two options, and a primary button with the text "Button". The modal content is simply a paragraph with the text "This is an example modal!".





