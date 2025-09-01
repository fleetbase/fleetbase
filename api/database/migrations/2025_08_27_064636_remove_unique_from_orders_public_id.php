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
            // Remove unique constraint from public_id column
            $table->dropUnique('orders_public_id_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Add unique constraint back to public_id column
            $table->unique('public_id', 'orders_public_id_unique');
        });
    }
};
