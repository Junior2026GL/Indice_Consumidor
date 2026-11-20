-- Verificación en dos pasos (TOTP). El secreto se guarda CIFRADO (AES-256-GCM), nunca en claro.
-- totp_enabled = 0 con secreto presente significa "configuración iniciada, aún sin confirmar".
-- totp_last_step guarda el último intervalo de 30 s aceptado: impide reutilizar un mismo código.
ALTER TABLE usuarios
  ADD COLUMN totp_secret VARCHAR(255) NULL,
  ADD COLUMN totp_enabled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN totp_last_step BIGINT UNSIGNED NULL;

-- Códigos de respaldo de un solo uso (solo se guarda su hash SHA-256).
CREATE TABLE IF NOT EXISTS usuario_backup_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  code_hash CHAR(64) NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_backup_usuario (usuario_id),
  CONSTRAINT fk_backup_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
