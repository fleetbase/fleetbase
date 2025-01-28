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
        Schema::create('transactions', function (Blueprint $table) {
            $table->increments('id');
            $table->string('_key')->nullable();
            $table->string('uuid', 191)->nullable()->index();
            $table->string('public_id', 191)->nullable()->unique();
            $table->char('owner_uuid', 36)->nullable();
            $table->string('owner_type')->nullable();
            $table->string('customer_uuid', 191)->nullable()->index();
            $table->string('customer_type')->nullable();
            $table->string('company_uuid', 191)->nullable()->index();
            $table->char('gateway_uuid', 36)->nullable();
            $table->string('gateway_transaction_id')->nullable();
            $table->string('gateway')->nullable();
            $table->integer('amount')->nullable();
            $table->string('currency')->nullable();
            $table->string('description')->nullable();
            $table->string('type', 191)->nullable()->index();
            $table->string('status')->nullable();
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
        Schema::dropIfExists('transactions');
    }
};
