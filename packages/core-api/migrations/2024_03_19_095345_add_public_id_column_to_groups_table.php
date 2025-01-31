<?php

use Fleetbase\Models\Group;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->string('public_id')->nullable()->after('company_uuid')->index();
        });

        $groups = Group::withTrashed()->get();
        foreach ($groups as $group) {
            $group->update(['public_id' => Group::generatePublicId('group')]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->dropIndex(['public_id']);
            $table->dropColumn(['public_id']);
        });
    }
};
