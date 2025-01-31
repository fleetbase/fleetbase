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
        Schema::table('model_has_permissions', function (Blueprint $table) {
            if (Schema::hasColumn('model_has_permissions', 'model_id')) {
                $table->renameColumn('model_id', 'model_uuid');
            }
        });

        Schema::table('model_has_roles', function (Blueprint $table) {
            if (Schema::hasColumn('model_has_roles', 'model_id')) {
                $table->renameColumn('model_id', 'model_uuid');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('model_has_permissions', function (Blueprint $table) {
            if (Schema::hasColumn('model_has_permissions', 'model_uuid')) {
                $table->renameColumn('model_uuid', 'model_id');
            }
        });

        Schema::table('model_has_roles', function (Blueprint $table) {
            if (Schema::hasColumn('model_has_roles', 'model_uuid')) {
                $table->renameColumn('model_uuid', 'model_id');
            }
        });
    }
};
