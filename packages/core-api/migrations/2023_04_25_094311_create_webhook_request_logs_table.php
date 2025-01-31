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
        Schema::create('webhook_request_logs', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->char('uuid', 36)->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->char('company_uuid', 36)->nullable()->index();
            $table->char('webhook_uuid', 36)->nullable()->index('webhook_request_logs_webhook_uuid_foreign');
            $table->char('api_credential_uuid', 36)->nullable()->index();
            $table->char('api_event_uuid', 36)->nullable()->index();
            $table->string('method', 191)->nullable()->index();
            $table->string('status_code', 191)->nullable()->index();
            $table->string('reason_phrase')->nullable();
            $table->decimal('duration', 17, 14)->nullable();
            $table->string('url')->nullable();
            $table->integer('attempt')->nullable();
            $table->json('meta')->nullable();
            $table->json('headers')->nullable();
            $table->json('response')->nullable();
            $table->string('status', 191)->nullable()->index();
            $table->dateTime('sent_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

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
        Schema::dropIfExists('webhook_request_logs');
    }
};
