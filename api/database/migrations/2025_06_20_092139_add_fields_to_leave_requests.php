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
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->integer(column: 'created_by_id');
            $table->integer('updated_by_id')->nullable();
            $table->tinyInteger('record_status')->default(1);
            $table->tinyInteger('deleted')->default(value: 0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['created_by_id', 'updated_by_id', 'record_status', 'deleted']);
        });
    }
};
