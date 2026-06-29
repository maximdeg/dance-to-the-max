 # Dance To the Max
 ## Plataforma de streaming de videos de baile de ballroom 

 - Carpetas con diferentes niveles
 - Los usuarios tienen que tener su usuario y contraseña
 - Se limita la cantidad de dispositivos conectados por cada usuario a 3
 - Los usuarios pueden dejar comentarios en los videos 
 - Los administradores pueden responder a los comentarios
 - Los usuarios premium pueden mandar videos a los administradores
 - Los usuarios pueden cambiar su contraseña desde su perfil
 - Los administradores tienen una plataforma donde comentan de forma privada a los usuarios y dejan notas en el video que enviaron al administrador
 - Debe haber una plataforma para usuarios(bailarines) y otra para administradores(profesores)
 - Solo el super admin puede subir los videos para el streaming publico
 - Cada video de streaming publico tiene registrada la cantidad de vistas
 - Cada video de streaming publico tiene registrado la cantidad de "me gusta"
 - Cada video tiene categorias ("Primeras veces", Principiante, Intermedio, Avanzado, Max)
 - Va a haber 4 tipos de paquetes y ademas videos especiales que se venden en su totalidad como workshop
 - Puede ver como un foro donde los usuarios pueden subir y ver videos que publican (idea aparte)

### Funcionalidades Principales Identificadas

| Módulo | Descripción | Complejidad |
|--------|-------------|-------------|
| **Autenticación** | Usuario y contraseña, cambio desde perfil | Media |
| **Control de dispositivos** | Límite de 3 dispositivos por usuario | Alta |
| **Contenido** | Carpetas por niveles, categorías (Primeras veces, Principiante, Intermedio, Avanzado, Max) | Media |
| **Interacción** | Comentarios públicos, respuestas de admins, likes, vistas | Media |
| **Premium** | Envío de videos a admins, panel privado de notas y comentarios | Alta |
| **Administración** | Roles (super admin, admin), subida de videos solo por super admin | Media |
| **Monetización** | 4 tipos de paquetes | Media |

---

### Experiencia del usuario

- **Listas de reproducción personalizadas** (playlists)
- **Continuar viendo** (último minuto visto, reanudar desde ahí)
- **Favoritos / Watchlist**
- **Búsqueda por categoría, nivel y palabras clave**
- **Calidad adaptativa** (automática según conexión)
- **Modo offline** (descarga temporal en app móvil, si aplica)
- **Contador de progreso** (ej. “Video 3 de 12 en Principiante”)

### Engagement y comunidad

- **Sistema de logros / badges** (ej. “Completaste 10 videos de Intermedio”)
- **Calendario de clases o eventos** (si hay contenido en vivo)
- **Notificaciones** (nuevos videos en categorías que sigue, respuestas a comentarios)
- **Compartir en redes sociales** (links con preview)

### Monetización y negocio

- **Período de prueba gratuita** (ej. 7 o 14 días)
- **Códigos promocionales / descuentos**
- **Facturación mensual y anual** (con descuento anual)
- **Portal de facturas** para el usuario

### Panel de administración

- **Estadísticas básicas**: vistas, likes, comentarios por video
- **Informes de uso**: usuarios activos, dispositivos, horas vistas
- **Cola de transcodificación** con estado (pendiente, procesando, listo)
- **Moderación de comentarios** (aprobar, rechazar, ocultar)
- **Gestión de usuarios** (bloquear, cambiar plan, ver dispositivos activos)

### Seguridad y cumplimiento

- **Sesiones activas** visibles en el perfil
- **Cierre de sesión remota** en todos los dispositivos
- **Autenticación en dos pasos (2FA)** opcional para admins
- **Logs de actividad** para auditoría

---