import Application from '@fleetbase/console/app';
import config from '@fleetbase/console/config/environment';
import * as QUnit from 'qunit';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { start } from 'ember-qunit';
import { forceModulesToBeLoaded, sendCoverage } from 'ember-cli-code-coverage/test-support';

setApplication(Application.create(config.APP));

setup(QUnit.assert);

// ember-cli-code-coverage instruments the build when COVERAGE=true, but it only writes a
// report if the suite posts window.__coverage__ back to the /write-coverage endpoint.
// Without this hook the run produces no coverage/ output at all.
QUnit.done(async function () {
    if (typeof window.__coverage__ === 'undefined') {
        return;
    }

    // Pull in modules no test happened to import, so untested files are reported as 0%
    // rather than omitted from the denominator entirely.
    forceModulesToBeLoaded();
    await sendCoverage();
});

start();
