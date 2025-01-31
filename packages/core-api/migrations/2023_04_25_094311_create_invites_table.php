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
        Schema::create('invites', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('_key')->nullable();
            $table->char('uuid', 36)->nullable()->unique();
            $table->char('company_uuid', 36)->nullable()->index('invites_company_uuid_foreign');
            $table->char('created_by_uuid', 36)->nullable()->index('invites_created_by_uuid_foreign');
            $table->char('subject_uuid', 36)->nullable();
            $table->string('subject_type')->nullable();
            $table->string('public_id')->nullable();
            $table->string('uri')->nullable();
            $table->string('code')->nullable();
            $table->string('protocol')->default('email');
            $table->json('recipients')->nullable();
            $table->string('reason')->nullable();
            $table->dateTime('expires_at')->nullable()->index();
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
        Schema::dropIfExists('invites');
    }
};
