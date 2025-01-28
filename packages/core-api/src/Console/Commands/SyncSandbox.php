<?php

namespace Fleetbase\Console\Commands;

use Fleetbase\Support\Utils;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SyncSandbox extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sandbox:sync {--truncate}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync production properties to sandbox for development';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $truncate = Utils::castBoolean($this->option('truncate'));

        Schema::connection('sandbox')->disableForeignKeyConstraints();

        if ($truncate) {
            DB::connection('sandbox')
                ->table('users')
                ->truncate();
            DB::connection('sandbox')
                ->table('companies')
                ->truncate();
            DB::connection('sandbox')
                ->table('api_credentials')
                ->truncate();
        }

        // Models that need to be synced from Production to Sandbox
        $syncable = [\Fleetbase\Models\User::class, \Fleetbase\Models\Company::class, \Fleetbase\Models\ApiCredential::class];

        // Sync each syncable data model
        foreach ($syncable as $model) {
            // Get all records from production
            $all = $model::on('mysql')->withoutGlobalScopes();

            if (class_basename($model) === 'ApiCredential') {
                $all->where('test_mode', 1);
            }

            $all = $all->get();

            // compare count, if prod companies is greater than sandbox, then sync
            foreach ($all as $record) {
                // Clone record
                $clone = collect($record->toArray())
                    ->only($record->getFillable())
                    ->toArray();

                if (!isset($clone['uuid']) || !is_string($clone['uuid'])) {
                    continue;
                }

                // if ends with _at assume datetime column
                foreach ($clone as $key => $value) {
                    if (isset($clone[$key]) && Str::endsWith($key, '_at')) {
                        $clone[$key] = Carbon::fromString($clone[$key])->toDateTimeString();
                    }
                }

                // serialize any json type columns
                $jsonColumns = collect($record->getCasts())->filter(function ($value) {
                    return Str::contains($value, 'Json');
                })->keys()->toArray();

                foreach ($clone as $key => $value) {
                    if (in_array($key, $jsonColumns) && (is_object($value) || is_array($value))) {
                        $clone[$key] = json_encode($value);
                    }
                }

                DB::connection('sandbox')
                    ->table($record->getTable())
                    ->updateOrInsert(['uuid' => $clone['uuid']], $clone);

                /** @var \Fleetbase\Models\Model * */
                $sandboxRecord = $model::on('sandbox')
                    ->where('uuid', $clone['uuid'])
                    ->first();

                // Inform
                if ($sandboxRecord) {
                    $this->line(class_basename($model) . ': ' . Utils::or($sandboxRecord, ['name', 'public_id', 'uuid', 'id']) . ($sandboxRecord->email ? ' (' . $sandboxRecord->email . ')' : '') . ' cloned and synced to sandbox');
                }
            }
        }

        Schema::connection('sandbox')->enableForeignKeyConstraints();

        // // no test mode api credentials on
        // DB::table('api_credentials')
        //     ->where('test_mode', 1)
        //     ->delete();

        $this->info('Sync completed.');
    }
}
