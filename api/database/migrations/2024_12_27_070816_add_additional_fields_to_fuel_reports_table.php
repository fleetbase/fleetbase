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
        Schema::table('fuel_reports', function (Blueprint $table) {
            $table->enum('report_type', ['Fuel', 'Toll', 'Parking'])->after('report')->default('fuel');
            $table->enum('payment_method', ['Card', 'Other'])->after('report_type')->default('card');
            $table->string('card_type', 255)->after('payment_method')->nullable();    //
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fuel_reports', function (Blueprint $table) {
            $table->dropColumn('report_type');
            $table->dropColumn('payment_method');
            $table->dropColumn('card_type');
        });
    }
};
