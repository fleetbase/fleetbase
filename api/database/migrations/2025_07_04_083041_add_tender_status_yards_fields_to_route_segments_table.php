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
        $table->string('tender_status')->nullable(); // PLANNED, APPROVED, etc.
        $table->string('facility_sequence')->nullable(); // Example: EUK5->DUS2

        $table->dateTime('stop_1_yard_arrival')->nullable();
        $table->dateTime('stop_1_yard_departure')->nullable();
        $table->dateTime('stop_2_yard_arrival')->nullable();
        $table->dateTime('stop_2_yard_departure')->nullable();
        $table->dateTime('stop_3_yard_arrival')->nullable();
        $table->dateTime('stop_3_yard_departure')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('route_segments', function (Blueprint $table) {
        $table->dropColumn([
            'tender_status',
            'facility_sequence',
            'stop_1_yard_arrival',
            'stop_1_yard_departure',
            'stop_2_yard_arrival',
            'stop_2_yard_departure',
            'stop_3_yard_arrival',
            'stop_3_yard_departure',
        ]);
        });
    }
};
