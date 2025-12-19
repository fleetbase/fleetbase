import setupDeprecationWorkflow from 'ember-cli-deprecation-workflow';

setupDeprecationWorkflow({
    workflow: [
        { handler: 'silence', matchId: 'ember-concurrency.deprecate-decorator-task' },
        { handler: 'silence', matchId: 'new-helper-names' },
        { handler: 'silence', matchId: 'ember-data:deprecate-non-strict-relationships' },
    ],
});
