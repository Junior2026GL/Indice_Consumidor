import { db } from '../../infrastructure/database/mysql.js';

export async function getBeneficiariosResumen() {
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

  const [[entregas]] = await db.query('SELECT COUNT(*) AS entregados FROM entregas');

  return { totales, grupos, entregados: entregas.entregados };
}
