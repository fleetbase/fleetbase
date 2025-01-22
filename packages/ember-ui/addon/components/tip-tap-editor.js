import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { Color } from '@tiptap/extension-color';

const DEFAULT_TEXT_COLOR = '#000000';
const FALLBACK_YOUTUBE_VID_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
export default class TipTapEditorComponent extends Component {
    @service fetch;
    @service modalsManager;
    @service notifications;
    @tracked editor;
    @tracked value = '';
    @tracked placeholder = '';
    @tracked autofocus = false;
    @tracked editable = true;
    @tracked color = DEFAULT_TEXT_COLOR;
    @tracked colorInputNode;
    @tracked file;

    formatControls = [
        { title: 'Bold', icon: 'bold', fn: this.bold },
        { title: 'Italic', icon: 'italic', fn: this.italic },
        { title: 'Underline', icon: 'underline', fn: this.underline },
        { title: 'Strikethrough', icon: 'strikethrough', fn: this.strikethrough },
        { title: 'Superscript', icon: 'superscript', fn: this.superscript },
        { title: 'Subscript', icon: 'subscript', fn: this.subscript },
    ];

    headingControls = [
        { title: 'Heading 1', icon: 'heading', fn: this.heading, params: { level: 1 } },
        { title: 'Heading 2', icon: 'heading', fn: this.heading, params: { level: 2 } },
        { title: 'Heading 3', icon: 'heading', fn: this.heading, params: { level: 3 } },
    ];

    fontFamilyControls = [
        { title: 'Inter', icon: 'font', fn: this.fontFamily, params: { font: 'Inter' } },
        { title: 'Comic Sans', icon: 'font', fn: this.fontFamily, params: { font: 'Comic Sans' } },
        { title: 'Serif', icon: 'font', fn: this.fontFamily, params: { font: 'Serif' } },
        { title: 'Monospace', icon: 'font', fn: this.fontFamily, params: { font: 'Monospace' } },
        { title: 'Unset', icon: 'text-slash', fn: this.unsetfontFamily, params: { font: null } },
    ];

    tableControls = [
        { title: 'Add Column Before', icon: 'square-plus', fn: this.addTableColumnBefore },
        { title: 'Add Column After', icon: 'square-plus', fn: this.addTableColumAfter },
        { title: 'Delete Column', icon: 'trash', fn: this.removeTableColumn },
        { seperator: true },
        { title: 'Add Row Before', icon: 'square-plus', fn: this.addTableRowBefore },
        { title: 'Add Row After', icon: 'square-plus', fn: this.addTableRowAfter },
        { title: 'Delete Row', icon: 'trash', fn: this.removeTableRow },
        { seperator: true },
        { title: 'Delete Table', icon: 'trash', fn: this.removeTable },
    ];

    constructor(owner, { value = '', placeholder = '', autofocus = false, editable = true }) {
        super(...arguments);
        this.value = value;
        this.placeholder = placeholder;
        this.autofocus = autofocus;
        this.editable = editable;
    }

    @action createTipTapEditor(el) {
        this.editor = new Editor({
            element: el,
            extensions: [
                StarterKit,
                Placeholder.configure({ placeholder: this.placeholder }),
                TextAlign.configure({ types: ['heading', 'paragraph'] }),
                Table.configure({ resizable: true }),
                TableRow,
                TableHeader,
                TableCell,
                TextStyle,
                FontFamily,
                Color,
                Underline,
                Superscript,
                Subscript,
                Image,
                Youtube,
            ],
            content: this.value,
            autofocus: this.autofocus,
            editable: this.editable,
            injectCSS: false,
            onBeforeCreate: this.onBeforeCreate.bind(this),
            onCreate: this.onCreate.bind(this),
            onUpdate: this.onUpdate.bind(this),
            onSelectionUpdate: this.onSelectionUpdate.bind(this),
            onTransaction: this.onTransaction.bind(this),
            onFocus: this.onFocus.bind(this),
            onBlur: this.onBlur.bind(this),
        });
    }

    onBeforeCreate() {
        if (typeof this.args.onBeforeCreate === 'function') {
            this.args.onBeforeCreate(...arguments);
        }
    }

    onCreate() {
        if (typeof this.args.onCreate === 'function') {
            this.args.onCreate(...arguments);
        }
    }

    onUpdate({ editor }) {
        const html = editor.getHTML();
        const json = editor.getJSON();
        const text = editor.getText();

        // update value
        this.value = html;

        if (typeof this.args.onJsonChange === 'function') {
            this.args.onJsonChange(json, editor);
        }

        if (typeof this.args.onTextChange === 'function') {
            this.args.onTextChange(text, editor);
        }

        if (typeof this.args.onHtmlChange === 'function') {
            this.args.onHtmlChange(html, editor);
        }

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(html, editor);
        }

        if (typeof this.args.onUpdate === 'function') {
            this.args.onUpdate(...arguments);
        }
    }

    onSelectionUpdate({ editor }) {
        this.trackColorChange(editor);

        if (typeof this.args.onSelectionUpdate === 'function') {
            this.args.onSelectionUpdate(...arguments);
        }
    }

    onTransaction() {
        if (typeof this.args.onTransaction === 'function') {
            this.args.onTransaction(...arguments);
        }
    }

    onFocus() {
        if (typeof this.args.onFocus === 'function') {
            this.args.onFocus(...arguments);
        }
    }

    onBlur() {
        if (typeof this.args.onBlur === 'function') {
            this.args.onBlur(...arguments);
        }
    }

    trackColorChange(editor) {
        this.color = editor.getAttributes('textStyle').color ?? DEFAULT_TEXT_COLOR;
        if (this.colorInputNode) {
            this.colorInputNode.value = this.color;
        }
    }

    @action setColorPickerNode(el) {
        this.colorInputNode = el;
    }

    @action undo() {
        this.editor.chain().focus().undo().run();
    }

    @action redo() {
        this.editor.chain().focus().redo().run();
    }

    @action bold() {
        this.editor.chain().focus().toggleBold().run();
    }

    @action italic() {
        this.editor.chain().focus().toggleItalic().run();
    }

    @action underline() {
        this.editor.chain().focus().toggleUnderline().run();
    }

    @action horizontalRule() {
        this.editor.chain().focus().setHorizontalRule().run();
    }

    @action strikethrough() {
        this.editor.chain().focus().toggleStrike().run();
    }

    @action superscript() {
        this.editor.chain().focus().toggleSuperscript().run();
    }

    @action subscript() {
        this.editor.chain().focus().toggleSubscript().run();
    }

    @action heading({ level }) {
        this.editor.chain().focus().setHeading({ level }).run();
    }

    @action fontFamily({ font }) {
        this.editor.chain().focus().setFontFamily(font).run();
    }

    @action unsetfontFamily() {
        this.editor.chain().focus().unsetFontFamily().run();
    }

    @action paragraph() {
        this.editor.chain().focus().setParagraph().run();
    }

    @action blockquote() {
        this.editor.chain().focus().toggleBlockquote().run();
    }

    @action codeblock() {
        this.editor.chain().focus().toggleCodeBlock().run();
    }

    @action list() {
        this.editor.chain().focus().toggleBulletList().run();
    }

    @action orderedList() {
        this.editor.chain().focus().toggleOrderedList().run();
    }

    @action fontColor(event) {
        const {
            target: { value },
        } = event;
        this.editor.chain().focus().setColor(value).run();
        this.color = value;
    }

    @action clearFontColor() {
        this.editor.chain().focus().unsetColor().run();
        this.color = DEFAULT_TEXT_COLOR;
    }

    @action alignLeft() {
        this.editor.chain().focus().setTextAlign('left').run();
    }

    @action alignRight() {
        this.editor.chain().focus().setTextAlign('right').run();
    }

    @action alignCenter() {
        this.editor.chain().focus().setTextAlign('center').run();
    }

    @action insertImage(file) {
        // since we have dropzone and upload button within dropzone validate the file state first
        // as this method can be called twice from both functions
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) {
            return;
        }

        // set file for progress state
        this.file = file;

        // Queue and upload immediatley
        this.fetch.uploadFile.perform(
            file,
            {
                path: 'uploads/images',
                type: 'image',
            },
            (uploadedFile) => {
                this.file = undefined;
                this.editor.commands.setImage({ src: uploadedFile.url });
            },
            () => {
                // remove file from queue
                if (file.queue && typeof file.queue.remove === 'function') {
                    file.queue.remove(file);
                }
                this.file = undefined;
            }
        );
    }

    @action insertYoutube() {
        this.modalsManager.show('modals/tip-tap-editor-insert-youtube', {
            title: 'Insert a Youtube Video',
            url: undefined,
            height: 320,
            width: 480,
            confirm: (modal) => {
                try {
                    this.editor.commands.setYoutubeVideo({
                        src: modal.getOption('url', FALLBACK_YOUTUBE_VID_URL),
                        width: modal.getOption('width', 320),
                        height: modal.getOption('height', 480),
                    });
                    modal.done();
                } catch (e) {
                    this.notifications.error('Youtube video URL is invalid.');
                }
            },
        });
    }

    @action insertTable() {
        this.modalsManager.show('modals/tip-tap-editor-insert-table', {
            title: 'Insert a Table',
            rows: 3,
            columns: 3,
            confirm: (modal) => {
                this.editor.commands.insertTable({
                    rows: modal.getOption('rows', 3),
                    columns: modal.getOption('columns', 3),
                    withHeaderRow: true,
                });
                modal.done();
            },
        });
    }

    @action addTableColumnBefore() {
        this.editor.commands.addColumnBefore();
    }

    @action addTableColumAfter() {
        this.editor.commands.addColumnAfter();
    }

    @action removeTableColumn() {
        this.editor.commands.deleteColumn();
    }

    @action addTableRowBefore() {
        this.editor.commands.addRowBefore();
    }

    @action addTableRowAfter() {
        this.editor.commands.addRowAfter();
    }

    @action removeTableRow() {
        this.editor.commands.deleteRow();
    }

    @action removeTable() {
        this.editor.commands.deleteTable();
    }
}
