import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { computed, action } from '@ember/object';
import { equal } from '@ember/object/computed';

export default class UnitInputComponent extends Component {
    /**
     * Units of weight
     *
     * @memberof UnitInputComponent
     */
    unitsOfWeight = [
        {
            name: 'Grams',
            value: 'g',
        },
        {
            name: 'Kilograms',
            value: 'kg',
        },
        {
            name: 'Grain',
            value: 'gr',
        },
        {
            name: 'Dram',
            value: 'dr',
        },
        {
            name: 'Ounce',
            value: 'oz',
        },
        {
            name: 'Pound',
            value: 'lb',
        },
        {
            name: 'Tonne',
            value: 't',
        },
    ];

    /**
     * Units of length
     *
     * @memberof UnitInputComponent
     */
    unitsOfLength = [
        {
            name: 'Meter',
            value: 'm',
        },
        {
            name: 'Millimeter',
            value: 'mm',
        },
        {
            name: 'Centimeter',
            value: 'cm',
        },
        {
            name: 'Decimeter',
            value: 'dm',
        },
        {
            name: 'Kilometer',
            value: 'km',
        },
        {
            name: 'Inch',
            value: 'in',
        },
        {
            name: 'Foot',
            value: 'ft',
        },
        {
            name: 'Yard',
            value: 'yd',
        },
        {
            name: 'Astonomical Unit',
            value: 'AE',
        },
        {
            name: 'Light Year',
            value: 'lj',
        },
    ];

    /**
     * Units of volume
     *
     * @memberof UnitInputComponent
     */
    unitsOfVolume = [
        {
            name: 'Milliliter',
            value: 'mL',
        },
        {
            name: 'Centiliter',
            value: 'cL',
        },
        {
            name: 'Deciliter',
            value: 'dL',
        },
        {
            name: 'Decimeter',
            value: 'dm',
        },
        {
            name: 'Liter',
            value: 'L',
        },
        {
            name: 'Gallon (US)',
            value: 'gal',
        },
        {
            name: 'Pint (US)',
            value: 'pt',
        },
        {
            name: 'Quart (US)',
            value: 'qt',
        },
    ];

    /**
     * The placeholder
     *
     * @readonly
     * @memberof UnitInputComponent
     */
    @computed('args.placeholder', 'unit', 'unitName') get placeholder() {
        const { placeholder } = this.args;

        if (placeholder) {
            return placeholder;
        }

        return `Enter ${this.unitName}`;
    }

    /**
     * The selected or default measurement
     *
     * @readonly
     * @memberof UnitInputComponent
     */
    @computed('args.measurement') get measurement() {
        return this.args.measurement ?? 'length';
    }

    /**
     * True if selecting length
     *
     * @memberof UnitInputComponent
     */
    @equal('measurement', 'length') isSelectingLength;

    /**
     * True if selecting weight
     *
     * @memberof UnitInputComponent
     */
    @equal('measurement', 'weight') isSelectingWeight;

    /**
     * True if selecting volume
     *
     * @memberof UnitInputComponent
     */
    @equal('measurement', 'volume') isSelectingVolume;

    /**
     * Units based on measurement selection
     *
     * @readonly
     * @memberof UnitInputComponent
     */
    @computed('isSelectingLength', 'isSelectingWeight', 'isSelectingVolume', 'unitsOfLength.[]', 'unitsOfWeight.[]', 'unitsOfVolume.[]') get units() {
        if (this.isSelectingLength) {
            return this.unitsOfLength;
        }

        if (this.isSelectingWeight) {
            return this.unitsOfWeight;
        }

        if (this.isSelectingVolume) {
            return this.unitsOfVolume;
        }

        return [];
    }

    /**
     * The selected unit
     *
     * @memberof UnitInputComponent
     */
    @tracked unit;

    /**
     * If the input is disabled.
     *
     * @memberof UnitInputComponent
     */
    @tracked disabled = false;

    /**
     * Name of unit selection
     *
     * @readonly
     * @memberof UnitInputComponent
     */
    @computed('selectedUnitObject.name', 'unit') get unitName() {
        return this.selectedUnitObject.name ?? this.unit;
    }

    /**
     * The object for the unit selected
     *
     * @readonly
     * @memberof UnitInputComponent
     */
    @computed('unit', 'isSelectingLength', 'isSelectingWeight', 'isSelectingVolume', 'unitsOfLength.[]', 'unitsOfWeight.[]', 'unitsOfVolume.[]') get selectedUnitObject() {
        const { unit } = this;

        if (this.isSelectingLength) {
            return this.unitsOfLength.find((u) => u.value === unit);
        }

        if (this.isSelectingWeight) {
            return this.unitsOfWeight.find((u) => u.value === unit);
        }

        if (this.isSelectingVolume) {
            return this.unitsOfVolume.find((u) => u.value === unit);
        }

        return null;
    }

    constructor(owner, { unit, disabled = false }) {
        super(...arguments);

        this.unit = unit;
        this.disabled = disabled;
    }

    /**
     * User selection of unit
     *
     * @param {Object} unit
     * @param {DropdownActions} dd
     * @memberof UnitInputComponent
     */
    @action setUnit(unit, dd) {
        if (typeof dd.actions.close === 'function') {
            dd.actions.close();
        }

        const { value } = unit;
        this.unit = value;

        if (typeof this.args.onUnitChange === 'function') {
            this.args.onUnitChange(value);
        }
    }
}
