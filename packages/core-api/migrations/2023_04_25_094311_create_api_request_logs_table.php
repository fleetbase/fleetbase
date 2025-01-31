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
        Schema::create('api_request_logs', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->char('uuid', 36)->index();
            $table->char('company_uuid', 36)->nullable()->index();
            $table->char('api_credential_uuid', 36)->nullable()->index();
            $table->string('public_id', 191)->nullable()->index();
            $table->string('method', 191)->nullable()->index();
            $table->string('path', 191)->nullable()->index();
            $table->string('full_url')->nullable();
            $table->string('status_code', 191)->nullable()->index();
            $table->string('reason_phrase')->nullable();
            $table->decimal('duration', 17, 14)->nullable();
            $table->string('ip_address')->nullable();
            $table->string('version')->nullable();
            $table->string('source')->nullable();
            $table->string('content_type')->nullable();
            $table->json('related')->nullable();
            $table->json('query_params')->nullable();
            $table->json('request_headers')->nullable();
            $table->json('request_body')->nullable();
            $table->mediumText('request_raw_body')->nullable();
            $table->json('response_headers')->nullable();
            $table->json('response_body')->nullable();
            $table->mediumText('response_raw_body')->nullable();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes()->index();

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
        Schema::dropIfExists('api_request_logs');
    }
};
