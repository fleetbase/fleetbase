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
        Schema::create('tracking_numbers', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->uuid('company_uuid')->nullable()->index();
            $table->uuid('owner_uuid')->nullable()->index('tracking_numbers_owner_uuid_foreign');
            $table->string('owner_type')->nullable();
            $table->uuid('status_uuid')->nullable()->index('tracking_numbers_status_uuid_foreign');
            $table->string('tracking_number', 191)->nullable()->index();
            $table->string('region')->nullable();
            $table->mediumText('qr_code')->nullable();
            $table->mediumText('barcode')->nullable();
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
        Schema::dropIfExists('tracking_numbers');
    }
};
