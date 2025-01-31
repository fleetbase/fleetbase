/**

 Modal footer element used within [Components.Modal](Components.Modal.html) components. See there for examples.

 @class ModalFooter
 @namespace Components
 @extends Glimmer.Component
 @public
 */

/**
 * The title of the default close button. Will be ignored (i.e. no close button) if you provide your own block
 * template.
 *
 * @property closeTitle
 * @type string
 * @default 'Ok'
 * @public
 */

/**
 * The title of the submit button (primary button). Will be ignored (i.e. no button) if set to `null` or if you provide
 * your own block template.
 *
 * @property submitTitle
 * @type string
 * @default null
 * @public
 */

/**
 * Set to `true` to disable the submit button. If you bind this to some property that indicates if submitting is allowed
 * (form validation for example) this can be used to prevent the user from pressing the submit button.
 *
 * @property submitDisabled
 * @type boolean
 * @default false
 * @public
 */

/**
 * The type of the submit button (primary button).
 *
 * @property submitButtonType
 * @type string
 * @default 'primary'
 * @public
 */

/**
 * @property buttonComponent
 * @type {String}
 * @private
 */

/**
 * The action to send to the parent modal component when the modal footer's form is submitted
 *
 * @event onSubmit
 * @public
 */

/**
 * @event onClose
 * @public
 */
import templateOnly from '@ember/component/template-only';

export default templateOnly();
