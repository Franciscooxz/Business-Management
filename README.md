# Business Management

Sistema web de gestión comercial con **frontend en React + Vite** y **API en Laravel 12**.

Este proyecto permite administrar operaciones típicas de un negocio: productos, inventario, ventas, clientes, categorías, usuarios, proveedores, órdenes de compra, monedas y reportes.

## ¿De qué va el proyecto?

La solución está dividida en dos aplicaciones:

- `business-management-api`: API REST construida con Laravel (autenticación con tokens de Sanctum, roles y reglas de negocio).
- `business-management-frontend`: aplicación React que consume la API para ofrecer la interfaz de administración.

### Funcionalidades principales

- Autenticación y registro de usuarios.
- Control de acceso por rol (`admin` y `user`).
- Dashboard con métricas y gráficos.
- Gestión de productos, categorías y stock.
- Historial y movimientos de inventario.
- Punto de venta (POS) y gestión de ventas.
- Gestión de clientes.
- Gestión de proveedores y órdenes de compra.
- Módulo de monedas (tasas, conversión y moneda base).
- Exportaciones (por ejemplo, productos y movimientos de stock).

## Estructura del repositorio

```text
Business-Management/
├── business-management-api/        # Backend Laravel
└── business-management-frontend/   # Frontend React + Vite
```

## Requisitos previos

### Backend

- PHP 8.2+
- Composer 2+
- SQLite (recomendado para entorno local rápido) o MySQL/MariaDB

### Frontend

- Node.js 20+
- npm 10+

---

## Instalación paso a paso

## 1) Clonar y entrar al proyecto

```bash
git clone <URL_DEL_REPO>
cd Business-Management
```

## 2) Instalar y configurar el backend (Laravel)

```bash
cd business-management-api
composer install
cp .env.example .env
php artisan key:generate
```

### Base de datos (opción rápida con SQLite)

```bash
mkdir -p database
touch database/database.sqlite
```

En `.env` deja o ajusta:

```env
DB_CONNECTION=sqlite
```

Luego ejecuta migraciones:

```bash
php artisan migrate
```

### Seeders iniciales (roles, admin, categorías y monedas)

> Nota: el `DatabaseSeeder` actual referencia `ProductSeeder`, pero ese archivo no está presente. Por eso se recomienda ejecutar seeders individuales:

```bash
php artisan db:seed --class=RoleSeeder
php artisan db:seed --class=AdminUserSeeder
php artisan db:seed --class=CategorySeeder
php artisan db:seed --class=CurrencySeeder
```

Credenciales admin creadas por seeder:

- Email: `admin@example.com`
- Password: `admin123`

Levanta la API:

```bash
php artisan serve
```

Por defecto quedará en `http://127.0.0.1:8000`.

## 3) Instalar y configurar el frontend (React)

En otra terminal:

```bash
cd business-management-frontend
npm install
```

Crea el archivo `.env` (si no existe) con:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Inicia el frontend:

```bash
npm run dev
```

Generalmente quedará en `http://127.0.0.1:5173`.

---

## ¿Cómo usarlo?

1. Abre el frontend en el navegador (`http://127.0.0.1:5173`).
2. Inicia sesión con el usuario admin (`admin@example.com` / `admin123`) o registra un nuevo usuario.
3. Empieza cargando:
   - categorías,
   - productos,
   - clientes,
   - y proveedores.
4. Usa **POS** para crear ventas.
5. Consulta **Dashboard** y **Reportes** para ver métricas y resultados.

## Rutas API destacadas

Todas bajo `/api`:

- Públicas:
  - `POST /register`
  - `POST /login`
- Protegidas:
  - `GET /dashboard`
  - CRUD de `products`, `categories`, `customers`, `sales`, `suppliers`, `purchase-orders`, `currencies`, `users` (según permisos)
  - utilidades: exportaciones, movimientos de stock, estadísticas, etc.

## Scripts útiles

### Backend (`business-management-api`)

```bash
php artisan serve        # Servidor local API
php artisan migrate      # Ejecutar migraciones
php artisan test         # Ejecutar tests
```

### Frontend (`business-management-frontend`)

```bash
npm run dev              # Desarrollo
npm run build            # Build producción
npm run preview          # Previsualizar build
npm run lint             # Linter
```

## Solución de problemas rápida

- **No conecta frontend con backend**
  - Verifica `VITE_API_URL` en `business-management-frontend/.env`.
  - Verifica que `php artisan serve` esté activo en puerto 8000.

- **Error al hacer seed general**
  - Si falla `php artisan db:seed`, usa seeders individuales (ver sección de instalación).

- **401 / sesión expirada**
  - Vuelve a iniciar sesión; el frontend limpia token automáticamente cuando expira.

---

## Stack tecnológico

- **Frontend:** React 19, Vite, Zustand, React Router, Tailwind CSS, Recharts.
- **Backend:** Laravel 12, Sanctum, Eloquent ORM, Laravel Excel.
- **Base de datos:** SQLite (default local), compatible con motores SQL configurables por `.env`.

## Licencia

Este repositorio no define una licencia propia a nivel raíz. Revisa políticas internas de tu equipo antes de distribuirlo públicamente.
