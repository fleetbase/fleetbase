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
        Schema::create('contacts', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('internal_id')->nullable();
            $table->uuid('company_uuid')->nullable()->index('contacts_company_uuid_foreign');
            $table->char('user_uuid', 36)->nullable()->index();
            $table->uuid('photo_uuid')->nullable()->index('contacts_photo_uuid_foreign');
            $table->string('name')->nullable();
            $table->string('title')->nullable();
            $table->string('email', 191)->nullable()->index();
            $table->string('phone')->nullable();
            $table->string('type')->nullable();
            $table->string('slug')->nullable();
            $table->json('meta')->nullable();
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
        Schema::dropIfExists('contacts');
    }
};
