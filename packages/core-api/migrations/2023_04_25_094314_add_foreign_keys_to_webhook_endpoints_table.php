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
        Schema::table('webhook_endpoints', function (Blueprint $table) {
            $table->foreign(['api_credential_uuid'])->references(['uuid'])->on('api_credentials')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['company_uuid'])->references(['uuid'])->on('companies')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['created_by_uuid'])->references(['uuid'])->on('users')->onUpdate('CASCADE')->onDelete('CASCADE');
            $table->foreign(['updated_by_uuid'])->references(['uuid'])->on('users')->onUpdate('CASCADE')->onDelete('CASCADE');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('webhook_endpoints', function (Blueprint $table) {
            $table->dropForeign('webhook_endpoints_api_credential_uuid_foreign');
            $table->dropForeign('webhook_endpoints_company_uuid_foreign');
            $table->dropForeign('webhook_endpoints_created_by_uuid_foreign');
            $table->dropForeign('webhook_endpoints_updated_by_uuid_foreign');
        });
    }
};
