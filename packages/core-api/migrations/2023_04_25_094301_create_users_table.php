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
        Schema::create('users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('avatar_uuid', 191)->nullable()->index('users_avatar_uuid_foreign');
            $table->string('username', 191)->nullable()->unique();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('password')->nullable();
            $table->string('name')->nullable();
            $table->string('date_of_birth')->nullable();
            $table->string('timezone')->nullable();
            $table->string('country')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('last_login')->nullable();
            $table->string('slug')->nullable();
            $table->string('type', 191)->nullable()->index();
            $table->string('status')->nullable();
            $table->json('meta')->nullable();
            $table->rememberToken();
            $table->dateTime('email_verified_at')->nullable()->index();
            $table->dateTime('phone_verified_at')->nullable();
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
        Schema::withoutForeignKeyConstraints(function () {
            Schema::dropIfExists('users');
        });
    }
};
