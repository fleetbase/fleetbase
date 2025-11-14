<?php
/**
 * Script para ejecutar migraciones desde dentro del contenedor
 * Evita problemas con artisan en modo no-TTY
 */

// Cambiar al directorio de la aplicación
chdir('/fleetbase/api');

// Requerir el autoloader de Composer
if (!file_exists('/fleetbase/api/vendor/autoload.php')) {
    die("ERROR: No se encuentra /fleetbase/api/vendor/autoload.php\n");
}
require_once '/fleetbase/api/vendor/autoload.php';

// Bootstrap de Laravel
if (!file_exists('/fleetbase/api/bootstrap/app.php')) {
    die("ERROR: No se encuentra /fleetbase/api/bootstrap/app.php\n");
}
$app = require_once '/fleetbase/api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

echo "\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "🚀 EJECUTANDO MIGRACIONES INTERNAS\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "\n";

try {
    // Paso 1: Limpiar base de datos
    echo "📋 Paso 1: Limpiando base de datos...\n";
    $status = $kernel->call('db:wipe', ['--force' => true]);
    if ($status === 0) {
        echo "✅ Base de datos limpiada\n\n";
    } else {
        echo "⚠️  db:wipe retornó código $status (continuando...)\n\n";
    }
    
    // Paso 2: Ejecutar migraciones
    echo "📋 Paso 2: Ejecutando migraciones...\n";
    $status = $kernel->call('migrate', ['--force' => true]);
    
    if ($status === 0) {
        echo "\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "🎉 ¡MIGRACIONES COMPLETADAS EXITOSAMENTE!\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "\n";
        exit(0);
    } else {
        echo "\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "❌ ERROR EN MIGRACIONES (código $status)\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "\n";
        exit(1);
    }
    
} catch (Exception $e) {
    echo "\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "❌ EXCEPCIÓN: " . $e->getMessage() . "\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "\n";
    echo "Stack trace:\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}

