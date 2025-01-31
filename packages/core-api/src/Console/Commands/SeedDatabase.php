<?php

namespace Fleetbase\Console\Commands;

use Fleetbase\Support\Utils;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class SeedDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetbase:seed {--class}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run the Fleetbase seeder';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $class = $this->option('class');

        if ($class) {
            Artisan::call(
                'db:seed',
                [
                    '--class' => 'Fleetbase\\Seeders\\' . $class,
                ]
            );
            $this->info('Fleetbase ' . $class . ' Seeder was run Successfully!');
        } else {
            Artisan::call(
                'db:seed',
                [
                    '--class' => 'Fleetbase\\Seeders\\FleetbaseSeeder',
                ]
            );

            // seed for extensions
            $extensionSeeders = Utils::getSeedersFromExtensions();
            foreach ($extensionSeeders as $seeder) {
                // Manually include the seeder file
                require_once $seeder['path'];

                // Instantiate the seeder class and run it
                $seederInstance = new $seeder['class']();
                $seederInstance->run();
            }

            $this->info('Fleetbase Seeders were run Successfully!');
        }
    }
}
