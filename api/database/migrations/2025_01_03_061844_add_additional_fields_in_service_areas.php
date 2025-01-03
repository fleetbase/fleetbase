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
        Schema::table('service_areas', function (Blueprint $table) {
            $table->json('address')->nullable();
            $table->integer('location_ref')->nullable();
            $table->string('telephone', 50)->nullable();
            $table->point('location')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_areas', function (Blueprint $table) {
            $table->dropColumn('address');
            $table->dropColumn('location_ref');
            $table->dropColumn('telephone');
            $table->dropColumn('location');
        });
    }
};
