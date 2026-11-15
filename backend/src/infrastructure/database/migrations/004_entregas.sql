-- Registro de entregas: una por beneficiario (por DNI). La clave única impide marcar dos veces,
-- incluso si dos personas pulsan "Entregado" al mismo tiempo.
CREATE TABLE IF NOT EXISTS entregas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identificador VARCHAR(20) NOT NULL,
  usuario_id BIGINT UNSIGNED NULL,
  entregado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_entregas_identificador (identificador),
  KEY idx_entregas_fecha (entregado_at),
  CONSTRAINT fk_entregas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);
