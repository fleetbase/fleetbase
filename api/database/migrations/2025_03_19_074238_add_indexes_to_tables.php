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
        Schema::table('orders', function (Blueprint $table) {
            $table->index('estimated_end_date');
        });

        Schema::table('places', function (Blueprint $table) {
            $table->index('code');
            $table->index('name'); 
            $table->index('street1');
            $table->index('street2');
        });
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->index('start_date');
            $table->index('end_date'); 
            $table->index('status');
            $table->index('leave_type');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('name'); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['estimated_end_date']);
        });

        Schema::table('places', function (Blueprint $table) {
            $table->dropIndex(['places_code_name_street1_street2_index']);
        });

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropIndex(['leave_requests_start_date_end_date_status_leave_type_index']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['name']);
        });
    
    }
};
