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
        Schema::table('webhook_request_logs', function (Blueprint $table) {
            $table->foreign(['api_credential_uuid'])->references(['uuid'])->on('api_credentials')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['api_event_uuid'])->references(['uuid'])->on('api_events')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['webhook_uuid'])->references(['uuid'])->on('webhook_endpoints')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('webhook_request_logs', function (Blueprint $table) {
            $table->dropForeign('webhook_request_logs_api_credential_uuid_foreign');
            $table->dropForeign('webhook_request_logs_api_event_uuid_foreign');
            $table->dropForeign('webhook_request_logs_company_uuid_foreign');
            $table->dropForeign('webhook_request_logs_webhook_uuid_foreign');
        });
    }
};
