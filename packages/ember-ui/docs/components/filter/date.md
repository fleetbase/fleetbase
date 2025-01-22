# DatePicker Component

This is a reusable DatePicker component built with Ember.js. 

It provides a customizable UI element that allows users to select a date range using a date picker.

## Usage

To use the DatePicker component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

    <DatePicker 
      @value={{this.dateRange}} 
      @onSelect={{this.updateDateRange}} 
      @placeholder="Select date range" 
      @range={{true}} 
      @toggleSelected={{false}} 
      @autoClose={{false}} 
      class="filter-date-input form-input-sm w-full flex-1" />
  
```

You can customize the DatePicker component by passing in different props:

| Property        | Description                                                                                                                                                                               |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| @value          | Represents the currently selected date or date range. This property is passed in from the parent component.                                                                               |
| @onSelect       | Represents a callback function that is called whenever a date or date range is selected. The function is passed in from the parent component and takes the new date range as an argument. |
| @placeholder    | Represents the default text displayed in the input field. This property is passed in from the parent component.                                                                           |
| @range          | A boolean that specifies whether the user can select a range of dates or a single date. This property is set to true.                                                                     |
| @toggleSelected | A boolean that specifies whether the selected date(s) should be highlighted or not. This property is set to false.                                                                        |
| @autoClose      | A boolean that specifies whether the date picker should automatically close after a selection is made. This property is set to false.                                                     |
| class           | An HTML class that applies some styling to the input field.                                                                                                                               |


## Example

```hbs

  <DatePicker @value={{this.selectedDate}} @onSelect={{this.filterByDate}} @placeholder="Select date range" @range={{true}} @toggleSelected={{false}} @autoClose={{false}} class="filter-date-input form-input-sm w-full flex-1" />

```

This will render a date picker element with the placeholder text "Select date range". 

When the user selects a date range, the `filterByDate` action will be called with the selected date range as an argument. 

The selectedDate property should be updated to reflect the selected date range. 

The range, toggleSelected, and autoClose props are set to true, false, and false respectively, but you can customize them as needed.
