<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LanguageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $languages = [
            ['name' => 'English',     'code' => 'en'],
            ['name' => 'German',      'code' => 'de'],
            ['name' => 'Spanish',     'code' => 'es'],
            ['name' => 'French',      'code' => 'fr'],
            ['name' => 'Italian',     'code' => 'it'],
            ['name' => 'Polish',      'code' => 'pl'],
            ['name' => 'Vietnamese',  'code' => 'vi'],
        ];

        foreach ($languages as $index => $lang) {
            DB::table('languages')->insert([
                'company_uuid'    => null,
                'name'            => $lang['name'],
                'code'            => $lang['code'],
                'sort_order'      => $index + 1, // fills as 1, 2, 3, ...
                'record_status'   => 1,
                'deleted'         => 0,
                'created_by_id'   => null,
                'updated_by_id'   => null,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }
    
    }
}
