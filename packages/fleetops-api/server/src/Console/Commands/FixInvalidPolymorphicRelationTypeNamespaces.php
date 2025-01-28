<?php

namespace Fleetbase\FleetOps\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;

class FixInvalidPolymorphicRelationTypeNamespaces extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetops:fix-invalid-polymorphic-relation-type-namespaces';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fixes invalid namespaces in polymorphic relations across multiple models';

    /**
     * Handle the console command execution.
     *
     * Iterates over a predefined list of models and their respective polymorphic columns,
     * calling a method to fix invalid namespace references in these polymorphic relations.
     * This allows correction across multiple models in a single command execution.
     *
     * @return void
     */
    public function handle()
    {
        $models = [
            ['model' => \Fleetbase\FleetOps\Models\Order::class, 'columns' => ['customer_type', 'facilitator_type']],
            ['model' => \Fleetbase\FleetOps\Models\Place::class, 'columns' => ['owner_type']],
            ['model' => \Fleetbase\FleetOps\Models\Entity::class, 'columns' => ['customer_type']],
            ['model' => \Fleetbase\FleetOps\Models\PurchaseRate::class, 'columns' => ['customer_type']],
        ];

        foreach ($models as $modelConfig) {
            $this->fixModelRelations($modelConfig['model'], $modelConfig['columns']);
        }
    }

    /**
     * Fixes invalid namespace references in polymorphic relations for a specific model.
     *
     * Given a model class and an array of its polymorphic relation columns, this method
     * iterates through each record of the model, correcting any invalid namespaces in
     * these columns. It outputs information about the process, including the number of
     * records updated. This function is designed to be reusable for different models.
     *
     * @param string $modelClass the class name of the model to be processed
     * @param array  $columns    an array of column names that have polymorphic relations
     */
    protected function fixModelRelations(string $modelClass, array $columns): void
    {
        $modelInstance = new $modelClass();
        $modelName     = class_basename($modelInstance);

        $this->info("Processing $modelName...");

        $records = $modelInstance::query();
        foreach ($columns as $column) {
            $records->orWhereNotNull($column);
        }
        $records      = $records->get();
        $updatedCount = 0;
        $this->alert('Checking ' . $records->count() . ' ' . Str::plural($modelName, $records->count()) . ' for invalid polymorphic relation type namespaces.');

        foreach ($records as $record) {
            foreach ($columns as $column) {
                if (isset($record->$column)) {
                    $original           = $record->$column;
                    $normalizedOriginal = ltrim($original, '\\');

                    if (Str::startsWith($normalizedOriginal, 'Fleetbase\Models')) {
                        $newNamespace    = Str::replaceFirst('Fleetbase\Models', 'Fleetbase\FleetOps\Models', $normalizedOriginal);
                        $record->$column = $newNamespace;
                        $updatedCount++;

                        $this->info("{$modelName} ID {$record->id}: Corrected namespace from '$original' to '$newNamespace'.");
                    }
                }
            }

            if ($record->isDirty()) {
                $record->save();
                $this->info("Saved changes for $modelName ID {$record->public_id}.");
            }
        }

        $this->info("Finished processing $modelName. Total updated records: $updatedCount.");
    }
}
