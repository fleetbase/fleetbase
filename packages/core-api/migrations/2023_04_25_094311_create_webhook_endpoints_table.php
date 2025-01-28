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
        Schema::create('webhook_endpoints', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->char('updated_by_uuid', 36)->nullable()->index('webhook_endpoints_updated_by_uuid_foreign');
            $table->char('created_by_uuid', 36)->nullable()->index('webhook_endpoints_created_by_uuid_foreign');
            $table->string('api_credential_uuid', 191)->nullable()->index('webhook_endpoints_api_credential_uuid_foreign');
            $table->string('url')->nullable();
            $table->string('mode')->nullable();
            $table->string('version')->nullable();
            $table->string('description')->nullable();
            $table->json('events')->nullable();
            $table->string('status')->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();

            $table->unique(['uuid']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('webhook_endpoints');
    }
};
