/* eslint-disable no-undef */
import Component from '@glimmer/component';
import ObjectProxy from '@ember/object/proxy';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import { debug } from '@ember/debug';
import { task } from 'ember-concurrency-decorators';
import generateUUID from '@fleetbase/ember-core/utils/generate-uuid';
import createFlowActivity from '../../utils/create-flow-activity';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';

/**
 * Manages the activity flow for order configuration, allowing users to create, edit, and view a sequence of activities.
 * @extends Component
 */
export default class OrderConfigManagerActivityFlowComponent extends Component {
    @service contextPanel;
    @service notifications;
    @service intl;
    @service abilities;

    /**
     * Represents the current state of the activity flow.
     * @type {Object}
     */
    @tracked flow = {};

    /**
     * An array of activity codes that should not be modified.
     * @type {Array.<string>}
     */
    @tracked immutableActivities = ['created', 'dispatched', 'started'];

    /**
     * The configuration data for the activity flow.
     * @type {Object}
     */
    @tracked config;

    /**
     * JointJS paper instance where the graph is rendered.
     * @type {Object}
     */
    @tracked paper;

    /**
     * JointJS graph instance representing the activity flow.
     * @type {Object}
     */
    @tracked graph;

    /**
     * Initializes the component with the given configuration.
     * @param {Object} owner - The owner of the component instance.
     * @param {Object} config - The configuration data for the activity flow.
     */
    constructor(owner, { config, configManagerContext }) {
        super(...arguments);
        this.config = config;

        configManagerContext.on('onConfigChanged', (newConfig) => {
            this.changeConfig(newConfig);
        });
    }

    /**
     * Action to initialize the graph on the JointJS paper instance.
     * @param {Object} paper - The JointJS paper instance.
     * @param {Object} graph - The JointJS graph instance.
     */
    @action initializeGraph({ paper, graph }) {
        this.paper = paper;
        this.graph = graph;
        this.initializeActivityJointModel();
        this.initializeActivityFlow();
        this.listenForElementClicks();
    }

    /**
     * Zooms in by scaling the paper.
     *
     * @return {void}
     * @memberof OrderConfigManagerActivityFlowComponent
     */
    @action zoomIn() {
        const currentScale = this.paper.scale();
        const currentScaleSx = currentScale.sx;
        if (currentScaleSx >= 1.2) {
            return;
        }

        this.paper.scale(currentScaleSx + 0.2);
    }

    /**
     * Zooms out by scaling the paper.
     *
     * @return {void}
     * @memberof OrderConfigManagerActivityFlowComponent
     */
    @action zoomOut() {
        const currentScale = this.paper.scale();
        const currentScaleSx = currentScale.sx;
        if (currentScaleSx <= 0.2) {
            return;
        }

        this.paper.scale(currentScaleSx - 0.2);
    }

    /**
     * Handles the reset of the config.
     *
     * @memberof OrderConfigManagerActivityFlowComponent
     */
    @action resetConfig() {
        this.clearGraph({
            onAfter: () => {
                this.flow = {};
                const defaultActivities = this.getDefaultActivities();
                this.addActivityToGraph(defaultActivities);
            },
        });
    }

    /**
     * Handles the change of a config.
     *
     * @param {OrderConfigModel} newConfig
     * @memberof OrderConfigManagerActivityFlowComponent
     */
    changeConfig(newConfig) {
        this.clearGraph({
            onAfter: () => {
                this.config = newConfig;
                this.initializeActivityFlow();
                this.listenForElementClicks();
            },
        });
    }

    /**
     * Handles the reset of the config.
     *
     * @memberof OrderConfigManagerActivityFlowComponent
     */
    clearGraph(options = {}) {
        if (typeof options.onBefore === 'function') {
            options.onBefore();
        }
        for (let activityCode in this.flow) {
            const activity = this.flow[activityCode];
            const node = activity.get('node');
            if (node) {
                node.remove();
            }
        }
        if (typeof options.onAfter === 'function') {
            options.onAfter();
        }
    }

    /**
     * Listens for element click events within the JointJS paper.
     */
    listenForElementClicks() {
        this.paper.on('element:pointerdown', (elementView, event) => {
            this.onActivityClicked(elementView);
            contextComponentCallback(this, 'onActivityClicked', elementView, event);
        });
    }

    /**
     * Initializes the custom JointJS shapes used in the activity flow.
     */
    initializeActivityJointModel() {
        joint.shapes.fleetbase = {};
        joint.shapes.fleetbase.Activity = joint.shapes.standard.Rectangle.define(
            'fleetbase.Activity',
            {
                attrs: {
                    rect: { stroke: 'none', fillOpacity: 0 },
                    text: {
                        textVerticalAnchor: 'middle',
                        textAnchor: 'middle',
                        refX: '50%',
                        refY: '50%',
                        fontSize: 14,
                        fill: '#333',
                    },
                },
            },
            {
                markup: [
                    {
                        tagName: 'rect',
                        selector: 'body',
                        className: 'flow-activity',
                    },
                    {
                        tagName: 'rect',
                        selector: 'pill',
                        className: 'flow-activity-status-pill',
                    },
                    {
                        tagName: 'text',
                        selector: 'code',
                    },
                    {
                        tagName: 'text',
                        selector: 'status',
                    },
                    {
                        tagName: 'text',
                        selector: 'details',
                    },
                ],
            }
        );
    }

    /**
     * Asynchronously saves the current state of the activity flow.
     * @returns {Generator}
     */
    @task *save() {
        const flow = this.serializeFlow();
        this.config.set('flow', flow);
        yield this.config.save().then((config) => {
            this.config = config;
            this.initializeActivityFlow();
            this.listenForElementClicks();
        });
    }

    /**
     * If any context is provided then initialize the state.
     *
     * @memberof OrderConfigManagerCustomFieldsComponent
     */
    initializeContext() {
        later(
            this,
            () => {
                const { context, contextModel } = this.args;
                if (typeof context === 'string' && contextModel === 'activity') {
                    const contextActivity = Object.values(this.flow).find((activity) => activity.get('internalId') === context);
                    if (contextActivity) {
                        this.editActivity(contextActivity);
                    }
                }
            },
            300
        );
    }

    /**
     * Serializes the current activity flow into a JSON-compatible format.
     * @returns {Object} The serialized activity flow.
     */
    serializeFlow() {
        const serialized = {};
        const keys = Object.keys(this.flow);
        keys.forEach((key) => {
            const activity = this.flow[key];
            // remove node
            activity.set('node', undefined);
            // remove ids
            activity.set('id', undefined);
            activity.set('parentId', undefined);
            // remove internal model
            activity.set('_internalModel', undefined);
            // map activities into id and code string
            const activities = activity.get('activities');
            activity.set(
                'activities',
                activities.map((_activity) => {
                    return _activity.get('code');
                })
            );
            serialized[key] = activity.content;
        });

        return serialized;
    }

    /**
     * Deserializes the incoming activity flow and reconstructs the activity graph.
     * @param {Object} incomingFlow - The incoming serialized activity flow.
     */
    deserializeFlow(incomingFlow) {
        const deserializedFlow = {};
        const keys = Object.keys(incomingFlow);
        keys.forEach((key) => {
            const activity = this.deserializeActivity(incomingFlow[key], incomingFlow);
            deserializedFlow[activity.get('code')] = activity;
        });

        this.addDeserializedActivityToGraph(deserializedFlow.created);
    }

    /**
     * Deserializes a single activity.
     * @param {Object} activityObject - Serialized activity data.
     * @param {Object} incomingFlow - The entire incoming serialized activity flow for reference.
     * @returns {Object} Deserialized activity object.
     */
    deserializeActivity(activityObject, incomingFlow) {
        const activity = createFlowActivity(activityObject.code, activityObject.status, activityObject.details, activityObject.sequence, activityObject.color, {
            key: activityObject.key,
            logic: activityObject.logic ?? [],
            events: activityObject.events ?? [],
            entities: activityObject.entities ?? [],
            actions: activityObject.actions ?? [],
            require_pod: activityObject.require_pod ?? false,
            pod_method: activityObject.pod_method ?? 'scan',
            complete: activityObject.complete ?? false,
            internalId: activityObject.internalId ?? generateUUID(),
        });
        const { activities } = activityObject;
        if (isArray(activities)) {
            activity.set(
                'activities',
                activities
                    .map((activityKey) => {
                        return this.deserializeActivity(incomingFlow[activityKey], incomingFlow);
                    })
                    .filter(Boolean)
            );
        }

        return activity;
    }

    /**
     * Adds deserialized activities to the graph.
     * @param {Object} activity - The activity to add to the graph.
     */
    addDeserializedActivityToGraph(activity) {
        const positionals = this.getActivityPositioning(activity);
        const parentActivity = this.createActivityNode(activity, positionals);
        const childActivities = activity.get('activities');

        this.addActivityNodeToGraph(parentActivity);
        this.addActivityNodeTools(parentActivity, positionals);
        this.addChildActivities(parentActivity, childActivities);
        this.repositionAllActivities();
    }

    /**
     * Recursively adds child activities to a parent activity on the graph. It creates nodes for each child, adds them to the graph,
     * and creates links from the parent to each child. It then calls itself to add any children of the current child activities.
     * Finally, it repositions all child activities to maintain visual consistency.
     *
     * @param {Object} parentActivity - The parent activity to which child activities will be added.
     * @param {Array} [childActivities=[]] - An array of child activity objects to be added. Defaults to an empty array.
     */
    addChildActivities(parentActivity, childActivities = []) {
        if (!isArray(childActivities)) {
            return;
        }
        childActivities.forEach((childActivityObject) => {
            const childPositionals = this.getActivityPositioning(childActivityObject, parentActivity);
            const childActivity = this.createActivityNode(childActivityObject, childPositionals);
            childActivity.set('parentId', parentActivity.get('id'));

            this.addActivityNodeToGraph(childActivity);
            this.addActivityNodeTools(childActivity, childPositionals);
            this.addLinkToGraph(parentActivity, childActivity);
            this.addChildActivities(childActivity, childActivity.get('activities'));
        });
        this.repositionActivities(parentActivity);
    }

    /**
     * Repositions all activities and their child activities.
     *
     * @memberof OrderConfigManagerActivityFlowComponent
     */
    repositionAllActivities() {
        const activities = Object.values(this.flow);
        activities.forEach((parentActivity) => {
            this.repositionActivities(parentActivity);
        });
    }

    /**
     * Creates and adds a link between a parent activity and a child activity on the graph.
     *
     * @param {Object} parentActivity - The activity object representing the source of the link.
     * @param {Object} childActivity - The activity object representing the target of the link.
     * @returns {Object} - The link object that has been added to the graph.
     */
    addLinkToGraph(parentActivity, childActivity) {
        const link = new joint.shapes.standard.Link({
            source: { id: parentActivity.get('id') },
            target: { id: childActivity.get('id') },
        });
        link.addTo(this.graph);
        return link;
    }

    /**
     * Handles activity clicks within the JointJS paper.
     * @param {Object} elementView - The JointJS element view of the clicked activity.
     */
    onActivityClicked(elementView) {
        // Disable editing activity if core service or if cannot view order config
        if (this.config.core_service || this.abilities.cannot('fleet-ops view order-config')) {
            return;
        }
        const { model } = elementView;
        const activity = this.getActivityById(model.id);
        if (activity) {
            const parentActivity = this.getActivityById(activity.get('parentId'));
            this.editActivity(activity, parentActivity);
        }
    }

    /**
     * Get the standard default activities which apply to every order.
     * @returns {Array}
     */
    getDefaultActivities() {
        const created = createFlowActivity('created', 'Order Created', 'New order was created.');
        const dispatched = createFlowActivity('dispatched', 'Order Dispatched', 'Order has been dispatched.');
        const started = createFlowActivity('started', 'Order Started', 'Order has been started');
        return [created, [dispatched, started]];
    }

    /**
     * Initializes the activity flow by either loading from configuration or creating a default flow.
     */
    initializeActivityFlow() {
        const hasFlow = Object.keys(this.config.flow).length > 0;
        if (hasFlow) {
            this.deserializeFlow(this.config.flow);
            this.initializeContext();
            return;
        }

        const defaultActivities = this.getDefaultActivities();
        this.addActivityToGraph(defaultActivities);
        this.initializeContext();
    }

    /**
     * Adds multiple activities to the graph when provided as an array.
     * @param {Array} activities - An array of activities to be added sequentially.
     */
    addMultipleLinearActivities(activities = []) {
        if (!isArray(activities)) {
            return;
        }

        let lastActivity = null;
        activities.forEach((activityObject, index) => {
            if (index > 0 && lastActivity) {
                if (isArray(activityObject)) {
                    let lastChildActivity = null;
                    return activityObject.forEach((childActivityObject, childIndex) => {
                        if (childIndex > 0 && lastChildActivity) {
                            debug('[lastChildActivity]', lastChildActivity);
                            debug('[childActivityObject]', childActivityObject);
                            this.addNewLinkedActivity(lastChildActivity, childActivityObject);
                            return;
                        }
                        const firstChildActivity = this.addNewLinkedActivity(lastActivity, childActivityObject);
                        lastChildActivity = firstChildActivity;
                    });
                }

                this.addNewLinkedActivity(lastActivity, activityObject);
                return;
            }

            const firstActivity = this.addActivityToGraph(activityObject);
            lastActivity = firstActivity;
        });
        return;
    }

    /**
     * Adds a single activity to the graph, optionally using parent activity for positioning.
     * @param {Object} activity - The activity to add.
     * @param {Object} [parentActivity] - The parent activity to use for positioning.
     * @returns {Object} The activity added to the graph.
     */
    addActivityToGraph(activity, parentActivity) {
        if (isArray(activity)) {
            this.addMultipleLinearActivities(activity);
            return;
        }

        const positionals = this.getActivityPositioning(activity, parentActivity);
        const newActivity = this.createActivityNode(activity, positionals);
        if (parentActivity) {
            this.repositionActivities(parentActivity);
        }

        this.addActivityNodeToGraph(newActivity);
        this.addActivityNodeTools(newActivity, positionals);

        return activity;
    }

    /**
     * Adds an activity node to the JointJS graph.
     * @param {Object} activity - The activity whose node is to be added.
     * @returns {Object} The activity added to the graph.
     */
    addActivityNodeToGraph(activity) {
        const activityNode = activity.get('node');
        if (activityNode) {
            activityNode.addTo(this.graph);
        }
        this.addActivityToFlowMap(activity);
        return activity;
    }

    /**
     * Adds the activity to the internal flow mapping.
     * @param {Object} activity - The activity to add to the flow map.
     * @returns {Object} The updated flow map.
     */
    addActivityToFlowMap(activity) {
        this.flow = {
            ...this.flow,
            [activity.get('code')]: activity,
        };
        return this.flow;
    }

    /**
     * Updates an existing activity in the flow map.
     * @param {Object} activity - The activity to update in the flow map.
     * @returns {Object} The updated flow map.
     */
    updateActivityInFlowMap(activity) {
        const flowClone = { ...this.flow };
        flowClone[activity.get('code')] = activity;
        this.flow = flowClone;
        return this.flow;
    }

    /**
     * Creates a new activity node based on the provided activity and positioning data.
     * @param {Object} activity - The activity data.
     * @param {Object} positionals - Positioning information for the activity node.
     * @returns {Object} The created activity node.
     */
    createActivityNode(activity, positionals = {}) {
        const { width, height, x, y } = positionals;
        const wrappedDetails = joint.util.breakText(activity.get('details'), { width });
        const activityNode = new joint.shapes.fleetbase.Activity({
            position: { x, y },
            size: { width, height },
            attrs: {
                pill: {
                    ref: 'code',
                    refWidth: activity.get('code').length * 1.35,
                    refHeight: 5,
                    refX: -5,
                    refY: -2,
                    rx: 5,
                    ry: 5,
                    fill: '#374151',
                    stroke: '#374151',
                    strokeWidth: 1,
                },
                code: { ref: 'pill', text: activity.get('code'), fill: 'white', fontSize: 14, textAnchor: 'left', refX: 15, refY: 20, yAlignment: 'middle' },
                status: { text: activity.get('status'), fill: 'white', fontSize: 14, fontWeight: 'bold', refY: 40, refX: 10, textAnchor: 'left' },
                details: {
                    text: wrappedDetails,
                    fill: 'white',
                    refY: 60,
                    fontSize: 14,
                    refX: 10,
                    textAnchor: 'left',
                },
                body: { fill: activity.get('color'), stroke: '#374151', strokeWidth: 1, rx: 10, ry: 10 },
            },
            interactive: false,
            activity: activity,
        });

        activity.set('id', activityNode.id);
        activity.set('node', activityNode);

        return activity;
    }

    /**
     * Determines the positioning for an activity node.
     * @param {Object} activity - The activity for which to determine positioning.
     * @param {Object} [parentActivity] - The parent activity, if applicable.
     * @returns {Object} Positioning information for the activity node.
     */
    getActivityPositioning(activity, parentActivity) {
        const parentActivities = parentActivity ? parentActivity.get('activities') : [];
        const width = 250;
        const baseHeight = 90;
        const lineHeight = 10;
        const wrappedDetails = joint.util.breakText(activity.get('details'), { width });
        const numberOfLines = wrappedDetails.split('\n').length;
        const height = baseHeight + lineHeight * (numberOfLines - 1);
        let x = 100;
        if (parentActivity) {
            const parentActivityX = parentActivity.get('node').position().x;
            x = parentActivityX + width + 100;
        }
        let y = this.paper.options.height / 2 - height / 2;
        if (parentActivity) {
            const spacing = 50;

            // If there are already child activities, stack the new one below them
            if (parentActivities.length > 0) {
                const lastActivity = parentActivities[parentActivities.length - 1];
                const lastActivityNode = lastActivity.get('node');
                // only if last activity has a node if not then its not added or linked yet so skip
                if (lastActivityNode) {
                    const lastActivityHeight = lastActivityNode.size().height;
                    const lastActivityY = lastActivityNode.position().y;

                    // Calculate new y position
                    y = lastActivityY + lastActivityHeight + spacing;
                }
            }
        }

        return {
            width,
            height,
            x,
            y,
        };
    }

    /**
     * Adds interactive tools (like remove and add buttons) to an activity node.
     * @param {Object} activity - The activity to which tools are to be added.
     * @param {Object} positionals - Positioning information for the tools.
     */
    addActivityNodeTools(activity, positionals = {}) {
        const activityNode = activity.get('node');
        if (!activityNode || this.config.core_service) {
            return;
        }
        const { width } = positionals;
        const removeButton = this.createActivityRemoveButton({ x: width });
        const addButton = this.createAddActivityButton(activity, { x: width });
        let tools = [];

        if (activity.get('code') === 'created' || activity.get('code') === 'dispatched') {
            tools = [];
        }

        if (activity.get('code') === 'started' && this.abilities.can('fleet-ops update order-config')) {
            tools = [addButton];
        }

        if (!this.immutableActivities.includes(activity.get('code')) && this.abilities.can('fleet-ops update order-config')) {
            tools = [removeButton, addButton];
        }

        const activityNodeView = activityNode.findView(this.paper);
        if (activityNodeView) {
            activityNodeView.addTools(
                new joint.dia.ToolsView({
                    tools,
                })
            );
        }
    }

    /**
     * Creates a remove button tool for an activity node.
     * @param {Object} props - Additional properties for the remove button tool.
     * @returns {Object} The remove button tool.
     */
    createActivityRemoveButton(props = {}) {
        const removeButton = new joint.elementTools.Remove({
            offset: { x: 0, y: -1 },
            focusOpacity: 0.5,
            rotate: true,
            y: 0,
            ...props,
            action: (evt, elementView, toolView) => {
                elementView.model.remove({ ui: true, tool: toolView.cid });
                this.removeActivityUsingElementView(elementView);
            },
        });

        return removeButton;
    }

    /**
     * Creates an 'Add' button tool for activity nodes, allowing users to add new linked activities.
     *
     * @param {Object} activity - The activity object to which the 'Add' button will be linked.
     * @param {Object} [props={}] - Additional properties to customize the button's appearance and behavior.
     * @returns {joint.elementTools.Button} - The configured 'Add' button tool.
     */
    createAddActivityButton(activity, props = {}) {
        const addButton = new joint.elementTools.Button({
            markup: [
                {
                    tagName: 'circle',
                    selector: 'button',
                    className: 'flow-activity-add-button',
                    attributes: {
                        r: 12,
                        fill: '#2563eb',
                        stroke: '#2563eb',
                        cursor: 'default',
                    },
                },
                {
                    tagName: 'path',
                    selector: 'icon',
                    attributes: {
                        d: 'M -4 0 L 4 0 M 0 -4 L 0 4',
                        fill: 'none',
                        stroke: '#FFFFFF',
                        strokeWidth: 2,
                        pointerEvents: 'none',
                    },
                },
            ],
            offset: { x: 2, y: 0 },
            focusOpacity: 0.5,
            rotate: true,
            y: '50%',
            ...props,
            action: () => {
                this.createNewActivity(activity);
            },
        });

        return addButton;
    }

    /**
     * Handles the removal of an activity from the graph using its view.
     *
     * @param {joint.dia.ElementView} elementView - The JointJS view for the element to be removed.
     */
    removeActivityUsingElementView(elementView) {
        const deletedActivityId = elementView.model.id;
        const deletedActivity = this.getActivityById(deletedActivityId);
        if (deletedActivity) {
            this.removeActivityFromFlow(deletedActivity);
            const parentActivity = this.getActivityById(deletedActivity.get('parentId'));
            if (parentActivity) {
                this.removeActivityFromParentById(parentActivity, deletedActivityId);
                this.repositionActivities(parentActivity);
            }
        }
    }

    /**
     * Repositions all child activities in relation to the parent activity to maintain a consistent layout.
     *
     * @param {Object} parentActivity - The parent activity whose children will be repositioned.
     */
    repositionActivities(parentActivity) {
        const activities = parentActivity.get('activities').filter((activity) => activity.get('node'));
        if (activities.length === 0) {
            return;
        }

        const spacingY = 50; // Vertical spacing between activities
        const parentY = parentActivity.get('node').position().y;
        const parentHeight = parentActivity.get('node').size().height;

        // Calculate the total height of all activities including spacing
        const totalActivitiesHeight = activities.reduce((total, activity) => {
            return total + activity.get('node').size().height + spacingY;
        }, -spacingY); // Subtract one spacing to account for the first activity not needing a top margin

        // The starting y position centers the block of activities around the parent's y position
        let startY = parentY + parentHeight / 2 - totalActivitiesHeight / 2;

        activities.forEach((activity, index) => {
            const activityHeight = activity.get('node').size().height;
            const yPos = startY + (activityHeight + spacingY) * index;
            activity.get('node').position(activity.get('node').position().x, yPos);
        });

        // If there is only one activity, it should be aligned with the parent's y position
        if (activities.length === 1) {
            const singleActivity = activities[0];
            singleActivity.get('node').position(singleActivity.get('node').position().x, parentY + parentHeight / 2 - singleActivity.get('node').size().height / 2);
        }
    }

    /**
     * Retrieves an activity by its ID from the current flow.
     *
     * @param {string} id - The unique identifier for the activity.
     * @returns {Object|null} - The activity object if found, otherwise null.
     */
    getActivityById(id) {
        if (!id) {
            return null;
        }

        const activities = Object.values(this.flow);
        return activities.find((activity) => {
            return activity.get('id') === id;
        });
    }

    /**
     * Removes an activity from its parent's list of activities by ID.
     *
     * @param {Object} parentActivity - The parent activity object.
     * @param {string} id - The unique identifier of the child activity to be removed.
     */
    removeActivityFromParentById(parentActivity, id) {
        const activities = parentActivity.get('activities');
        const filteredActivities = activities.filter((activity) => activity.get('id') !== id);
        parentActivity.set('activities', filteredActivities);
    }

    /**
     * Removes an activity from the current flow.
     *
     * @param {Object} activity - The activity object to be removed from the flow.
     */
    removeActivityFromFlow(activity) {
        const flowClone = { ...this.flow };
        delete flowClone[activity.get('code')];
        this.flow = flowClone;
    }

    /**
     * Initializes the process to create a new activity, focusing the context panel on the new activity object.
     *
     * @param {Object} targetActivity - The activity object that will serve as the reference for the new activity.
     * @returns {Object} - The newly created activity object.
     */
    createNewActivity(targetActivity) {
        const activity = createFlowActivity();
        return this.editActivity(activity, targetActivity);
    }

    /**
     * Initiates the editing process for a given activity, handling immutable activities accordingly.
     *
     * @param {Object} activity - The activity object to be edited.
     * @param {Object} targetActivity - The target activity object that may be linked to the activity being edited.
     */
    editActivity(activity, targetActivity) {
        // if immutable do nothing
        if (this.immutableActivities.includes(activity.get('code'))) {
            return;
        }

        contextComponentCallback(this, 'onContextChanged', this._createContextualActivity(activity));
        this.contextPanel.focus(activity, 'editing', {
            args: {
                targetActivity,
                onPressCancel: () => {
                    this.contextPanel.clear();
                    contextComponentCallback(this, 'onContextChanged', null);
                },
                onSave: (activity) => {
                    const existingActivity = this.flow[activity.get('code')];

                    // Check if the activity exists and if it's not the same instance being updated
                    if (existingActivity && existingActivity !== activity) {
                        this.notifications.warning(this.intl.t('fleet-ops.component.order-config-manager.activity-flow.edit-activity-unique-code-warning'));
                        return;
                    }

                    contextComponentCallback(this, 'onContextChanged', null);
                    this.contextPanel.clear();
                    this.updateActivityInFlowMap(activity);
                    if (targetActivity) {
                        this.addNewLinkedActivity(targetActivity, activity);
                    }
                },
            },
        });
    }

    /**
     * Creates a contextual activity using ObjectProxy.
     *
     * This function wraps the content of a given activity inside an ObjectProxy,
     * allowing for proxy-based interaction with the activity's content. The function
     * also sets the 'id' of the newly created proxy to the 'internalId' of the activity.
     * This can be useful for tracking or referencing the original activity.
     *
     * @param {Object} activity - The activity object whose content needs to be proxied.
     * @returns {ObjectProxy} The created contextual activity, which is an ObjectProxy instance with the same content as the original activity, but with a reassigned 'id'.
     */
    _createContextualActivity(activity) {
        const contextualActivity = ObjectProxy.create({ content: { ...activity.get('content') } });
        // set persited id to id
        contextualActivity.set('id', activity.get('internalId'));
        return contextualActivity;
    }

    /**
     * Adds a new linked activity to the target activity and updates the graph accordingly.
     *
     * @param {Object} targetActivity - The activity to which the new activity will be linked.
     * @param {Object} activity - The new activity object to be added.
     * @returns {Object} - The newly linked activity object.
     */
    addNewLinkedActivity(targetActivity, activity) {
        // Add the new activity at the top of the stack
        const newActivity = this.addActivityToGraph(activity, targetActivity);
        newActivity.set('parentId', targetActivity.get('id'));

        // Check if target activity has this activity if not add it
        if (!this.parentHasActivity(targetActivity, newActivity)) {
            targetActivity.get('activities').unshiftObject(newActivity);
        }

        // Update positions to stack activities vertically with spacing
        this.repositionActivities(targetActivity);

        // Link the new activity
        const link = new joint.shapes.standard.Link({
            source: { id: targetActivity.get('id') },
            target: { id: newActivity.get('id') },
        });
        link.addTo(this.graph);

        return newActivity;
    }

    /**
     * Checks if a parent activity already contains a specific child activity.
     *
     * @param {Object} parentActivity - The parent activity object.
     * @param {Object} childActivity - The child activity object to check for.
     * @returns {boolean} - True if the parent has the child activity, false otherwise.
     */
    parentHasActivity(parentActivity, childActivity) {
        const activities = parentActivity.get('activities');
        return activities.find((activity) => {
            return childActivity.get('id') === activity.get('id');
        });
    }
}
