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
        Schema::create('companies', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->string('stripe_id', 191)->nullable()->index();
            $table->string('stripe_connect_id')->nullable();
            $table->timestamp('trial_ends_at')->nullable();
            $table->string('card_last_four', 4)->nullable();
            $table->string('card_brand')->nullable();
            $table->string('owner_uuid', 191)->nullable()->index();
            $table->string('logo_uuid', 191)->nullable()->index('companies_logo_uuid_foreign');
            $table->string('backdrop_uuid', 191)->nullable()->index('companies_backdrop_uuid_foreign');
            $table->string('name')->nullable();
            $table->string('website_url')->nullable();
            $table->string('description')->nullable();
            $table->json('options')->nullable();
            $table->string('phone')->nullable();
            $table->string('currency')->nullable();
            $table->string('country')->nullable();
            $table->string('timezone')->nullable();
            $table->string('place_uuid', 191)->nullable()->index('companies_place_uuid_foreign');
            $table->string('plan')->nullable();
            $table->string('status')->nullable();
            $table->string('type', 191)->nullable()->index();
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
        Schema::withoutForeignKeyConstraints(function () {
            Schema::dropIfExists('companies');
        });
    }
};
