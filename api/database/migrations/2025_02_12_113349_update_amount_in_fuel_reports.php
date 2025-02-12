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
            $table->decimal('amount', 10, 2)->nullable()->default(null)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fuel_reports', function (Blueprint $table) {
            // Revert to previous type if needed, update accordingly
            $table->float('amount')->nullable()->default(null)->change();
        });
    }
};
