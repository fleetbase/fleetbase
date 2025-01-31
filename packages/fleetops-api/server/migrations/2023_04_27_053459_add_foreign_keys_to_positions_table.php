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
        Schema::table('positions', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('NO ACTION')->onDelete('NO ACTION');
            $table->foreign(['destination_uuid'])->references(['uuid'])->on('places')->onUpdate('NO ACTION')->onDelete('NO ACTION');
            $table->foreign(['order_uuid'])->references(['uuid'])->on('orders')->onUpdate('NO ACTION')->onDelete('NO ACTION');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->dropForeign('positions_company_uuid_foreign');
            $table->dropForeign('positions_destination_uuid_foreign');
            $table->dropForeign('positions_order_uuid_foreign');
        });
    }
};
