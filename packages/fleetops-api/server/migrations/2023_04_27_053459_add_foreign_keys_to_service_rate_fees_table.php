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
        Schema::table('service_rate_fees', function (Blueprint $table) {
            $table->foreign(['service_rate_uuid'])->references(['uuid'])->on('service_rates')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('service_rate_fees', function (Blueprint $table) {
            $table->dropForeign('service_rate_fees_service_rate_uuid_foreign');
        });
    }
};
