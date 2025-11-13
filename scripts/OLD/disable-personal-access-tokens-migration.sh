#!/bin/bash
# Fix definitivo para fix_personal_access_tokens
# Solución: Deshabilitar la migración completa ya que no aplica para PostgreSQL

echo "🔧 Deshabilitando migración fix_personal_access_tokens (no compatible con PostgreSQL)..."
echo ""

sudo docker compose exec -T application bash << 'BASH_EOF'

FILE=$(find /fleetbase/api -name "*fix_personal_access_tokens*.php" -type f | head -1)

if [ ! -f "$FILE" ]; then
    echo "❌ Archivo no encontrado"
    exit 1
fi

echo "📄 Archivo: $FILE"
echo "💾 Creando respaldo..."
cp "$FILE" "${FILE}.mysql_backup"

echo "✏️  Deshabilitando migración..."

# Vaciar completamente el método up() para que no haga nada
cat > "$FILE" << 'PHP_EOF'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * 
     * NOTE: This migration has been disabled for PostgreSQL compatibility.
     * The original migration attempted to change tokenable_id from bigint to uuid,
     * which is not supported in PostgreSQL without data loss.
     *
     * @return void
     */
    public function up()
    {
        // Migration disabled for PostgreSQL compatibility
        // Original migration backed up as .mysql_backup
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Nothing to reverse
    }
};
PHP_EOF

echo "✅ Migración deshabilitada correctamente"
echo "💾 Backup guardado en: ${FILE}.mysql_backup"

BASH_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Migración fix_personal_access_tokens deshabilitada"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🚀 Re-ejecutar migraciones:"
    echo "   sudo docker compose exec application php artisan migrate:fresh --force"
    echo ""
else
    echo "❌ Error"
    exit 1
fi

