<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->string('service')->nullable()->index()->after('guard_name');
        });

        Schema::table('policies', function (Blueprint $table) {
            $table->string('service')->nullable()->index()->after('guard_name');
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->string('service')->nullable()->index()->after('guard_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->dropIndex(['service']);
            $table->dropColumn('service');
        });

        Schema::table('policies', function (Blueprint $table) {
            $table->dropIndex(['service']);
            $table->dropColumn('service');
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->dropIndex(['service']);
            $table->dropColumn('service');
        });
    }
};
