# 🐳 Guía de Instalación de Docker en WSL2

## Opción 1: Docker Desktop para Windows (Recomendado) ⭐

Esta es la forma más sencilla y mejor integrada con WSL2.

### Pasos:

1. **Descargar Docker Desktop**
   - Ve a: https://www.docker.com/products/docker-desktop/
   - Descarga la versión para Windows

2. **Instalar Docker Desktop**
   - Ejecuta el instalador descargado
   - Durante la instalación, asegúrate de marcar:
     - ✅ "Use WSL 2 instead of Hyper-V"
     - ✅ "Add shortcut to desktop"

3. **Iniciar Docker Desktop**
   - Abre Docker Desktop desde el menú de Windows
   - Espera a que el motor de Docker inicie (ícono de ballena en la barra de tareas)

4. **Habilitar integración con WSL2**
   - Abre Docker Desktop
   - Ve a: **Settings** (⚙️) → **Resources** → **WSL Integration**
   - Activa:
     - ✅ Enable integration with my default WSL distro
     - ✅ Ubuntu (o tu distribución específica)
   - Haz clic en **Apply & Restart**

5. **Verificar en WSL2**
   ```bash
   docker --version
   docker compose version
   ```

   Deberías ver algo como:
   ```
   Docker version 24.x.x, build xxxxx
   Docker Compose version v2.x.x
   ```

---

## Opción 2: Docker Engine en WSL2 (Manual)

Si prefieres instalar Docker directamente en WSL2 sin Docker Desktop:

### 1. Actualizar el sistema

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Instalar dependencias

```bash
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

### 3. Agregar la clave GPG de Docker

```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

### 4. Configurar el repositorio

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 5. Instalar Docker Engine

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 6. Iniciar el servicio Docker

```bash
sudo service docker start
```

### 7. Agregar tu usuario al grupo docker

```bash
sudo usermod -aG docker $USER
```

**Importante:** Cierra y vuelve a abrir tu terminal WSL para que los cambios surtan efecto.

### 8. Configurar Docker para que inicie automáticamente

Edita `/etc/wsl.conf`:

```bash
sudo nano /etc/wsl.conf
```

Agrega:

```ini
[boot]
command="service docker start"
```

Guarda (Ctrl+O, Enter, Ctrl+X).

### 9. Reiniciar WSL

Desde PowerShell en Windows:

```powershell
wsl --shutdown
```

Vuelve a abrir tu terminal WSL.

### 10. Verificar instalación

```bash
docker --version
docker compose version
sudo service docker status
```

---

## ⚙️ Configuración Adicional para WSL2

### Aumentar recursos de WSL2 (Opcional)

Crea o edita el archivo `.wslconfig` en tu directorio de usuario de Windows:

**Ruta:** `C:\Users\GAMEMAX\.wslconfig`

```ini
[wsl2]
memory=8GB
processors=4
swap=2GB
localhostForwarding=true
```

Reinicia WSL:
```powershell
wsl --shutdown
```

---

## 🧪 Probar Docker

### Test básico:

```bash
docker run hello-world
```

Deberías ver un mensaje de bienvenida de Docker.

### Test de Docker Compose:

```bash
docker compose version
```

---

## 🐛 Solución de Problemas

### Error: "Cannot connect to the Docker daemon"

**Opción 1 (Docker Desktop):**
- Asegúrate de que Docker Desktop esté corriendo en Windows
- Verifica la integración WSL2 en Docker Desktop Settings

**Opción 2 (Docker Engine):**
```bash
sudo service docker start
sudo service docker status
```

### Error: "permission denied"

```bash
sudo usermod -aG docker $USER
```

Cierra y vuelve a abrir la terminal.

### Error: "docker compose: command not found"

Si instalaste Docker Desktop, debería incluir Docker Compose v2.

Si instalaste Docker Engine manualmente:
```bash
sudo apt install docker-compose-plugin
```

### WSL2 no está actualizado

Desde PowerShell (como administrador):
```powershell
wsl --update
wsl --set-default-version 2
```

---

## ✅ Verificación Final

Una vez que Docker esté instalado y funcionando, ejecuta:

```bash
cd /mnt/g/Users/GAMEMAX/Documents/CREAI/fleetbase-repo
docker --version
docker compose version
```

Si ves las versiones correctamente, ¡estás listo para instalar Fleetbase! 🎉

Continúa con:
```bash
./scripts/docker-install.sh
```

---

## 🎯 Resumen de Comandos Útiles

```bash
# Verificar Docker
docker --version
docker compose version

# Ver contenedores en ejecución
docker ps

# Ver logs
docker compose logs -f

# Reiniciar Docker (Engine)
sudo service docker restart

# Detener Docker (Engine)
sudo service docker stop
```

---

## 📚 Recursos

- [Docker Desktop para Windows](https://docs.docker.com/desktop/windows/install/)
- [Docker en WSL2](https://docs.docker.com/desktop/wsl/)
- [Docker Engine en Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

