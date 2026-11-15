# IPC INSEP

API (Node.js + Express + MySQL) y aplicación web (React + Vite) con autenticación, gestión de usuarios y bitácora de auditoría.

```
backend/    API REST
  src/modules/<dominio>/   routes → controller → service → repository (+ schemas de validación)
  src/shared/              middleware, errores, validación y utilidades comunes
  src/infrastructure/      base de datos (pool, migraciones, seeds)
  scripts/                 db.js (migrate/seed/status), create-admin.js
  tests/                   Vitest + Supertest
frontend/   SPA
  src/features/<dominio>/  pages, components, hooks, services
  src/components|layouts|services|hooks|utils   piezas compartidas
```

## Puesta en marcha (desarrollo)

Requisitos: Node 20+ y MySQL 8 (o MariaDB reciente).

```bash
npm run install:all                       # instala backend y frontend

cp backend/.env.example backend/.env      # edita DB_PASSWORD, etc.
cp frontend/.env.example frontend/.env

npm run db:migrate                        # crea la BD y aplica las migraciones
npm run db:seed                           # roles base
ADMIN_PASSWORD='UnaClaveSegura123' npm --prefix backend run create-admin -- superadmin "Super Administrador"

npm run dev:backend                       # http://localhost:4000
npm run dev:frontend                      # http://localhost:5173
```

La contraseña inicial **no** está en el repositorio: se pasa por la variable `ADMIN_PASSWORD` al crear el Super Admin.

> **Si ya tenías la base de datos creada con la versión anterior:** `npm run db:migrate` es seguro (la migración inicial es idempotente) y añade lo nuevo. El usuario `superadmin` que traía el seed anterior tiene una contraseña conocida (`Admin2026*`): cámbiala desde la app o vuelve a ejecutar `create-admin`.

### Comandos útiles

| Comando | Qué hace |
| --- | --- |
| `npm test` | Tests de backend y frontend |
| `npm run lint` | ESLint en ambos proyectos |
| `npm run format` | Prettier |
| `npm run build` | Compila el frontend |
| `npm --prefix backend run db:status` | Migraciones aplicadas / pendientes |
| `npm --prefix backend run audit:deps` | `npm audit` de dependencias de producción |

## Seguridad

- **Sesiones**: token de acceso JWT de 15 min (HS256, con `iss`/`aud`) que el frontend guarda **solo en memoria**, y un *refresh token* en cookie `HttpOnly` + `SameSite` limitada a `/api/auth`. Se guarda hasheado (SHA-256) en la BD.
- **Rotación y detección de robo**: cada refresh token sirve una vez; si se reutiliza uno ya rotado se revoca toda la familia de sesiones.
- **Revocación inmediata**: en cada petición se consulta el usuario en la BD, así que desactivar una cuenta o cambiar su rol surte efecto al instante. Restablecer o cambiar contraseña cierra las sesiones.
- **Fuerza bruta**: bloqueo de cuenta persistente (5 intentos → 15 min, configurable) + `express-rate-limit` por IP en login, refresh y operaciones sensibles. Tiempo de respuesta igualado para usuarios inexistentes (sin enumeración).
- **Contraseñas**: bcrypt (costo 12), 10–72 caracteres con mayúscula, minúscula y número.
- **Validación**: todo `body`, `params` y `query` pasa por esquemas Zod; los campos desconocidos se descartan (sin *mass assignment*). Consultas SQL siempre parametrizadas; `LIKE` con comodines escapados.
- **Protección de privilegios**: no se puede desactivar ni cambiar el rol propio, ni dejar el sistema sin Super Admin activo.
- **HTTP**: Helmet con CSP restrictiva, HSTS en producción, CORS por lista blanca, `Cache-Control: no-store`, límite de cuerpo 100 KB, defensa CSRF (cookie `SameSite` + cabecera `X-Requested-With` obligatoria en refresh/logout).
- **Errores y logs**: los errores 5xx nunca exponen detalles; logs JSON con `pino` y `X-Request-Id`; se redactan contraseñas, tokens y cookies.
- **Secretos**: `JWT_SECRET` obligatorio (≥ 32 caracteres) en producción; el arranque falla con valores débiles o de ejemplo.

## Despliegue

1. Define las variables de `backend/.env.example` (mínimo `NODE_ENV=production`, `JWT_SECRET`, credenciales de BD, `FRONTEND_URL`).
2. **HTTPS es obligatorio** en producción (la cookie de sesión se marca `Secure`).
3. **`TRUST_PROXY`**: ponlo en el número de proxies que hay delante de la API (p. ej. `1` con nginx). Con `0` la IP de auditoría es la de la conexión; con un valor incorrecto un cliente podría falsificar su IP.
4. Si el frontend y la API están en **dominios distintos**, usa `COOKIE_SAMESITE=none` (requiere HTTPS) y revisa que `FRONTEND_URL` sea exacto.
5. Ejecuta `npm run db:migrate` en cada despliegue (antes de arrancar las réplicas).
6. Endpoints de salud: `GET /api/health` (vivo) y `GET /api/health/ready` (vivo + BD).

Hay un `docker-compose.yml` (MySQL + API + frontend con nginx y cabeceras de seguridad). No se ha podido ejecutar en el entorno donde se escribió; valídalo con `docker compose config` y haz una primera prueba en local antes de usarlo.

### Escalar a varias instancias

- El estado de sesión, el bloqueo de cuentas y los refresh tokens ya viven en la BD, así que la API es *stateless* y se puede replicar detrás de un balanceador.
- Pendiente para multi-réplica: el *rate limit por IP* usa memoria local; cámbialo por un store compartido (p. ej. `rate-limit-redis`).
- La bitácora (`auditoria`) crece sin límite: planifica archivado o particionado por fecha.

## Pendientes conocidos

- `npm audit` reporta avisos moderados/altos sin corrección compatible: `zod` (requiere saltar a v4) y `react-router` (requiere v7). Evalúa esas migraciones cuando puedas.
- Los tests del backend simulan la BD; faltan pruebas de integración contra MySQL real y tests de componentes del frontend.
