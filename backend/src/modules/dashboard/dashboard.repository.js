import { db } from '../../infrastructure/database/mysql.js';

/** Cifras pesadas de beneficiarios (recorren toda la tabla): el servicio las guarda unos segundos. */
export async function getBeneficiariosTotales() {
  const [[totales]] = await db.query(
    `SELECT COUNT(*) AS total,
            COUNT(DISTINCT identificador) AS unicos,
            COALESCE(SUM(cuenta_occidente IS NOT NULL AND TRIM(cuenta_occidente) <> ''), 0) AS con_cuenta
     FROM beneficiarios`
  );

  const [grupos] = await db.query(
    `SELECT grupo, COUNT(*) AS total
     FROM beneficiarios
     GROUP BY grupo
     ORDER BY total DESC, grupo
     LIMIT 200`
  );

  return { totales, grupos };
}

/** Entregas registradas: consulta mínima, se pide en cada carga para que el panel esté siempre al día. */
export async function contarEntregas() {
  const [[row]] = await db.query('SELECT COUNT(*) AS entregados FROM entregas');
  return Number(row.entregados);
}
