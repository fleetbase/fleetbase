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
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['company_plan_id']);

            // Make the column nullable
            $table->unsignedInteger('company_plan_id')->nullable()->change();
            
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedInteger('company_plan_id')->nullable(false)->change();

            // Re-add the foreign key constraint
            $table->foreign('company_plan_id')
                  ->references('id')
                  ->on('company_plan_relation')
                  ->onDelete('cascade');
        });
    }
};
