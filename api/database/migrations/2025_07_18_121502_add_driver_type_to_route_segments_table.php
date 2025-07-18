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
        Schema::table('route_segments', function (Blueprint $table) {
            $table->string('driver_type')->nullable();
            $table->string('truck_filter')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('route_segments', function (Blueprint $table) {
            $table->dropColumn('driver_type');
        });
    }
};
