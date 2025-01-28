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
        Schema::create('api_credentials', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('user_uuid', 191)->nullable()->index('api_credentials_user_uuid_foreign');
            $table->string('company_uuid', 191)->nullable()->index('api_credentials_company_uuid_foreign');
            $table->string('name')->nullable();
            $table->string('key')->nullable();
            $table->string('secret')->nullable();
            $table->integer('test_mode')->default(0)->index();
            $table->string('api', 191)->nullable()->index();
            $table->json('browser_origins')->nullable();
            $table->dateTime('last_used_at')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->softDeletes()->index();
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
        Schema::dropIfExists('api_credentials');
    }
};
