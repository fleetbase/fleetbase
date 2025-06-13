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
            $table->string('company_uuid', 191)->nullable()->index()->after('payload_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('route_segments', function (Blueprint $table) {
            $table->dropColumn('company_uuid');
        });
    }
};
