// scripts/ci/seed-demo-org.php
//
// CI helper: bootstrap the organization the screenshot capture logs in as.
//
// This file is NOT a standalone script. Like scripts/ci/mint-api-key.php, it is
// base64-encoded and eval()'d inside `php artisan tinker --execute="eval(base64_decode('...'));"`.
// Piping a file that begins with a <?php tag to tinker triggers a PsySH parse error
// ("unexpected '<'"), so this snippet intentionally OMITS the opening <?php tag and uses
// fully-qualified class names instead of `use` statements.
//
// Why it is needed at all: api/deploy.sh runs migrate / seed / create-permissions, but none
// of those create a Company, and two things downstream require one.
//
//   * The Fleet-Ops seeders resolve their tenant through ResolvesSeedCompany and abort with
//     "No company found" when there is not one.
//   * OnboardController::shouldOnboard() answers `Company::doesntExist()`, and the console
//     redirects every route to /onboard while that is true — so without this, a capture run
//     produces a directory of identical onboarding-wizard screenshots and still exits 0.
//
// Creating the Company is therefore what flips the install out of onboarding. Nothing else
// here needs to touch a setting to achieve that.
//
// Idempotent: rerunning against an already-seeded stack reasserts the same rows rather than
// duplicating them, so re-running a failed workflow does not need a clean database.

try {
    $identity = getenv('CI_DEMO_IDENTITY') ?: 'demo@fleetbase.io';
    $password = getenv('CI_DEMO_PASSWORD');
    $orgName  = getenv('CI_DEMO_ORG_NAME') ?: 'Fleetbase Demo';

    if (empty($password)) {
        // Refuse to invent one. A generated password would authenticate this run and then be
        // unreachable, so the capture step's login would fail with "invalid_credentials" and
        // nothing about that error would point back here.
        throw new \RuntimeException('CI_DEMO_PASSWORD is not set; pass it with `docker compose exec -e`.');
    }

    $company = \Fleetbase\Models\Company::firstOrCreate(['name' => $orgName]);

    $user = \Fleetbase\Models\User::where('email', $identity)->withoutGlobalScopes()->first();
    if (!$user) {
        $user               = new \Fleetbase\Models\User();
        $user->email        = $identity;
        $user->company_uuid = $company->uuid;
    }

    // Reasserted on every run: a previous session (or a human poking at the demo stack) can
    // leave the account in a state the next run cannot log into. `password` is guarded against
    // mass assignment, so direct assignment is what runs the hashing mutator.
    $user->name     = 'Fleetbase Demo';
    $user->type     = 'user';
    $user->status   = 'active';
    $user->password = $password;
    $user->save();

    // Ownership BEFORE membership, and the order is load-bearing. User::assignCompany() checks
    // isNotAdmin() && !isCompanyOwner($company) and, when both hold, sends an invite email and
    // notifies the owner. Establishing ownership first makes that branch unreachable, so a CI
    // stack with a real mail transport configured does not send anything.
    if (empty($company->owner_uuid)) {
        $company->setOwner($user, true);
        $company->save();
    }

    // Creates the CompanyUser pivot the organization switcher reads, and assigns the
    // Administrator role — which is what grants the Fleet-Ops policies created by
    // `php artisan fleetbase:create-permissions`. Without the role the console renders empty
    // tables, which would screenshot as a successful but useless run.
    $user->assignCompany($company, 'Administrator');

    echo PHP_EOL . 'DEMO_COMPANY_ID=' . $company->public_id . PHP_EOL;
    echo 'DEMO_USER_ID=' . $user->public_id . PHP_EOL;
    echo 'DEMO_IDENTITY=' . $user->email . PHP_EOL;
} catch (\Throwable $e) {
    // Mirrors mint-api-key.php's MINT_ERROR protocol: the whole snippet runs inside one try,
    // so the first throw silently skips everything after it. Make that loud — the workflow
    // greps for this line and fails the step.
    echo PHP_EOL . 'DEMO_ERROR=' . $e->getMessage() . PHP_EOL;
    echo $e->getTraceAsString() . PHP_EOL;
}
