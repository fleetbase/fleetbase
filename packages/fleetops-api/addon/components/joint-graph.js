/* eslint-disable no-undef */
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class JointGraphComponent extends Component {
    @tracked el;
    @tracked graph;
    @tracked paper;
    @tracked height = 400;
    @tracked width = 800;
    @tracked gridSize = 1;
    @tracked fullSize = true;
    @tracked panning = true;
    @tracked responsive = true;
    @tracked dragStartPosition = {};

    constructor(owner, { height = 400, width = 800, gridSize = 1, fullSize = true, panning = true, responsive = true }) {
        super(...arguments);
        this.height = height;
        this.width = width;
        this.gridSize = gridSize;
        this.fullSize = fullSize;
        this.panning = panning;
        this.responsive = responsive;
    }

    @action setupGraph(el) {
        this.sizeGrid(el);
        this.createGraph(el);
    }

    createGraph(el) {
        const namespace = joint.shapes;
        const graph = new joint.dia.Graph({}, { cellNamespace: namespace });
        const paper = new joint.dia.Paper({
            el,
            model: graph,
            width: this.width,
            height: this.height,
            gridSize: this.gridSize,
            cellViewNamespace: namespace,
            interactive: false,
        });

        this.el = el;
        this.graph = graph;
        this.paper = paper;
        if (this.panning) {
            this.createPanningHandler(paper);
        }
        if (this.responsive) {
            this.createResponsiveHandler(paper);
        }

        if (typeof this.args.onSetup === 'function') {
            this.args.onSetup({ paper, graph, el }, this);
        }
    }

    getFullGridSize(el) {
        const parentEl = el.parentElement;
        const width = parentEl.offsetWidth;
        const height = parentEl.offsetHeight;
        return { width, height };
    }

    sizeGrid(el) {
        if (this.fullSize) {
            const { width, height } = this.getFullGridSize(el);
            this.width = width;
            this.height = height;
        }
    }

    createResponsiveHandler(paper) {
        window.addEventListener('resize', () => {
            if (!this.el) {
                return;
            }
            const { width, height } = this.getFullGridSize(this.el);
            this.width = width;
            this.height = height;
            paper.setDimensions(width, height);
        });
    }

    createPanningHandler(paper) {
        paper.on('blank:pointerdown', (event, x, y) => {
            this.dragStartPosition = { x, y };
        });

        paper.on('cell:pointerup blank:pointerup', () => {
            this.dragStartPosition = undefined;
        });

        paper.el.addEventListener('mousemove', (event) => {
            if (this.dragStartPosition) {
                paper.translate(event.offsetX - this.dragStartPosition.x, event.offsetY - this.dragStartPosition.y);
            }
        });
    }
}
