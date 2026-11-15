-- Datos base. Es idempotente. El primer Super Admin se crea con:
--   npm run create-admin
-- (no se versiona ninguna contraseña por defecto en el repositorio).
INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES
(1, 'SUPER_ADMIN', 'Control total: usuarios, roles y configuración del sistema'),
(2, 'ADMIN', 'Administrador del sistema'),
(3, 'NORMAL', 'Usuario con acceso limitado');
