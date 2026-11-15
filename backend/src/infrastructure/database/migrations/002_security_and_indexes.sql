-- Bloqueo de cuenta persistente (sobrevive reinicios y funciona con varias instancias).
ALTER TABLE usuarios
  ADD COLUMN intentos_fallidos SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER activo,
  ADD COLUMN bloqueado_hasta DATETIME NULL AFTER intentos_fallidos;

-- Refresh tokens con rotación. Solo se guarda el hash SHA-256 del token.
-- Cada inicio de sesión abre una "familia"; si se reutiliza un token ya rotado
-- se revoca toda la familia (indicio de robo de token).
CREATE TABLE refresh_tokens (
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

-- Índices para filtros y orden de la bitácora (crece sin límite).
ALTER TABLE auditoria
  ADD KEY idx_auditoria_created (created_at),
  ADD KEY idx_auditoria_modulo (modulo),
  ADD KEY idx_auditoria_accion (accion);

ALTER TABLE usuarios
  ADD KEY idx_usuarios_activo (activo);
