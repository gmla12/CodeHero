# 🦸 CodeHero: Aprende Lógica de Programación

Una aplicación gamificada para aprender los fundamentos de la programación (bucles, condicionales, funciones) a través de una aventura espacial.

## 🚀 Tecnologías

*   **Frontend**: HTML5, CSS3, Vanilla JavaScript (MVC Pattern).
*   **Backend**: Supabase (Auth, Database, RLS, Storage).
*   **Herramientas**: Vite (Build Tool), pnpm (Package Manager).

## 🛠️ Instalación y Configuración

Sigue estos pasos para configurar el proyecto desde cero.

### 1. Clonar y Dependencias
```bash
git clone <repo-url>
cd CodeHero
pnpm install
```

### 2. Configurar Supabase Backend
1.  Crea un nuevo proyecto en [Supabase](https://supabase.com).
2.  Ve al **SQL Editor** en tu dashboard de Supabase.
3.  Abre el archivo `supabase/schema.sql` (ubicado en la carpeta `supabase` del proyecto).
4.  **Copia y pega todo el contenido** en el Editor SQL y ejecútalo.
    *   Este "Master Script" (v2.0) creará todas las tablas (`level_types`, `profiles`, `levels`, etc.).
    *   Configurará las políticas RLS de seguridad estricta.
    *   Creará las funciones RPC para Bots, Leaderboard y Administración.

### 3. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto (basado en `.env.example`):

```bash
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

### 4. Crear el Primer Administrador
Como la aplicación protege las funciones de admin, necesitas crear tu primer usuario manualmente y elevarlo a rango 'admin':

1.  Regístrate en la App (o crea un usuario desde el Auth de Supabase).
2.  Ve a la tabla `public.profiles` en Supabase.
3.  Edita tu usuario y cambia la columna `role` de `user` a `admin`.
4.  ¡Listo! Ahora puedes acceder a `/admin.html`.

### 5. Ejecutar Proyecto
```bash
pnpm run dev
```

---

## 📂 Administrador (Admin Panel)
Accede a `/admin.html` para gestionar:
*   **Usuarios**: Crear, Editar, Eliminar (con Auth integrado).
*   **Mundos y Fases**: Organizar el contenido educativo.
*   **Tipos de Nivel**: Gestionar categorías dinámicas (Tutorial, Boss, Bucles) con colores e iconos.
*   **Bots & Leaderboard**: Gestionar bots simulados para la tabla de clasificación.
*   **Niveles**: Editor visual de mapas (Drag & Drop).

## ⚠️ Resolución de Problemas Comunes

### Usuario "Fantasma" (No aparece en lista)
Si tu usuario existe en Authentication pero no en la tabla `profiles` (por error en triggers antiguos):
1. Ejecuta el script de reparación disponible en `.gemini/antigravity/brain/.../repair_profiles.sql` (o crea un profile manualmente con el mismo ID).

### Error 404 / 500 en Listas
Asegúrate de haber ejecutado el `schema.sql` completo. Las políticas RLS antiguas pueden bloquear el acceso. El nuevo esquema incluye políticas `is_admin()` robustas.
