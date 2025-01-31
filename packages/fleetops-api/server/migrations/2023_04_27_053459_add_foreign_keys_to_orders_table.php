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
        Schema::table('orders', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['created_by_uuid'])->references(['uuid'])->on('users')->onUpdate('NO ACTION')->onDelete('NO ACTION');
            $table->foreign(['driver_assigned_uuid'])->references(['uuid'])->on('drivers')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['payload_uuid'])->references(['uuid'])->on('payloads')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['purchase_rate_uuid'])->references(['uuid'])->on('purchase_rates')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['route_uuid'])->references(['uuid'])->on('routes')->onUpdate('NO ACTION')->onDelete('CASCADE');
            $table->foreign(['tracking_number_uuid'])->references(['uuid'])->on('tracking_numbers')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['transaction_uuid'])->references(['uuid'])->on('transactions')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['updated_by_uuid'])->references(['uuid'])->on('users')->onUpdate('NO ACTION')->onDelete('NO ACTION');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign('orders_company_uuid_foreign');
            $table->dropForeign('orders_created_by_uuid_foreign');
            $table->dropForeign('orders_driver_assigned_uuid_foreign');
            $table->dropForeign('orders_payload_uuid_foreign');
            $table->dropForeign('orders_purchase_rate_uuid_foreign');
            $table->dropForeign('orders_route_uuid_foreign');
            $table->dropForeign('orders_tracking_number_uuid_foreign');
            $table->dropForeign('orders_transaction_uuid_foreign');
            $table->dropForeign('orders_updated_by_uuid_foreign');
        });
    }
};
