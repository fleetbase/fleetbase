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
        Schema::table('purchase_rates', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['payload_uuid'])->references(['uuid'])->on('payloads')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['service_quote_uuid'])->references(['uuid'])->on('service_quotes')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['transaction_uuid'])->references(['uuid'])->on('transactions')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('purchase_rates', function (Blueprint $table) {
            $table->dropForeign('purchase_rates_company_uuid_foreign');
            $table->dropForeign('purchase_rates_payload_uuid_foreign');
            $table->dropForeign('purchase_rates_service_quote_uuid_foreign');
            $table->dropForeign('purchase_rates_transaction_uuid_foreign');
        });
    }
};
