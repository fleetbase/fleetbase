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
        Schema::create('vendors', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->uuid('company_uuid')->nullable()->index();
            $table->uuid('place_uuid')->nullable()->index('vendors_place_uuid_foreign');
            $table->uuid('type_uuid')->nullable()->index('vendors_type_uuid_foreign');
            $table->uuid('connect_company_uuid')->nullable()->index('vendors_connect_company_uuid_foreign');
            $table->uuid('logo_uuid')->nullable()->index('vendors_logo_uuid_foreign');
            $table->string('name')->nullable();
            $table->string('internal_id', 191)->nullable()->index();
            $table->string('business_id')->nullable();
            $table->integer('connected')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('website_url')->nullable();
            $table->string('country')->nullable();
            $table->json('meta')->nullable();
            $table->json('callbacks')->nullable();
            $table->string('type')->nullable();
            $table->string('status')->nullable();
            $table->string('slug')->nullable();
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
        Schema::dropIfExists('vendors');
    }
};
