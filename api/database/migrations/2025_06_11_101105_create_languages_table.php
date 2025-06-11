<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
      
        Schema::create('languages', function (Blueprint $table) {
            $table->id(); // auto-increment primary key

            $table->uuid('company_uuid')->nullable();
            $table->string('name', 500);
            $table->string('code', 200);
            $table->tinyInteger('sort_order')->nullable();
            $table->tinyInteger('record_status')->default(1);
            $table->integer('deleted')->default(value: 0);
            $table->unsignedInteger('created_by_id')->nullable();
            $table->unsignedInteger('updated_by_id')->nullable();
            $table->softDeletes();
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('languages');
    }
};
