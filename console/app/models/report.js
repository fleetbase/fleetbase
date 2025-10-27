import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { isArray } from '@ember/array';
import { getOwner } from '@ember/application';
import { isPresent, isEmpty } from '@ember/utils';
import { format, formatDistanceToNow } from 'date-fns';

export default class ReportModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') created_by_uuid;
    @attr('string') category_uuid;
    @attr('string') subject_uuid;

    /** @attributes */
    @attr('string') subject_type;
    @attr('string') title;
    @attr('string') description;
    @attr('date') period_start;
    @attr('date') period_end;
    @attr('date') last_executed_at;
    @attr('number') execution_time;
    @attr('number') row_count;
    @attr('boolean') is_scheduled;
    @attr('boolean') is_generated;
    @attr('string') status;
    @attr('string') type;
    @attr('raw') export_formats;
    @attr('raw') schedule_config;
    @attr('raw') data;
    @attr('raw') result_columns;
    @attr('raw') query_config;
    @attr('raw') tags;
    @attr('raw') options;
    @attr('raw') meta;
    @attr('string') status;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @relationships */
    // @belongsTo('company') company;
    // @belongsTo('user') createdBy;
    // @hasMany('report-execution') executions;
    // @hasMany('report-audit-log') auditLogs;

    fillResult(result = {}) {
        this.setProperties({
            result_columns: result?.columns ?? [],
            data: result?.data ?? [],
            meta: result?.meta ?? {},
            row_count: result?.meta?.total_rows ?? 0,
            execution_time: result?.meta?.execution_time_ms ?? -1,
            last_executed_at: new Date(),
            is_generated: true,
        });
    }

    /** @computed */
    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return format(this.updated_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('query_config.columns.length', 'query_config.table.name') get hasValidConfig() {
        return (
            isPresent(this.query_config) &&
            isPresent(this.query_config.table) &&
            isPresent(this.query_config.table.name) &&
            isArray(this.query_config.columns) &&
            this.query_config.columns.length > 0
        );
    }

    @computed('query_config.table.name') get tableName() {
        return this.query_config?.table?.name || '';
    }

    @computed('query_config.table.label', 'tableName') get tableLabel() {
        return this.query_config?.table?.label || this.tableName;
    }

    @computed('query_config.columns.[]') get selectedColumns() {
        return this.query_config?.columns || [];
    }

    @computed('selectedColumns.[]', 'query_config.joins.[]') get totalSelectedColumns() {
        let count = this.selectedColumns.length;

        // Add columns from joins
        if (isArray(this.query_config?.joins)) {
            this.query_config.joins.forEach((join) => {
                if (isArray(join.selectedColumns)) {
                    count += join.selectedColumns.length;
                }
            });
        }

        return count;
    }

    @computed('query_config.joins.[]') get hasJoins() {
        return isArray(this.query_config?.joins) && this.query_config.joins.length > 0;
    }

    @computed('hasJoins', 'query_config.joins.[]') get joinedTables() {
        if (!this.hasJoins) {
            return [];
        }

        return this.query_config.joins.map((join) => ({
            table: join.table,
            label: join.label || join.table,
            type: join.type,
            columnsCount: join.selectedColumns?.length || 0,
        }));
    }

    @computed('query_config.conditions.[]') get hasConditions() {
        return isArray(this.query_config?.conditions) && this.query_config.conditions.length > 0;
    }

    @computed('hasConditions', 'query_config.conditions.[]') get conditionsCount() {
        if (!this.hasConditions) {
            return 0;
        }

        return this.countConditionsRecursively(this.query_config.conditions);
    }

    @computed('query_config.groupBy.[]') get hasGrouping() {
        return isArray(this.query_config?.groupBy) && this.query_config.groupBy.length > 0;
    }

    @computed('query_config.sortBy.[]') get hasSorting() {
        return isArray(this.query_config?.sortBy) && this.query_config.sortBy.length > 0;
    }

    @computed('query_config.limit') get hasLimit() {
        return isPresent(this.query_config?.limit) && this.query_config.limit > 0;
    }

    @computed('conditionsCount', 'hasGrouping', 'hasJoins', 'joinedTables.length', 'totalSelectedColumns') get complexity() {
        let score = 0;

        score += this.totalSelectedColumns;
        score += this.hasJoins ? this.joinedTables.length * 3 : 0;
        score += this.conditionsCount * 2;
        score += this.hasGrouping ? 5 : 0;

        if (score < 10) {
            return 'simple';
        } else if (score < 25) {
            return 'moderate';
        } else {
            return 'complex';
        }
    }

    @computed('complexity', 'totalSelectedColumns', 'joinedTables.length') get estimatedPerformance() {
        if (this.complexity === 'simple' && this.totalSelectedColumns <= 10) {
            return 'fast';
        } else if (this.complexity === 'moderate' && this.joinedTables.length <= 2) {
            return 'moderate';
        } else {
            return 'slow';
        }
    }

    @computed('last_executed_at') get lastExecutedDisplay() {
        if (!this.last_executed_at) {
            return 'Never executed';
        }

        return this.last_executed_at.toLocaleDateString() + ' ' + this.last_executed_at.toLocaleTimeString();
    }

    @computed('average_execution_time') get averageExecutionTimeDisplay() {
        if (!this.average_execution_time) {
            return 'N/A';
        }

        if (this.average_execution_time < 1000) {
            return `${Math.round(this.average_execution_time)}ms`;
        } else {
            return `${(this.average_execution_time / 1000).toFixed(2)}s`;
        }
    }

    @computed('execution_count') get executionCountDisplay() {
        return this.execution_count || 0;
    }

    @computed('last_result_count') get lastResultCountDisplay() {
        if (this.last_result_count === null || this.last_result_count === undefined) {
            return 'N/A';
        }

        return this.last_result_count.toLocaleString();
    }

    @computed('export_formats.[]') get availableExportFormats() {
        return this.export_formats || ['csv', 'excel', 'json'];
    }

    @computed('tags.[]') get tagsList() {
        return this.tags || [];
    }

    @computed('shared_with.[]') get sharedWithList() {
        return this.shared_with || [];
    }

    @computed('is_scheduled', 'next_scheduled_run', 'schedule_frequency', 'schedule_timezone') get scheduleInfo() {
        if (!this.is_scheduled) {
            return null;
        }

        return {
            frequency: this.schedule_frequency,
            nextRun: this.next_scheduled_run,
            timezone: this.schedule_timezone || 'UTC',
        };
    }

    @computed('hasConditions', 'query_config.conditions.[]') get conditionsSummary() {
        if (!this.hasConditions) {
            return [];
        }

        return this.extractConditionsSummary(this.query_config.conditions);
    }

    @computed('status') get statusDisplay() {
        const statusMap = {
            draft: 'Draft',
            active: 'Active',
            archived: 'Archived',
            error: 'Error',
        };

        return statusMap[this.status] || this.status;
    }

    @computed('status') get statusClass() {
        const statusClasses = {
            draft: 'status-draft',
            active: 'status-active',
            archived: 'status-archived',
            error: 'status-error',
        };

        return statusClasses[this.status] || 'status-unknown';
    }

    // Helper methods
    countConditionsRecursively(conditions) {
        let count = 0;

        if (!isArray(conditions)) {
            return count;
        }

        conditions.forEach((condition) => {
            if (condition.conditions) {
                count += this.countConditionsRecursively(condition.conditions);
            } else {
                count++;
            }
        });

        return count;
    }

    extractConditionsSummary(conditions, summary = []) {
        if (!isArray(conditions)) {
            return summary;
        }

        conditions.forEach((condition) => {
            if (condition.conditions) {
                this.extractConditionsSummary(condition.conditions, summary);
            } else if (condition.field && condition.operator) {
                summary.push({
                    field: condition.field.label || condition.field.name,
                    operator: condition.operator.label || condition.operator.value,
                    value: condition.value,
                    table: condition.field.table || this.tableName,
                });
            }
        });

        return summary;
    }

    // API methods for interacting with the new backend
    async execute() {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const response = await fetch.post(this.id ? `reports/${this.id}/execute` : 'reports/execute-query', { query_config: this.query_config });
            return response;
        } catch (error) {
            throw error;
        }
    }

    // API methods for interacting with the new backend
    async executeQuery() {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const response = await fetch.post('reports/execute-query', { query_config: this.query_config });
            return response;
        } catch (error) {
            throw error;
        }
    }

    async export(format = 'csv', options = {}) {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const response = await fetch.post(`reports/${this.id}/export`, {
                format,
                options,
            });

            return response;
        } catch (error) {
            throw error;
        }
    }

    async validate() {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const response = await fetch.post('reports/validate-query', {
                query_config: this.query_config,
            });

            return response;
        } catch (error) {
            throw error;
        }
    }

    async analyze() {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const response = await fetch.post('reports/analyze-query', {
                query_config: this.query_config,
            });

            return response;
        } catch (error) {
            throw error;
        }
    }

    // Static methods for direct query operations
    static async executeQuery(queryConfig) {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const response = await fetch.post('reports/execute-query', {
                query_config: queryConfig,
            });

            return response;
        } catch (error) {
            throw error;
        }
    }

    static async exportQuery(queryConfig, format = 'csv', options = {}) {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const response = await fetch('reports/export-query', {
                query_config: queryConfig,
                format,
                options,
            });

            return response;
        } catch (error) {
            throw error;
        }
    }

    static async validateQuery(queryConfig) {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const response = await fetch.post('reports/validate-query', { query_config: queryConfig });
            return response;
        } catch (error) {
            throw error;
        }
    }

    static async analyzeQuery(queryConfig) {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const response = await fetch.post('reports/analyze-query', { query_config: queryConfig });
            return response;
        } catch (error) {
            throw error;
        }
    }

    static async getTables() {
        try {
            const { tables } = await fetch.get('reports/tables');
            return tables;
        } catch (error) {
            throw error;
        }
    }

    static async getTableSchema(tableName) {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const { schema } = await fetch.get(`reports/tables/${tableName}/schema`);
            return schema;
        } catch (error) {
            throw error;
        }
    }

    static async getExportFormats() {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const { formats } = await fetch.get('reports/export-formats');
            return formats;
        } catch (error) {
            throw error;
        }
    }

    // Utility methods for frontend display
    getComplexityBadgeClass() {
        const complexityClasses = {
            simple: 'badge-success',
            moderate: 'badge-warning',
            complex: 'badge-danger',
        };

        return complexityClasses[this.complexity] || 'badge-secondary';
    }

    getPerformanceBadgeClass() {
        const performanceClasses = {
            fast: 'badge-success',
            moderate: 'badge-warning',
            slow: 'badge-danger',
        };

        return performanceClasses[this.estimatedPerformance] || 'badge-secondary';
    }

    getQuerySummary() {
        const parts = [];

        parts.push(`${this.totalSelectedColumns} columns from ${this.tableLabel}`);

        if (this.hasJoins) {
            parts.push(`${this.joinedTables.length} joins`);
        }

        if (this.hasConditions) {
            parts.push(`${this.conditionsCount} conditions`);
        }

        if (this.hasGrouping) {
            parts.push('grouped');
        }

        if (this.hasSorting) {
            parts.push('sorted');
        }

        if (this.hasLimit) {
            parts.push(`limited to ${this.query_config.limit} rows`);
        }

        return parts.join(', ');
    }
}
