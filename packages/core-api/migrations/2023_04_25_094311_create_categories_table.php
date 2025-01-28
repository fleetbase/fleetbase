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
        Schema::create('categories', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->index();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->string('parent_uuid', 191)->nullable()->index();
            $table->string('owner_uuid')->nullable();
            $table->string('owner_type')->nullable();
            $table->string('name')->nullable();
            $table->string('internal_id')->nullable();
            $table->string('description')->nullable();
            $table->json('translations')->nullable();
            $table->json('tags')->nullable();
            $table->json('meta')->nullable();
            $table->string('icon')->nullable();
            $table->string('icon_color')->nullable();
            $table->string('for')->nullable();
            $table->string('slug')->nullable();
            $table->string('order')->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
            $table->char('icon_file_uuid', 36)->nullable()->index('categories_icon_file_uuid_foreign');

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
        Schema::dropIfExists('categories');
    }
};
