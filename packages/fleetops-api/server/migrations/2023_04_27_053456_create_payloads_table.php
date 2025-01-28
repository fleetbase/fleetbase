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
        Schema::create('payloads', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->index();
            $table->uuid('company_uuid')->nullable()->index();
            $table->uuid('pickup_uuid')->nullable()->index('payloads_from_place_uuid_index');
            $table->uuid('dropoff_uuid')->nullable()->index('payloads_to_place_uuid_index');
            $table->uuid('return_uuid')->nullable()->index('payloads_return_uuid_foreign');
            $table->uuid('current_waypoint_uuid')->nullable()->index();
            $table->string('provider', 191)->nullable()->index();
            $table->string('payment_method')->nullable();
            $table->integer('cod_amount')->nullable();
            $table->string('cod_currency')->nullable();
            $table->string('cod_payment_method')->nullable();
            $table->string('type')->nullable();
            $table->json('meta')->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();

            $table->unique(['public_id']);
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
        Schema::dropIfExists('payloads');
    }
};
