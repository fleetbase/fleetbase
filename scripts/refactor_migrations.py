#!/usr/bin/env python3
"""
Script para refactorizar migraciones de Laravel de MySQL a PostgreSQL
Ubicación: scripts/refactor_migrations.py
"""

import os
import re
import glob
from pathlib import Path

def refactor_migration_file(filepath):
    """Refactoriza un archivo de migración de MySQL a PostgreSQL"""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes = []
    
    # 1. Eliminar CHARACTER SET
    if 'CHARACTER SET' in content:
        content = re.sub(r'CHARACTER\s+SET\s+\w+', '', content, flags=re.IGNORECASE)
        changes.append("Eliminado CHARACTER SET")
    
    # 2. Eliminar COLLATE
    if 'COLLATE' in content:
        content = re.sub(r'COLLATE\s+\w+', '', content, flags=re.IGNORECASE)
        changes.append("Eliminado COLLATE")
    
    # 3. Eliminar ENGINE=InnoDB
    if 'engine' in content.lower():
        content = re.sub(r",?\s*['\"]?engine['\"]?\s*=>\s*['\"]?InnoDB['\"]?", '', content, flags=re.IGNORECASE)
        content = re.sub(r",?\s*['\"]?engine['\"]?\s*:\s*['\"]?InnoDB['\"]?", '', content, flags=re.IGNORECASE)
        changes.append("Eliminado ENGINE=InnoDB")
    
    # 4. Eliminar ->unsigned()
    if '->unsigned()' in content:
        content = content.replace('->unsigned()', '')
        changes.append("Eliminado ->unsigned()")
    
    # 5. Cambiar enum a string (simplificación)
    enum_pattern = r"->enum\(([^)]+)\)"
    if re.search(enum_pattern, content):
        # Extraer los valores del enum para referencia
        content = re.sub(enum_pattern, r"->string(\1, 50)", content)
        changes.append("Convertido enum a string")
    
    # 6. Cambiar timestamp(0) a timestamp()
    if '->timestamp(0)' in content:
        content = content.replace('->timestamp(0)', '->timestamp()')
        changes.append("Cambiado timestamp(0) a timestamp()")
    
    # 7. Eliminar charset de arrays de opciones
    if "'charset'" in content:
        content = re.sub(r",?\s*['\"]charset['\"]\s*=>\s*['\"][^'\"]*['\"]", '', content)
        content = re.sub(r"['\"]charset['\"]\s*=>\s*['\"][^'\"]*['\"]\s*,?", '', content)
        changes.append("Eliminado charset de opciones")
    
    # 8. Reemplazar mediumText() con text() (PostgreSQL no tiene mediumText)
    if '->mediumText()' in content:
        content = content.replace('->mediumText()', '->text()')
        changes.append("Cambiado mediumText a text")
    
    # 9. Reemplazar longText() con text() 
    if '->longText()' in content:
        content = content.replace('->longText()', '->text()')
        changes.append("Cambiado longText a text")
    
    # 10. Limpiar comas dobles que puedan haber quedado
    content = re.sub(r',\s*,', ',', content)
    content = re.sub(r',\s*\)', ')', content)
    
    # Solo escribir si hubo cambios
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, changes
    
    return False, []

def main():
    # Buscar migraciones en vendor (dentro del contenedor)
    print("🔍 Buscando archivos de migración...")
    
    # Rutas donde buscar migraciones
    migration_paths = [
        "/fleetbase/api/database/migrations/*.php",
        "/fleetbase/api/vendor/fleetbase/*/database/migrations/*.php",
    ]
    
    all_migrations = []
    for pattern in migration_paths:
        found = glob.glob(pattern, recursive=True)
        all_migrations.extend(found)
    
    # Si no encuentra nada, buscar de forma recursiva
    if not all_migrations:
        print("⚠️  Búsqueda inicial no encontró archivos, buscando recursivamente...")
        all_migrations.extend(glob.glob("/fleetbase/api/**/migrations/*.php", recursive=True))
    
    if not all_migrations:
        print("❌ No se encontraron migraciones.")
        print("   Rutas buscadas:")
        for pattern in migration_paths:
            print(f"   - {pattern}")
        return
    
    print(f"📝 Encontradas {len(all_migrations)} migraciones")
    print()
    
    # Crear respaldo
    print("💾 Creando respaldo...")
    for migration in all_migrations:
        backup_path = f"{migration}.mysql_backup"
        if not os.path.exists(backup_path):
            with open(migration, 'r') as src, open(backup_path, 'w') as dst:
                dst.write(src.read())
    
    print("✅ Respaldo creado")
    print()
    
    # Refactorizar
    print("🔄 Refactorizando migraciones...")
    modified_count = 0
    
    for migration in all_migrations:
        filename = os.path.basename(migration)
        modified, changes = refactor_migration_file(migration)
        
        if modified:
            modified_count += 1
            print(f"✏️  {filename}")
            for change in changes:
                print(f"   - {change}")
    
    print()
    print(f"✅ Refactorización completada!")
    print(f"   Archivos modificados: {modified_count}/{len(all_migrations)}")
    print()
    print("🚀 Siguiente paso:")
    print("   php artisan migrate --force")

if __name__ == "__main__":
    main()

