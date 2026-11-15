-- Tablas de usuarios, roles, auditoría y sesiones. Ejecutar completo en MySQL Workbench.
-- Es seguro correrlo más de una vez (CREATE TABLE IF NOT EXISTS / INSERT IGNORE).
-- No toca la tabla `beneficiarios`.

USE indemnizacion_ipc;

-- 1) Roles
CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) Usuarios (incluye el bloqueo de cuenta por intentos fallidos)
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rol_id BIGINT UNSIGNED NULL,
  nombre VARCHAR(150) NOT NULL,
  usuario VARCHAR(60) NOT NULL UNIQUE,
  email VARCHAR(180) NULL,
  telefono VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  intentos_fallidos SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  ultimo_acceso_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_usuarios_activo (activo),
  CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- 3) Bitácora de auditoría
CREATE TABLE IF NOT EXISTS auditoria (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NULL,
  accion VARCHAR(100) NOT NULL,
  modulo VARCHAR(100) NOT NULL,
  descripcion TEXT NULL,
  ip VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_auditoria_created (created_at),
  KEY idx_auditoria_modulo (modulo),
  KEY idx_auditoria_accion (accion),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 4) Sesiones renovables (solo se guarda el hash del token)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  family_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_token_hash (token_hash),
  KEY idx_refresh_usuario (usuario_id),
  KEY idx_refresh_family (family_id),
  KEY idx_refresh_expires (expires_at),
  CONSTRAINT fk_refresh_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 5) Roles base
INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES
(1, 'SUPER_ADMIN', 'Control total: usuarios, roles y configuración del sistema'),
(2, 'ADMIN', 'Administrador del sistema'),
(3, 'NORMAL', 'Usuario con acceso limitado');

-- 6) Registra estas migraciones como aplicadas, para que `npm run db:migrate`
--    no intente crearlas otra vez.
CREATE TABLE IF NOT EXISTS schema_migrations (
  name VARCHAR(190) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT IGNORE INTO schema_migrations (name) VALUES
('001_initial.sql'),
('002_security_and_indexes.sql');

-- Verificación: deben aparecer roles, usuarios, auditoria, refresh_tokens y schema_migrations.
SHOW TABLES;
