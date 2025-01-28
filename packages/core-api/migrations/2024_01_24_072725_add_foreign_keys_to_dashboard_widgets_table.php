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
        Schema::table('dashboard_widgets', function (Blueprint $table) {
            $table->foreign('dashboard_uuid')
                  ->references('uuid')
                  ->on('dashboards')
                  ->onUpdate('CASCADE')
                  ->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('dashboard_widgets', function (Blueprint $table) {
            $table->dropForeign(['dashboard_uuid']);
        });
    }
};
