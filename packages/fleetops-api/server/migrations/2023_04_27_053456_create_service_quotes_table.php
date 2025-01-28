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
        Schema::create('service_quotes', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('request_id', 191)->nullable()->index('service_quotes_request_id_foreign');
            $table->uuid('company_uuid')->nullable()->index('service_quotes_company_uuid_foreign');
            $table->uuid('payload_uuid')->nullable()->index('service_quotes_payload_uuid_foreign');
            $table->uuid('service_rate_uuid')->nullable()->index();
            $table->integer('amount')->nullable();
            $table->string('currency')->nullable();
            $table->json('meta')->nullable();
            $table->string('expired_at')->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->char('integrated_vendor_uuid', 36)->nullable()->index('service_quotes_integrated_vendor_uuid_foreign');

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
        Schema::dropIfExists('service_quotes');
    }
};
