import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class OnboardingOrchestratorService extends Service {
    @service onboardingRegistry;
    @service onboardingContext;

    @tracked flow = null;
    @tracked wrapper = null;
    @tracked current = null;
    @tracked history = [];
    @tracked sessionId = null;

    /**
     * localStorage key for persisting navigation history
     */
    get historyStorageKey() {
        return `onboarding:history:${this.flow?.id || 'default'}`;
    }

    async start(flowId = null, opts = {}) {
        const flow = this.onboardingRegistry.getFlow(flowId ?? this.onboardingRegistry.defaultFlow);
        if (!flow) throw new Error(`Onboarding flow '${flowId}' not found`);
        
        this.flow = flow;
        this.wrapper = flow.wrapper || null;
        this.sessionId = opts.sessionId || null;
        this.history = [];

        // Restore history if resuming from a previous session
        if (opts.resume) {
            this._restoreHistory();
        }

        // Execute onFlowWillStart hook if defined
        if (typeof this.flow.onFlowWillStart === 'function') {
            await this.flow.onFlowWillStart(this.flow, this);
        }

        await this.goto(flow.entry);

        // Execute onFlowDidStart hook if defined
        if (typeof this.flow.onFlowDidStart === 'function') {
            await this.flow.onFlowDidStart(this.flow, this);
        }
    }

    async goto(stepId) {
        if (!this.flow) throw new Error('No active onboarding flow');
        const step = this.flow.steps.find((s) => s.id === stepId);
        if (!step) throw new Error(`Step '${stepId}' not found`);

        // Execute onStepWillChange hook if defined
        const previousStep = this.current;
        if (typeof this.flow.onStepWillChange === 'function') {
            await this.flow.onStepWillChange(step, previousStep, this);
        }

        // Guard function - skip step if guard returns false
        if (typeof step.guard === 'function' && !step.guard(this.onboardingContext)) {
            return this.next();
        }

        // beforeEnter lifecycle hook
        if (typeof step.beforeEnter === 'function') {
            await step.beforeEnter(this.onboardingContext);
        }

        this.current = step;

        // Execute onStepDidChange hook if defined
        if (typeof this.flow.onStepDidChange === 'function') {
            await this.flow.onStepDidChange(this.current, previousStep, this);
        }
    }

    async next() {
        if (!this.flow || !this.current) return;

        const leaving = this.current;
        
        // afterLeave lifecycle hook
        if (typeof leaving.afterLeave === 'function') {
            await leaving.afterLeave(this.onboardingContext);
        }

        if (!this.history.includes(leaving)) {
            this.history.push(leaving);
            this._persistHistory();
        }

        // Support both string and function for next property
        let nextId;
        if (typeof leaving.next === 'function') {
            nextId = leaving.next(this.onboardingContext);
        } else {
            nextId = leaving.next;
        }

        // If no next step, flow is complete
        if (!nextId) {
            // Execute onFlowWillEnd hook if defined
            if (typeof this.flow.onFlowWillEnd === 'function') {
                await this.flow.onFlowWillEnd(leaving, this);
            }

            this.current = null; // finished

            // Execute onFlowDidEnd hook if defined
            if (typeof this.flow.onFlowDidEnd === 'function') {
                await this.flow.onFlowDidEnd(leaving, this);
            }

            // Clear history from localStorage when flow completes
            this._clearHistory();

            return;
        }

        return this.goto(nextId);
    }

    async back() {
        if (!this.flow || this.history.length === 0) return;
        const prev = this.history[this.history.length - 1];
        if (prev && prev.allowBack === false) return;
        this.history = this.history.slice(0, -1);
        this._persistHistory();
        await this.goto(prev.id);
    }

    /**
     * Get the current path (for flows with multiple paths)
     * This is a helper method that can be used by flows to determine the current path
     */
    getCurrentPath() {
        if (!this.flow || !this.flow.paths) return null;
        
        // Determine path based on context or current step
        for (const [pathId, pathDef] of Object.entries(this.flow.paths)) {
            if (pathDef.steps && pathDef.steps.some(s => s.id === this.current?.id)) {
                return pathDef;
            }
        }
        
        return null;
    }

    /**
     * Check if a step is in the current path
     */
    isStepInPath(stepId) {
        const currentPath = this.getCurrentPath();
        if (!currentPath) return true; // If no paths defined, all steps are valid
        
        return currentPath.steps?.some(s => s.id === stepId) ?? false;
    }

    /**
     * Persist navigation history to localStorage
     * Stores only step IDs to keep storage lightweight
     * @private
     */
    _persistHistory() {
        if (!this.flow) return;
        
        try {
            const historyIds = this.history.map(step => step.id);
            localStorage.setItem(this.historyStorageKey, JSON.stringify(historyIds));
        } catch (error) {
            console.warn('[OnboardingOrchestrator] Failed to persist history:', error);
        }
    }

    /**
     * Restore navigation history from localStorage
     * Reconstructs step objects from stored IDs
     * @private
     */
    _restoreHistory() {
        if (!this.flow) return;
        
        try {
            const stored = localStorage.getItem(this.historyStorageKey);
            if (!stored) return;
            
            const historyIds = JSON.parse(stored);
            this.history = historyIds
                .map(id => this.flow.steps.find(s => s.id === id))
                .filter(Boolean); // Remove any invalid steps
            
            console.log('[OnboardingOrchestrator] Restored history:', this.history.map(s => s.id));
        } catch (error) {
            console.warn('[OnboardingOrchestrator] Failed to restore history:', error);
            this.history = [];
        }
    }

    /**
     * Clear navigation history from localStorage
     * Called when flow completes or is reset
     * @private
     */
    _clearHistory() {
        if (!this.flow) return;
        
        try {
            localStorage.removeItem(this.historyStorageKey);
        } catch (error) {
            console.warn('[OnboardingOrchestrator] Failed to clear history:', error);
        }
    }
}
