-- La tabla ya existe en la base de datos actual; IF NOT EXISTS la crea solo en instalaciones nuevas.
CREATE TABLE IF NOT EXISTS indemnizacion_ipc_insep (
  numero INT NOT NULL,
  identificador VARCHAR(20) NOT NULL,
  nombre VARCHAR(150) NULL,
  indemnizacion DECIMAL(20, 8) NOT NULL,
  PRIMARY KEY (identificador)
);
