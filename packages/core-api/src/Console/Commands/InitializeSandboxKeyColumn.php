<?php

namespace Fleetbase\Console\Commands;

use Fleetbase\Models\ApiCredential;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class InitializeSandboxKeyColumn extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sandbox:init-key';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Adds the `_key` column to every table to assosciate api credentials to table';

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
        $skipTables = ApiCredential::$skipTables;
        $tables     = DB::connection('sandbox')
            ->getDoctrineSchemaManager()
            ->listTableNames();

        foreach ($tables as $tableName) {
            if (in_array($tableName, $skipTables) || Str::startsWith($tableName, 'telescope')) {
                continue;
            }

            if (!Schema::connection('sandbox')->hasColumn($tableName, '_key')) {
                Schema::connection('sandbox')->table($tableName, function ($table) {
                    $table
                        ->string('_key')
                        ->nullable()
                        ->after('id');
                });
            }
        }

        $tables = DB::connection('mysql')
            ->getDoctrineSchemaManager()
            ->listTableNames();

        foreach ($tables as $tableName) {
            $firstColumn = Arr::first(Schema::getColumnListing($tableName));

            if (!Schema::connection('mysql')->hasColumn($tableName, '_key')) {
                Schema::connection('mysql')->table($tableName, function ($table) use ($firstColumn) {
                    $table
                        ->string('_key')
                        ->nullable()
                        ->after($firstColumn);
                });
            }
        }

        $this->info('`_key` column added to all tables');
    }
}
