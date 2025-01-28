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
        Schema::table('service_quotes', function (Blueprint $table) {
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['integrated_vendor_uuid'])->references(['uuid'])->on('integrated_vendors')->onUpdate('NO ACTION')->onDelete('CASCADE');
            $table->foreign(['payload_uuid'])->references(['uuid'])->on('payloads')->onUpdate('CASCADE')->onDelete('CASCADE');
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
        Schema::table('service_quotes', function (Blueprint $table) {
            $table->dropForeign('service_quotes_company_uuid_foreign');
            $table->dropForeign('service_quotes_integrated_vendor_uuid_foreign');
            $table->dropForeign('service_quotes_payload_uuid_foreign');
            $table->dropForeign('service_quotes_service_rate_uuid_foreign');
        });
    }
};
