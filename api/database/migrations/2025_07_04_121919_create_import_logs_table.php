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
        Schema::create('import_logs', function (Blueprint $table) {
            $table->increments('id');
            $table->uuid('uuid')->unique();
            $table->uuid('imported_file_uuid')->nullable();
            $table->uuid('company_uuid')->nullable();
            $table->string('module'); 
            $table->enum('status', ['COMPLETED', 'PARTIALLY_COMPLETED', 'ERROR'])->default('ERROR');
            $table->string('error_log_file_path')->nullable();
            $table->tinyInteger('record_status')->default(1);
            $table->tinyInteger('deleted')->default(value: 0);
            $table->unsignedBigInteger('created_by_id')->nullable();
            $table->unsignedBigInteger('updated_by_id')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();
            $table->softDeletes();
            
            $table->index('company_uuid');
            $table->index('module');
            $table->index('status');
            $table->foreign('created_by_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            $table->foreign('updated_by_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('import_logs');
    }
};
