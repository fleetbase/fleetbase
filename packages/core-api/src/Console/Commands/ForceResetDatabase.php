<?php

namespace Fleetbase\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ForceResetDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:force-reset {--connection= : The database connection to use}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Disables all foreign key constraints and deletes all tables from the specified or default database connection';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        // Get the connection name or use the default
        $connection = $this->option('connection') ?: config('database.default');

        // If connection is "all"
        if (strtolower($connection) === 'all') {
            $connections = config('database.connections', []);
            foreach ($connections as $connectionName => $connectionConfig) {
                Artisan::call('db:force-reset', ['--connection' => $connectionName]);
                echo Artisan::output();
            }

            return;
        }

        // Set the connection for the schema builder and DB facade
        $schema = Schema::connection($connection);
        $db     = DB::connection($connection);

        $this->info("Using connection: {$connection}");

        // Disable foreign key constraints
        $schema->disableForeignKeyConstraints();

        // Get all table names
        $tables = $db->getDoctrineSchemaManager()->listTableNames();

        // Delete all tables
        foreach ($tables as $table) {
            $schema->drop($table);
            $this->info("Dropped table: {$table}");
        }

        // Re-enable foreign key constraints
        $schema->enableForeignKeyConstraints();

        $this->info('All tables have been dropped successfully.');

        return Command::SUCCESS;
    }
}
