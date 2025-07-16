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
            // Rename approved_by to processed_by
            $table->renameColumn('approved_by', 'processed_by');
            // Add approved_at timestamp (nullable)
            $table->timestamp('approved_at')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            // Rename processed_by back to approved_by
            $table->renameColumn('processed_by', 'approved_by');

            // Drop approved_at column
            $table->dropColumn('approved_at');
        });
    }
};
