<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            DB::statement("ALTER TABLE leave_requests MODIFY leave_type ENUM('Sick','Vacation', 'Other') NOT NULL");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            DB::statement("ALTER TABLE leave_requests MODIFY leave_type ENUM('Sick','Vacation') NOT NULL");
        });
    }
};
