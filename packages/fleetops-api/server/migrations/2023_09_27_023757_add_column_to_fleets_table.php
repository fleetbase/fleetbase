<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('fleets', function (Blueprint $table) {
            $table->uuid('vendor_uuid')->after('zone_uuid')->nullable();
            $table->uuid('parent_fleet_uuid')->after('vendor_uuid')->nullable();
            $table->foreign('vendor_uuid')
                ->references('uuid')
                ->on('vendors')
                ->onDelete('CASCADE')
                ->onUpdate('CASCADE');
            $table->foreign('parent_fleet_uuid')
            ->references('uuid')
            ->on('fleets')
            ->onDelete('CASCADE')
            ->onUpdate('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('fleets', function (Blueprint $table) {
            $table->dropForeign(['vendor_uuid']);
            $table->dropForeign(['parent_fleet_uuid']);
            $table->dropColumn('vendor_uuid');
            $table->dropColumn('parent_fleet_uuid');
        });
    }
};
