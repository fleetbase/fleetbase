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
            // Add the foreign key to the 'user_uuid' column in the 'leave_requests' table
            $table->enum('leave_type', ['Vacation', 'Sick'])->default('Vacation');
            $table->foreign('user_uuid')
                  ->references('uuid')
                  ->on('users')
                  ->onDelete('cascade'); // Optional: If you want to delete leave requests when a user is deleted
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            // Drop the foreign key if we roll back the migration
            $table->dropForeign(['user_uuid']);
        });
    }
};
