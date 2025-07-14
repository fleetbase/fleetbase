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
            $table->text('cr_id')->nullable();
            $table->string('shipper_accounts')->nullable()->index();
            $table->string('equipment_type')->nullable()->index();
            $table->dateTime('vr_creation_date_time')->nullable();
            $table->dateTime('vr_cancellation_date_time')->nullable();
            $table->string('trailer_id')->nullable()->index();
            $table->string('operator_id')->nullable()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
         Schema::table('route_segments', function (Blueprint $table) {
            $table->dropColumn([
                'cr_id',
                'shipper_accounts',
                'equipment_type',
                'vr_creation_date_time',
                'vr_cancellation_date_time',
                'trailer_id',
                'operator_id',
            ]);
        });
    }
};
