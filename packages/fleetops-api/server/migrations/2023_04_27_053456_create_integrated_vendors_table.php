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
        Schema::create('integrated_vendors', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('_key')->nullable();
            $table->char('uuid', 36)->nullable()->unique();
            $table->char('company_uuid', 36)->nullable()->index('integrated_vendors_company_uuid_foreign');
            $table->char('created_by_uuid', 36)->nullable()->index('integrated_vendors_created_by_uuid_foreign');
            $table->string('public_id')->nullable();
            $table->string('host')->nullable();
            $table->string('namespace')->nullable();
            $table->string('webhook_url', 400)->nullable();
            $table->string('provider')->nullable();
            $table->json('credentials')->nullable();
            $table->json('options')->nullable();
            $table->boolean('sandbox')->default(false);
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('integrated_vendors');
    }
};
