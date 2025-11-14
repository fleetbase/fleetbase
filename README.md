# Sistema de Gestión Logística

Sistema modular para la gestión de operaciones logísticas y cadena de suministro.

## ¿Qué es este sistema?

Este es un sistema operativo modular de logística y cadena de suministro diseñado para optimizar la gestión, planificación y control operacional en diversos sectores de la industria.

## Características Visuales

- Tablero Kanban dinámico para visualización de órdenes
- Constructor de flujos de trabajo intuitivo
- Seguimiento en tiempo real en mapa interactivo
- Vista completa de flota y órdenes activas
- Gestión de zonas y áreas de servicio

## Inicio Rápido

```bash
git clone [tu-repositorio]
cd [directorio-proyecto]
docker-compose up -d
```

## 📖 Tabla de contenidos

  - [Características](#-características)
  - [Instalación](#-instalación)
  - [Extensiones](#-extensiones)
  - [Aplicaciones](#-aplicaciones)
  - [Roadmap](#-roadmap)
  - [Bugs y Solicitudes de Características](#-bugs-y--solicitudes-de-características)
  - [Documentación](#-documentación)
  - [Contribuir](#-contribuir)
  - [Licencia y Copyright](#-licencia-y-copyright)

## 📦 Características
- **Extensible:** Construye extensiones instalables y funcionalidad adicional directamente en el sistema operativo a través de arquitectura modular.
- **Amigable para Desarrolladores:** API RESTful, socket y webhooks para integrar sin problemas con sistemas externos o desarrollar aplicaciones personalizadas.
- **Aplicaciones Nativas:** Colección de aplicaciones de código abierto y nativas diseñadas para operaciones y atención al cliente.
- **Colaboración:** Sistema dedicado de chat y comentarios para la colaboración en toda tu organización.
- **Seguridad:** Cifrado de datos seguro, adherencia a las prácticas de seguridad estándar de la industria y un sistema integral de gestión de identidad y acceso (IAM) dinámico.
- **Telemática:** Integración y conexión con dispositivos de hardware y sensores para proporcionar más retroalimentación y visibilidad en las operaciones.
- **Internacionalizado:** Traducción a múltiples idiomas para acomodar bases de usuarios diversas y operaciones globales.
- **Framework:** Núcleo PHP construido alrededor de abstracciones de logística y cadena de suministro para agilizar el desarrollo de extensiones.
- **Dinámico:** Reglas, flujos y lógica configurables para habilitar la automatización y personalización.
- **UI/UX:** Interfaz limpia, receptiva y fácil de usar para una gestión y operaciones eficientes desde escritorio o móvil.
- **Paneles:** Crea paneles y widgets personalizados para obtener visibilidad completa de las operaciones.
- **Escalabilidad:** Crecimiento ininterrumpido con infraestructura y diseño escalables, capaz de manejar el aumento del volumen de datos y la demanda de usuarios a medida que tu negocio se expande.
- **Mejoras Continuas:** Compromiso con la mejora continua, proporcionando actualizaciones regulares que introducen sin problemas optimizaciones, nuevas características y mejoras generales al sistema.
- **Código Abierto:** Despliégalo ya sea en las instalaciones o en la nube según las necesidades y preferencias de tu organización.

## 💾 Instalación

La forma más rápida de comenzar es mediante Docker. Asegúrate de tener las últimas versiones de Docker y Docker Compose instaladas en tu sistema.

```bash
git clone [tu-repositorio]
cd [directorio-proyecto]
docker-compose up -d
```

### Acceso al Sistema
Una vez instalado correctamente, puedes acceder a la consola en el puerto 4200 y la API estará accesible desde el puerto 8000.

Consola: http://localhost:4200
API: http://localhost:8000

### Configuraciones Adicionales

**CORS:** Si estás instalando directamente en un servidor, necesitarás configurar las variables de entorno en el contenedor de la aplicación:
```
CONSOLE_HOST=http://{tuhost}:4200
```
Si tienes aplicaciones o frontends adicionales, puedes usar la variable de entorno `FRONTEND_HOSTS` para agregar una lista delimitada por comas de hosts frontend adicionales.

**Clave de Aplicación** Si obtienes un problema sobre una clave de aplicación faltante, simplemente ejecuta:
```bash
docker compose exec application bash -c "php artisan key:generate --show"
```
Luego copia este valor a la variable de entorno `APP_KEY` en el contenedor de la aplicación y reinicia.

**Enrutamiento:** El sistema incluye un servidor OSRM predeterminado alojado por `router.project-osrm.org` pero puedes usar tu propio servidor o cualquier otro servidor compatible con OSRM. Puedes modificar esto en el directorio `console/environments` modificando el archivo .env del entorno que estás desplegando y configurando `OSRM_HOST` al servidor OSRM para usar.

**Servicios:** Hay algunas variables de entorno que deben configurarse para que el sistema funcione con todas las características. Si estás desplegando con Docker, es más fácil crear un `docker-compose.override.yml` y proporcionar las variables de entorno en este archivo.

```yaml
version: "3.8"
services:  
  application:  
    environment:  
      CONSOLE_HOST: http://localhost:4200
      MAIL_MAILER: (ses, smtp, mailgun, postmark, sendgrid)
      OSRM_HOST: https://router.project-osrm.org
      IPINFO_API_KEY:
      GOOGLE_MAPS_API_KEY:  
      GOOGLE_MAPS_LOCALE: us
      TWILIO_SID:  
      TWILIO_TOKEN:
      TWILIO_FROM:
```

# 🧩 Extensiones

Las extensiones son componentes modulares que mejoran la funcionalidad de tu instancia. Te permiten agregar nuevas características, personalizar el comportamiento existente o integrar con sistemas externos.

Puedes desarrollar y publicar tus propias extensiones siguiendo la guía de desarrollo de extensiones.

## ⌨️ CLI

La CLI es una herramienta poderosa diseñada para simplificar la gestión de extensiones. Con la CLI, puedes manejar autenticación, instalar y desinstalar extensiones, y crear estructuras para nuevas extensiones si estás desarrollando las tuyas propias.

Comienza con la CLI usando npm:

```bash
npm i -g @fleetbase/cli
```

Una vez instalado, puedes acceder a una variedad de comandos para gestionar tus extensiones.

# 📱 Aplicaciones

El sistema ofrece algunas aplicaciones de código abierto que pueden ser clonadas y personalizadas. Cada aplicación está construida de manera que la instancia pueda ser cambiada ya sea en instalación local o alojada en la nube.

<ul>
  <li>Aplicación de Tienda: Aplicación de comercio electrónico/bajo demanda para lanzar tu propia tienda o mercado.</li>
  <li>Aplicación de Navegador: Aplicación para conductores que puede ser utilizada para gestionar y actualizar órdenes, además proporciona ubicación del conductor en tiempo real.</li>
</ul>

## 🛣️ Roadmap
1. **Gestión de Inventario y Almacén** ~ Extensión para WMS e Inventario.
2. **Contabilidad y Facturación** ~ Extensión para contabilidad y facturación.
3. **IA** ~ Integración de Agente IA para sistema y flujos de trabajo.
4. **Sistema de Reglas Dinámicas** ~ Desencadenar eventos, tareas y trabajos desde un constructor de reglas en recursos.

## 🪲 Bugs y 💡 Solicitudes de Características

Si encuentras un bug o tienes una solicitud de función, por favor revisa el rastreador de problemas y busca problemas existentes y cerrados. Si tu problema o idea no ha sido abordado aún, por favor abre un nuevo problema.

## 👨‍💻 Contribuir

Por favor lee nuestras guías de contribución. Se incluyen direcciones para abrir problemas, estándares de codificación y notas sobre desarrollo.

## 👥 Comunidad

Obtén actualizaciones sobre el desarrollo y chatea con los mantenedores del proyecto y miembros de la comunidad.

# Licencia y Copyright

Este sistema está disponible bajo los términos de la Licencia Pública General GNU Affero 3.0 (AGPL 3.0).