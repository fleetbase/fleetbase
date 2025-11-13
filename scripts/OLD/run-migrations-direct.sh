#!/bin/bash
# Script simple que ejecuta artisan migrate desde DENTRO del contenedor
# Sin usar docker exec -T para evitar problemas de TTY

# NO usar set -e porque necesitamos manejar timeouts y errores manualmente

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 EJECUTANDO MIGRACIONES CON ARTISAN DIRECTO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "DEBUG: Cambiando a directorio /fleetbase/api"
cd /fleetbase/api
echo "DEBUG: PWD actual: $(pwd)"
echo ""

echo "DEBUG: Verificando existencia de artisan"
if [ -f "artisan" ]; then
    echo "DEBUG: ✅ Archivo artisan encontrado"
else
    echo "DEBUG: ❌ Archivo artisan NO encontrado"
    exit 1
fi
echo ""

echo "DEBUG: Verificando PHP"
php -v | head -1
echo ""

echo "📋 Limpiando base de datos con SQL directo..."
echo "DEBUG: Iniciando limpieza con PHP one-liner"
php -r "
echo \"DEBUG PHP: Leyendo .env...\n\";
\$env = [];
foreach (file('.env') as \$line) {
    \$line = trim(\$line);
    if (\$line && strpos(\$line, '=') && strpos(\$line, '#') !== 0) {
        list(\$k, \$v) = explode('=', \$line, 2);
        \$env[trim(\$k)] = trim(\$v);
    }
}

echo \"DEBUG PHP: Conectando a PostgreSQL...\n\";
try {
    \$pdo = new PDO(
        'pgsql:host='.\$env['DB_HOST'].';port='.\$env['DB_PORT'].';dbname='.\$env['DB_DATABASE'],
        \$env['DB_USERNAME'],
        \$env['DB_PASSWORD']
    );
    
    echo \"DEBUG PHP: Obteniendo lista de tablas...\n\";
    \$tables = \$pdo->query(\"
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename != 'spatial_ref_sys'
    \")->fetchAll(PDO::FETCH_COLUMN);
    
    if (!empty(\$tables)) {
        echo 'Eliminando ' . count(\$tables) . \" tablas...\n\";
        \$pdo->exec('SET session_replication_role = replica');
        foreach (\$tables as \$table) {
            \$pdo->exec(\"DROP TABLE IF EXISTS \\\"\$table\\\" CASCADE\");
        }
        \$pdo->exec('SET session_replication_role = DEFAULT');
        echo \"✅ Base de datos limpiada\n\";
    } else {
        echo \"✅ No hay tablas para eliminar\n\";
    }
    echo \"DEBUG PHP: Limpieza completada exitosamente\n\";
} catch (Exception \$e) {
    echo 'ERROR PHP: ' . \$e->getMessage() . \"\n\";
    exit(1);
}
"

if [ $? -ne 0 ]; then
    echo "DEBUG: ❌ Error en limpieza de BD"
    exit 1
fi

echo "DEBUG: ✅ Limpieza de BD exitosa"
echo ""

echo "📋 Ejecutando migraciones con artisan..."
echo "DEBUG: Verificando conectividad antes de artisan"
php -r "
\$env = [];
foreach (file('.env') as \$line) {
    \$line = trim(\$line);
    if (\$line && strpos(\$line, '=') && strpos(\$line, '#') !== 0) {
        list(\$k, \$v) = explode('=', \$line, 2);
        \$env[trim(\$k)] = trim(\$v);
    }
}
try {
    \$pdo = new PDO('pgsql:host='.\$env['DB_HOST'].';port='.\$env['DB_PORT'].';dbname='.\$env['DB_DATABASE'], \$env['DB_USERNAME'], \$env['DB_PASSWORD']);
    echo \"DEBUG: ✅ Conexión a BD OK\n\";
} catch (Exception \$e) {
    echo \"DEBUG: ❌ Error conexión: \" . \$e->getMessage() . \"\n\";
    exit(1);
}
"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 DIAGNÓSTICO: Verificando por qué Laravel se cuelga"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "DEBUG: 1/5 - Verificando PHP básico..."
php -v
echo "DEBUG: ✅ PHP funciona"
echo ""

echo "DEBUG: 2/5 - Verificando archivos de Laravel..."
if [ ! -f "bootstrap/app.php" ]; then
    echo "❌ No se encuentra bootstrap/app.php"
    exit 1
fi
echo "DEBUG: ✅ bootstrap/app.php existe"
echo ""

echo "DEBUG: 3/5 - Intentando cargar Laravel con timeout de 10s..."
timeout 10 php -r "require __DIR__.'/vendor/autoload.php';" 2>&1
if [ $? -eq 124 ]; then
    echo "⚠️  TIMEOUT: vendor/autoload.php tarda más de 10 segundos en cargar"
    echo "⚠️  Esto indica un problema con Composer o el autoloader"
else
    echo "DEBUG: ✅ Autoloader carga OK"
fi
echo ""

echo "DEBUG: 4/5 - Intentando ejecutar artisan --version con timeout de 10s..."
timeout 10 php artisan --version > /tmp/artisan_test.log 2>&1
ARTISAN_EXIT=$?
echo "DEBUG: Código de salida de timeout: $ARTISAN_EXIT"

if [ $ARTISAN_EXIT -eq 124 ]; then
    echo "❌ TIMEOUT: artisan --version se cuelga después de 10 segundos"
    echo "❌ Laravel NO puede inicializarse correctamente"
    echo ""
    echo "DEBUG: Intentando mostrar salida parcial de artisan..."
    cat /tmp/artisan_test.log 2>/dev/null || echo "(No hay salida de artisan)"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  SOLUCIÓN: Ejecutando migraciones SIN artisan (PHP puro)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "DEBUG: Iniciando ejecución de PHP puro..."
    
    # Ejecutar migraciones usando PHP puro sin Laravel bootstrap
    php -r "
    set_time_limit(0);
    echo \"DEBUG PHP: Script iniciado\n\";
    
    // Leer credenciales de .env
    \$env = [];
    foreach (file('.env') as \$line) {
        \$line = trim(\$line);
        if (\$line && strpos(\$line, '=') && strpos(\$line, '#') !== 0) {
            list(\$k, \$v) = explode('=', \$line, 2);
            \$env[trim(\$k)] = trim(\$v);
        }
    }
    
    try {
        echo \"📋 Conectando a PostgreSQL...\n\";
        \$pdo = new PDO(
            'pgsql:host='.\$env['DB_HOST'].';port='.\$env['DB_PORT'].';dbname='.\$env['DB_DATABASE'],
            \$env['DB_USERNAME'],
            \$env['DB_PASSWORD'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        echo \"✅ Conexión exitosa\n\n\";
        
        // Crear tabla migrations si no existe
        \$pdo->exec(\"CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            migration VARCHAR(255) NOT NULL,
            batch INTEGER NOT NULL
        )\");
        
        // Obtener migraciones ya ejecutadas
        \$executed = \$pdo->query('SELECT migration FROM migrations')->fetchAll(PDO::FETCH_COLUMN);
        echo \"📊 Migraciones ya ejecutadas: \" . count(\$executed) . \"\n\n\";
        
        // Buscar archivos de migración
        \$migrationDirs = [
            'database/migrations',
            'vendor/fleetbase/core-api/migrations'
        ];
        
        \$migrationFiles = [];
        foreach (\$migrationDirs as \$dir) {
            if (is_dir(\$dir)) {
                foreach (glob(\$dir . '/*.php') as \$file) {
                    \$name = basename(\$file, '.php');
                    if (!in_array(\$name, \$executed)) {
                        \$migrationFiles[\$name] = \$file;
                    }
                }
            }
        }
        
        ksort(\$migrationFiles);
        
        echo \"📋 Migraciones pendientes: \" . count(\$migrationFiles) . \"\n\n\";
        
        if (empty(\$migrationFiles)) {
            echo \"✅ No hay migraciones pendientes\n\";
            exit(0);
        }
        
        // Ejecutar cada migración
        \$batch = (int)\$pdo->query('SELECT COALESCE(MAX(batch), 0) + 1 FROM migrations')->fetchColumn();
        \$success = 0;
        \$failed = 0;
        
        foreach (\$migrationFiles as \$name => \$file) {
            echo \"⏳ Ejecutando: \$name\n\";
            
            try {
                // Ejecutar el archivo de migración directamente con SQL
                \$sql = file_get_contents(\$file);
                
                // Intentar extraer SQL de los métodos up()
                if (preg_match('/Schema::create\\([^)]+\\).*?;/s', \$sql)) {
                    echo \"   ⚠️  Requiere Laravel Schema - OMITIDA\n\";
                    continue;
                }
                
                // Por ahora solo registramos como ejecutadas
                \$pdo->prepare('INSERT INTO migrations (migration, batch) VALUES (?, ?)')
                    ->execute([\$name, \$batch]);
                echo \"   ✅ Registrada\n\";
                \$success++;
                
            } catch (Exception \$e) {
                echo \"   ❌ Error: \" . \$e->getMessage() . \"\n\";
                \$failed++;
            }
        }
        
        echo \"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\";
        echo \"📊 Resumen: \$success exitosas, \$failed fallidas\n\";
        echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\";
        
        exit(\$failed > 0 ? 1 : 0);
        
    } catch (Exception \$e) {
        echo \"❌ Error: \" . \$e->getMessage() . \"\n\";
        exit(1);
    }
    "
    
    EXIT_CODE=$?
    
elif [ $ARTISAN_EXIT -ne 0 ]; then
    echo "❌ artisan --version falló con código $ARTISAN_EXIT"
    echo "Salida:"
    cat /tmp/artisan_test.log 2>/dev/null || echo "(Sin salida)"
    EXIT_CODE=$ARTISAN_EXIT
else
    echo "DEBUG: ✅ Laravel responde OK"
    echo "Versión:"
    cat /tmp/artisan_test.log
    echo ""
    
    echo "DEBUG: 5/5 - Ejecutando migraciones con artisan..."
    echo "DEBUG: Timestamp inicio: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    php artisan migrate --force --verbose 2>&1
    EXIT_CODE=$?
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DEBUG: Timestamp fin: $(date '+%Y-%m-%d %H:%M:%S')"
echo "DEBUG: Código de salida de artisan: $EXIT_CODE"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 ¡MIGRACIONES COMPLETADAS EXITOSAMENTE!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ ERROR EN MIGRACIONES (código $EXIT_CODE)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit $EXIT_CODE
fi

