<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payloads', function (Blueprint $table) {
             $table->string('current_waypoint_table_id', 55)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payloads', function (Blueprint $table) {
              $table->dropColumn('current_waypoint_table_id');
        });
    }
};
