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
        Schema::create('entities', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->index();
            $table->uuid('payload_uuid')->nullable()->index('entities_payload_uuid_foreign');
            $table->uuid('company_uuid')->nullable()->index();
            $table->uuid('driver_assigned_uuid')->nullable()->index('entities_driver_assigned_uuid_foreign');
            $table->uuid('destination_uuid')->nullable()->index();
            $table->string('customer_uuid')->nullable();
            $table->string('customer_type')->nullable();
            $table->uuid('tracking_number_uuid')->nullable()->index('entities_tracking_number_uuid_foreign');
            $table->mediumText('photo_uuid')->nullable();
            $table->string('_import_id', 191)->nullable()->index();
            $table->string('internal_id', 191)->nullable()->index();
            $table->string('name')->nullable();
            $table->string('type')->nullable();
            $table->mediumText('description')->nullable();
            $table->string('currency')->nullable();
            $table->mediumText('barcode')->nullable();
            $table->mediumText('qr_code')->nullable();
            $table->string('weight')->nullable();
            $table->string('weight_unit')->nullable();
            $table->string('length')->nullable();
            $table->string('width')->nullable();
            $table->string('height')->nullable();
            $table->string('dimensions_unit')->nullable();
            $table->integer('declared_value')->nullable();
            $table->string('sku', 191)->nullable()->index();
            $table->string('price')->nullable();
            $table->string('sale_price')->nullable();
            $table->json('meta')->nullable();
            $table->string('slug')->nullable();
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
        Schema::dropIfExists('entities');
    }
};
