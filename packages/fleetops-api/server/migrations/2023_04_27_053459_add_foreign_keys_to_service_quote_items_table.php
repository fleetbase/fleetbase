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
        Schema::table('service_quote_items', function (Blueprint $table) {
            $table->foreign(['service_quote_uuid'])->references(['uuid'])->on('service_quotes')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('service_quote_items', function (Blueprint $table) {
            $table->dropForeign('service_quote_items_service_quote_uuid_foreign');
        });
    }
};
