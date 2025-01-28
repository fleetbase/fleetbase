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
        Schema::create('orders', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->unique();
            $table->string('public_id', 191)->nullable()->unique();
            $table->uuid('company_uuid')->nullable()->index();
            $table->char('created_by_uuid', 36)->nullable()->index();
            $table->char('updated_by_uuid', 36)->nullable()->index();
            $table->string('internal_id')->nullable();
            $table->uuid('customer_uuid')->nullable()->index();
            $table->string('customer_type')->nullable();
            $table->string('facilitator_uuid')->nullable();
            $table->string('facilitator_type')->nullable();
            $table->uuid('session_uuid')->nullable()->index('orders_session_uuid_foreign');
            $table->uuid('payload_uuid')->nullable()->index('orders_payload_uuid_foreign');
            $table->char('route_uuid', 36)->nullable()->index('orders_route_uuid_foreign');
            $table->uuid('transaction_uuid')->nullable()->index('orders_transaction_uuid_foreign');
            $table->uuid('purchase_rate_uuid')->nullable()->index('orders_purchase_rate_uuid_foreign');
            $table->uuid('tracking_number_uuid')->nullable()->index('orders_tracking_number_uuid_foreign');
            $table->uuid('driver_assigned_uuid')->nullable()->index('orders_driver_assigned_uuid_foreign');
            $table->json('meta')->nullable();
            $table->json('options')->nullable();
            $table->boolean('dispatched')->default(false);
            $table->dateTime('dispatched_at')->nullable()->index();
            $table->boolean('adhoc')->default(false);
            $table->integer('adhoc_distance')->nullable();
            $table->boolean('started')->default(false);
            $table->dateTime('started_at')->nullable();
            $table->integer('distance')->nullable();
            $table->integer('time')->nullable();
            $table->boolean('pod_required')->nullable();
            $table->boolean('is_route_optimized')->default(false);
            $table->string('pod_method')->nullable();
            $table->mediumText('notes')->nullable();
            $table->dateTime('scheduled_at')->nullable()->index();
            $table->string('type')->nullable();
            $table->string('status', 191)->nullable()->index();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();

            $table->index(['uuid']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('orders');
    }
};
