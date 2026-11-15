-- La tabla ya existe en la base de datos actual; IF NOT EXISTS la crea solo en instalaciones nuevas.
CREATE TABLE IF NOT EXISTS beneficiarios (
  num INT NULL,
  grupo INT NULL,
  identificador VARCHAR(20) NULL,
  cuenta_occidente VARCHAR(30) NULL
);

-- Sin este índice cada consulta por DNI recorre toda la tabla.
ALTER TABLE beneficiarios ADD KEY idx_beneficiarios_identificador (identificador);
